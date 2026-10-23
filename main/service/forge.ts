import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "mirinjs";
import { download } from "~/lib/download.ts";
import { getForgeInstallerUrl, listForgeVersions } from "~/service/loader.ts";
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

// Forge 的 version.json 直接打在 installer jar 里，预下载时要连它一起覆盖
interface ForgeVersionJson {
  mainClass: string;
  libraries?: {
    name: string;
    downloads?: {
      artifact?: {
        url: string;
        path: string;
        sha1?: string;
      };
    };
  }[];
}

export async function installForge({
  options,
  meta,
  root,
  reportProgress,
}: {
  options: {
    name: string;
    url: string;
    library: string;
    loader: { type: "forge"; version: string };
  };
  meta: { id: string };
  root: string;
  reportProgress: ProgressReporter;
}): Promise<void> {
  const log = logger.child("install").child("forge").child(options.name);
  const libraries = path.join(root, "libraries");
  const instance = path.join(root, "instances", options.name);

  // 1. 解析 Forge 版本
  const versions = await listForgeVersions(meta.id);
  if (versions.length === 0) throw new Error(`no Forge available for ${meta.id}`);
  let version = options.loader.version;
  if (!version) {
    for (const v of versions) {
      version = v;
      break;
    }
  }
  log.info(`resolved Forge version: ${version}`);

  // 2. 下载 installer jar
  reportProgress({ detail: "正在下载 Forge 安装器", progress: 0 });
  const installerJar = path.join(root, "tmp", `forge-${version}-installer.jar`);
  await fs.mkdir(path.dirname(installerJar), { recursive: true });
  if (!(await Bun.file(installerJar).exists())) {
    await download(getForgeInstallerUrl(version), installerJar, { logger: log });
  }

  // 3. 解出 install_profile.json 与内置 version.json
  const tmpRoot = path.join(root, "tmp", `forge-${version}`);
  const profile = await readInstallerEntry<InstallProfile>(
    installerJar,
    "install_profile.json",
    log,
  );
  const bundled = await readInstallerEntry<ForgeVersionJson>(installerJar, "version.json", log);

  // 4. 预下载：install_profile + 内置 version.json（离线 installer 会校验两者）
  reportProgress({ detail: "正在预下载 Forge 库", progress: 0 });
  const artifacts = [
    ...profile.libraries.map((lib) => lib.downloads?.artifact),
    ...(bundled.libraries ?? []).map((lib) => lib.downloads?.artifact),
  ].filter((artifact): artifact is NonNullable<typeof artifact> =>
    Boolean(artifact?.url && artifact.path),
  );

  await predownloadLibraries({
    artifacts,
    libraries,
    log,
    reportProgress,
    detail: "正在预下载 Forge 库",
  });

  // 5. 建临时目录并跑离线 installer
  reportProgress({ detail: "正在运行 Forge 安装器", progress: 100 });
  await prepareInstallRoot({ root, tmpRoot, mcVersion: meta.id, libraries });
  // Forge installer 的 client 参数是驼峰 --installClient，与 NeoForge 的短横线不同
  await runOfflineInstaller({
    installerJar,
    root: tmpRoot,
    log,
    installClientFlag: "--installClient",
  });

  // 6. 读 installer 产出的 version.json（含 forge:client 等处理器产物）
  reportProgress({ detail: "正在抽取 Forge 产物", progress: 100 });
  const output = await readVersionJson(tmpRoot, meta.id);

  // 7. 写实例 manifest
  const vanillaManifest = JSON.parse(
    await Bun.file(path.join(root, "cores", meta.id, `${meta.id}.json`)).text(),
  );

  const mergedManifest = {
    ...vanillaManifest,
    id: options.name,
    inheritsFrom: meta.id,
    mainClass: output.mainClass,
    // Forge 的 version.json 自带 forge:universal 与 forge:client，都必须进 classpath
    libraries: mergeLibraries(vanillaManifest.libraries, output.libraries),
    arguments: mergeArguments(vanillaManifest, output),
  };

  await Bun.write(
    path.join(instance, `${options.name}.json`),
    JSON.stringify(mergedManifest, null, 2),
  );

  // 8. 清理 tmp（symlink 由 install.ts 统一负责）
  await fs.rm(tmpRoot, { recursive: true, force: true });
  await fs.rm(installerJar, { force: true }).catch(() => {});

  log.info("forge install done");
}
