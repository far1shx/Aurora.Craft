import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "mirinjs";
import { download } from "~/lib/download.ts";
import { getNeoforgeInstallerUrl, listNeoforgeVersions } from "~/service/loader.ts";
import {
  type InstallProfile,
  type ProgressReporter,
  mergeArguments,
  mergeLibraries,
  predownloadLibraries,
  prepareInstallRoot,
  readInstallerEntry,
  readVersionJson,
  runOfflineInstaller,
} from "~/service/mavenloader.ts";

// 在共享 libraries 里找 NeoForge patched jar
async function findPatchedJar(librariesDir: string): Promise<string | null> {
  const patchedDir = path.join(librariesDir, "net", "neoforged", "minecraft-client-patched");
  try {
    const entries = await fs.readdir(patchedDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const files = await fs.readdir(path.join(patchedDir, entry.name));
      const jar = files.find((file) => file.endsWith(".jar"));
      if (jar) return path.join(patchedDir, entry.name, jar);
    }
  } catch {
    return null;
  }
  return null;
}

export async function installNeoforge({
  options,
  meta,
  root,
  reportProgress,
}: {
  options: {
    name: string;
    url: string;
    library: string;
    loader: { type: "neoforge"; version: string };
  };
  meta: { id: string };
  root: string;
  reportProgress: ProgressReporter;
}): Promise<void> {
  const log = logger.child("install").child("neoforge").child(options.name);
  const libraries = path.join(root, "libraries");
  const instance = path.join(root, "instances", options.name);

  // 1. 解析 NeoForge 版本
  const versions = await listNeoforgeVersions(meta.id);
  if (versions.length === 0) throw new Error(`no NeoForge available for ${meta.id}`);
  let version = options.loader.version;
  if (!version) {
    for (const v of versions) {
      version = v;
      break;
    }
  }
  log.info(`resolved NeoForge version: ${version}`);

  // 2. 下载 installer jar
  reportProgress({ detail: "正在下载 NeoForge 安装器", progress: 0 });
  const installerUrl = getNeoforgeInstallerUrl(version);
  const installerJar = path.join(root, "tmp", `neoforge-${version}-installer.jar`);
  await fs.mkdir(path.dirname(installerJar), { recursive: true });
  if (!(await Bun.file(installerJar).exists())) {
    await download(installerUrl, installerJar, { logger: log });
  }

  // 3. 解出 install_profile.json
  const tmpRoot = path.join(root, "tmp", `neoforge-${version}`);
  const profile = await readInstallerEntry<InstallProfile>(
    installerJar,
    "install_profile.json",
    log,
  );

  // 4. 预下载所有库到共享 libraries
  reportProgress({ detail: "正在预下载 NeoForge 库", progress: 0 });
  const artifacts = profile.libraries
    .map((lib) => lib.downloads?.artifact)
    .filter((artifact): artifact is NonNullable<typeof artifact> => Boolean(artifact?.url));

  await predownloadLibraries({
    artifacts,
    libraries,
    log,
    reportProgress,
    detail: "正在预下载 NeoForge 库",
  });

  // 5. 建临时目录（标准 .minecraft 结构），libraries 用 junction 指向共享 libraries
  reportProgress({ detail: "正在运行 NeoForge 安装器", progress: 100 });
  await prepareInstallRoot({ root, tmpRoot, mcVersion: meta.id, libraries });

  // 6. 运行离线 installer
  await runOfflineInstaller({ installerJar, root: tmpRoot, log });

  // 7. 读最终 version.json（installer 已通过 junction 把产物写进共享 libraries）
  reportProgress({ detail: "正在抽取 NeoForge 产物", progress: 100 });
  const output = await readVersionJson(tmpRoot, meta.id);

  // 8. 找 patched jar（确认产物存在；不进 classpath，由 FML 经 libraryDirectory 定位）
  const patchedJar = await findPatchedJar(libraries);
  if (!patchedJar) throw new Error("no minecraft-client-patched jar produced");

  // 9. 写实例 manifest（合并 NeoForge 的 libraries 进完整 vanilla manifest）
  const instanceJsonPath = path.join(instance, `${options.name}.json`);
  const vanillaManifest = JSON.parse(
    await Bun.file(path.join(root, "cores", meta.id, `${meta.id}.json`)).text(),
  );

  // install_profile 的 libraries 只保留 :universal（运行时由 FML 经 libraryDirectory 加载，不进 classpath）；
  // 其余多为 installer processor 工具链（如 binarypatcher / 旧版 ASM），进运行时 manifest 会引发版本冲突
  const profileRuntimeLibs = profile.libraries.filter((lib) => lib.name.endsWith(":universal"));

  const mergedManifest = {
    ...vanillaManifest,
    id: options.name,
    inheritsFrom: meta.id,
    mainClass: output.mainClass,
    // 合并三方库：vanilla + installer version.json + install_profile 的 universal
    libraries: mergeLibraries(vanillaManifest.libraries, output.libraries, profileRuntimeLibs),
    arguments: mergeArguments(vanillaManifest, output),
  };

  await Bun.write(instanceJsonPath, JSON.stringify(mergedManifest, null, 2));

  // 10. 清理 tmp（symlink 由 install.ts 统一负责）
  await fs.rm(tmpRoot, { recursive: true, force: true });
  await fs.rm(installerJar, { force: true }).catch(() => {});

  log.info("neoforge install done");
}
