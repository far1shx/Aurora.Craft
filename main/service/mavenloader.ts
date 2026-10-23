import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { logger } from "mirinjs";
import { download, runWithConcurrency } from "~/lib/download.ts";

// Forge 与 NeoForge 共用 installer 骨架：install_profile.json + processors + 离线安装

export type ProgressReporter = (update: {
  detail: string;
  progress: number;
  expand?: string;
}) => void;

export interface MavenArtifact {
  url: string;
  path: string;
  sha1?: string;
}

export interface ProfileLibrary {
  name: string;
  downloads?: {
    artifact?: MavenArtifact;
  };
}

export interface InstallProfile {
  libraries: ProfileLibrary[];
}

export interface LoaderVersionJson {
  mainClass: string;
  libraries: unknown[];
  arguments?: unknown;
}

// 建临时目录做离线安装。NeoForge 用 --install-client，Forge 用 --installClient（驼峰）
export async function runOfflineInstaller({
  installerJar,
  root,
  log,
  installClientFlag = "--install-client",
}: {
  installerJar: string;
  root: string;
  log: ReturnType<typeof logger.child>;
  installClientFlag?: string;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("java", ["-jar", installerJar, installClientFlag, root, "--offline"], {
      cwd: root,
      detached: false,
    });

    child.stdout?.on("data", (data: Buffer) => log.info(data.toString("utf8").trimEnd()));
    child.stderr?.on("data", (data: Buffer) => log.error(data.toString("utf8").trimEnd()));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`installer exited with code ${code}`));
    });
  });
}

// 从 installer jar 里解出安装清单
export async function readInstallerEntry<T>(
  installerJar: string,
  entry: string,
  log: ReturnType<typeof logger.child>,
): Promise<T> {
  const bytes = await Bun.file(installerJar).bytes();
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(bytes));
  const entryBytes = files[entry];
  if (!entryBytes) {
    log.error(`installer jar missing ${entry}`);
    throw new Error(`no ${entry} in installer jar`);
  }
  return JSON.parse(new TextDecoder().decode(entryBytes)) as T;
}

// 预下载一组库到共享 libraries，按 sha1 命中缓存
export async function predownloadLibraries({
  artifacts,
  libraries,
  log,
  reportProgress,
  detail,
}: {
  artifacts: MavenArtifact[];
  libraries: string;
  log: ReturnType<typeof logger.child>;
  reportProgress: ProgressReporter;
  detail: string;
}): Promise<void> {
  // 同路径只下载一次（install_profile 与 version.json 会重叠）
  const unique = new Map<string, MavenArtifact>();
  for (const artifact of artifacts) {
    if (artifact.url && artifact.path && !unique.has(artifact.path)) {
      unique.set(artifact.path, artifact);
    }
  }

  const list = [...unique.values()];
  let completed = 0;
  const total = list.length;

  await runWithConcurrency(list, 8, async (artifact) => {
    const dest = path.join(libraries, artifact.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });

    if (await Bun.file(dest).exists()) {
      // 无 sha1 时无法校验，直接视为命中
      if (!artifact.sha1) {
        completed++;
        return;
      }
      const hash = Bun.CryptoHasher.hash("sha1", await Bun.file(dest).arrayBuffer(), "hex");
      if (hash === artifact.sha1) {
        completed++;
        reportProgress({
          detail,
          expand: `${completed}/${total}`,
          progress: total > 0 ? (completed / total) * 100 : 100,
        });
        return;
      }
      await fs.rm(dest, { force: true });
    }

    await download(artifact.url, dest, { logger: log });
    completed++;
    reportProgress({
      detail,
      expand: `${completed}/${total}`,
      progress: total > 0 ? (completed / total) * 100 : 100,
    });
    log.info(`pre-download ${completed}/${total} ${artifact.path}`);
  });
}

// 准备临时安装目录：versions 放原版 jar/json，libraries 用 junction 指向共享目录
export async function prepareInstallRoot({
  root,
  tmpRoot,
  mcVersion,
  libraries,
}: {
  root: string;
  tmpRoot: string;
  mcVersion: string;
  libraries: string;
}): Promise<void> {
  await fs.mkdir(path.join(tmpRoot, "versions", mcVersion), { recursive: true });
  await fs.rm(path.join(tmpRoot, "libraries"), { force: true, recursive: true }).catch(() => {});
  await fs.symlink(libraries, path.join(tmpRoot, "libraries"), "junction");
  await Bun.write(path.join(tmpRoot, "launcher_profiles.json"), "{}");

  await fs.copyFile(
    path.join(root, "cores", mcVersion, `${mcVersion}.jar`),
    path.join(tmpRoot, "versions", mcVersion, `${mcVersion}.jar`),
  );
  await fs.copyFile(
    path.join(root, "cores", mcVersion, `${mcVersion}.json`),
    path.join(tmpRoot, "versions", mcVersion, `${mcVersion}.json`),
  );
}

// 读 installer 产出的最终 version.json，跳过复制进去的原版目录
export async function readVersionJson(
  tmpRoot: string,
  mcVersion: string,
): Promise<LoaderVersionJson> {
  const versionsDir = path.join(tmpRoot, "versions");
  const versionDirs = await fs.readdir(versionsDir);
  for (const dir of versionDirs) {
    // 原版目录名就是 mcVersion 本身；加载器目录形如 neoforge-<ver> 或 <mc>-forge-<build>
    if (dir === mcVersion) continue;
    const jsonPath = path.join(versionsDir, dir, `${dir}.json`);
    try {
      return JSON.parse(await Bun.file(jsonPath).text()) as LoaderVersionJson;
    } catch {}
  }
  throw new Error("no version.json produced by installer");
}

// 合并库列表并按 name 去重（加载器可能重复声明 vanilla 库）
export function mergeLibraries(...lists: (unknown[] | undefined)[]): unknown[] {
  const map = new Map<string, unknown>();
  for (const list of lists) {
    for (const lib of list ?? []) {
      const named = lib as { name?: string };
      const key = named.name ?? JSON.stringify(lib);
      if (!map.has(key)) map.set(key, lib);
    }
  }
  return [...map.values()];
}

// 合并 vanilla manifest 与加载器 version.json 的 arguments
export function mergeArguments(
  vanillaManifest: unknown,
  loaderJson: LoaderVersionJson,
): { game: unknown[]; jvm: unknown[] } {
  const vanillaArgs = ((vanillaManifest as { arguments?: unknown }).arguments ?? {}) as {
    game?: unknown[];
    jvm?: unknown[];
  };
  const loaderArgs = (loaderJson.arguments ?? {}) as { game?: unknown[]; jvm?: unknown[] };
  return {
    game: [...(vanillaArgs.game ?? []), ...(loaderArgs.game ?? [])],
    jvm: [...(vanillaArgs.jvm ?? []), ...(loaderArgs.jvm ?? [])],
  };
}
