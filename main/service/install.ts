import * as fs from "node:fs/promises";
import * as path from "node:path";
import { app, logger } from "mirinjs";
import { stringify } from "smol-toml";
import type { InstallController } from "~/controllers/install.ts";
import { RESOURCES } from "~/lib/config.ts";
import { download, runWithConcurrency } from "~/lib/download.ts";
import type { MutationInput } from "~/lib/utils.ts";
import { http, platform } from "~/lib/utils.ts";
import { installForge } from "~/service/forge.ts";
import { librariesRule } from "~/service/library.ts";
import { applyLoader, isMetaLoader } from "~/service/loader.ts";
import { ensureNatives } from "~/service/natives.ts";
import { installNeoforge } from "~/service/neoforge.ts";
import type { InstanceConfig } from "~/types/instance.ts";
import type { DownloadArtifact, MinecraftAssetIndex, MinecraftVersion } from "~/types/minecraft.ts";

export async function installMinecraft({
  options,
}: {
  options: MutationInput<InstallController["routes"]["installMinecraft"]>;
}): Promise<boolean> {
  const log = logger.child("install").child("minecraft").child(options.name);

  const REPORT_INTERVAL = 100;

  let lastReportAt = 0;
  let pending: {
    status: "running" | "done" | "error";
    detail: string;
    progress: number;
    expand?: string;
  } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (!pending || !options.taskId) return;

    app.rpc["event.task"]?.broadcast({
      id: options.taskId,
      status: pending.status,
      progress: Math.min(100, Math.max(0, Math.round(pending.progress))),
      detail: pending.detail,
      expand: pending.expand,
    });

    pending = null;
    lastReportAt = performance.now();
  };

  // 合并高频进度：最多每 REPORT_INTERVAL 广播一次，结束态立即发送
  const reportProgress = (
    _options: {
      detail: string;
      progress: number;
      expand?: string;
    },
    status: "running" | "done" | "error" = "running",
  ): void => {
    if (!options.taskId) return;

    pending = { status, ..._options };

    if (status !== "running") {
      flush();
      return;
    }

    const elapsed = performance.now() - lastReportAt;

    if (elapsed >= REPORT_INTERVAL) {
      flush();
      return;
    }

    timer ??= setTimeout(() => {
      timer = undefined;
      flush();
    }, REPORT_INTERVAL - elapsed);
  };

  try {
    const root = options.library;
    reportProgress(
      {
        detail: "正在获取游戏元数据",
        progress: 0,
      },
      "running",
    );
    const meta = await http(options.url).json<MinecraftVersion>();

    const instance = path.join(root, "instances", options.name);

    // 创建所需库目录
    await Promise.all([
      fs.mkdir(path.join(root, "assets"), { recursive: true }),
      fs.mkdir(path.join(root, "libraries"), { recursive: true }),
      fs.mkdir(path.join(root, "cores", meta.id), { recursive: true }),
      fs.mkdir(path.join(instance), { recursive: true }),
    ]);

    // 清空同名实例残留（UI 层已用 instance.check 拦截真正的重复，这里兜底自愈失败重装）
    await fs.rm(instance, { recursive: true, force: true });
    await fs.mkdir(instance, { recursive: true });

    // 保存游戏元数据
    const manifest = path.join(root, "cores", meta.id, `${meta.id}.json`);
    if (!(await Bun.file(manifest).exists())) {
      await Bun.write(manifest, JSON.stringify(meta, null, 2));
      log.info(`save manifest: ${manifest}`);
    }

    // 注入加载器（须在 cores manifest 写盘后，避免污染共享 cores）
    let resolvedLoader = options.loader;
    if (isMetaLoader(options.loader)) {
      reportProgress(
        {
          detail: "正在配置模组加载器",
          progress: 0,
        },
        "running",
      );
      const loaderVersion = await applyLoader({ meta, loader: options.loader });
      resolvedLoader = { ...options.loader, version: loaderVersion };
      log.info(`loader applied: ${resolvedLoader.type} ${loaderVersion}`);
    }

    // 安装核心
    reportProgress(
      {
        detail: "正在下载核心",
        progress: 0,
      },
      "running",
    );
    const core = path.join(root, "cores", meta.id, `${meta.id}.jar`);
    await (async () => {
      const downloadCore: () => Promise<void> = () =>
        download(meta.downloads.client!.url, core, {
          logger: log,
          onProgress: ({
            percent,
            speedPerSecond,
          }: {
            percent: number;
            speedPerSecond: string;
          }) => {
            log.info(`download core: ${percent.toFixed(2)}% speed ${speedPerSecond}`);
            reportProgress(
              {
                detail: "正在下载核心",
                progress: percent,
                expand: speedPerSecond,
              },
              "running",
            );
          },
        });

      if (!(await Bun.file(core).exists())) await downloadCore();

      if (
        Bun.CryptoHasher.hash("sha1", await Bun.file(core).arrayBuffer(), "hex") !==
        meta.downloads.client?.sha1
      ) {
        log.error("core file is corrupted");
        await fs.rm(core, { force: true });
        await downloadCore();
      }
      reportProgress(
        {
          detail: "核心下载完成",
          progress: 100,
        },
        "running",
      );
    })();

    // NeoForge / Forge：在 vanilla 依赖库之前跑（需原版 jar 已就位），产物合并进 libraries
    if (options.loader.type === "neoforge" || options.loader.type === "forge") {
      const loaderName = options.loader.type === "neoforge" ? "NeoForge" : "Forge";
      reportProgress(
        {
          detail: `正在安装 ${loaderName}`,
          progress: 0,
        },
        "running",
      );

      if (options.loader.type === "neoforge") {
        await installNeoforge({
          options: options as typeof options & { loader: { type: "neoforge"; version: string } },
          meta,
          root,
          reportProgress,
        });
      } else {
        await installForge({
          options: options as typeof options & { loader: { type: "forge"; version: string } },
          meta,
          root,
          reportProgress,
        });
      }

      resolvedLoader = options.loader;
      log.info(`${options.loader.type} applied: ${resolvedLoader.type} ${resolvedLoader.version}`);
    }

    // 安装依赖库
    reportProgress(
      {
        detail: "准备下载依赖库",
        progress: 0,
      },
      "running",
    );
    const libraries = path.join(root, "libraries");
    await (async () => {
      const libs = meta.libraries.filter((item) => librariesRule(item.rules));

      const currentPlatform = platform();

      const tasks: {
        name: string;
        artifact: DownloadArtifact;
      }[] = [];

      for (const lib of libs) {
        if (lib.downloads?.artifact?.url && lib.downloads.artifact.path) {
          tasks.push({
            name: lib.name,
            artifact: lib.downloads.artifact,
          });
        }

        if (lib.natives && currentPlatform && lib.downloads?.classifiers) {
          let classifierKey = lib.natives[currentPlatform];
          if (classifierKey) {
            const arch = process.arch === "x64" || process.arch === "arm64" ? "64" : "32";
            // biome-ignore lint/suspicious/noTemplateCurlyInString: manifest 用 ${arch} 占位符，需要手动替换
            classifierKey = classifierKey.replace("${arch}", arch);

            const classifierArtifact = lib.downloads.classifiers[classifierKey];
            if (classifierArtifact?.url && classifierArtifact.path) {
              tasks.push({
                name: `${lib.name}:${classifierKey}`,
                artifact: classifierArtifact,
              });
            }
          }
        }
      }

      let completed = 0;
      const total = tasks.length;

      await runWithConcurrency(tasks, 16, async (task) => {
        const { artifact, name } = task;
        const destination = path.join(libraries, artifact.path!);

        await fs.mkdir(path.dirname(destination), { recursive: true });

        // 验证
        if (await Bun.file(destination).exists()) {
          const hash = Bun.CryptoHasher.hash(
            "sha1",
            await Bun.file(destination).arrayBuffer(),
            "hex",
          );
          if (hash === artifact.sha1) {
            completed++;
            const percent = total > 0 ? (completed / total) * 100 : 100;
            reportProgress(
              {
                detail: "正在下载依赖库",
                expand: `${completed}/${total}`,
                progress: percent,
              },
              "running",
            );
            return;
          }

          await fs.rm(destination, { force: true });
        }

        await download(artifact.url, destination, {
          logger: log,
          timeout: 20000,
        });

        completed++;
        const percent = total > 0 ? (completed / total) * 100 : 100;
        reportProgress(
          {
            detail: "正在下载依赖库",
            expand: `${completed}/${total}`,
            progress: percent,
          },
          "running",
        );
        log.info(`download libraries ${completed}/${total} ${name}`);
      });

      reportProgress(
        {
          detail: "依赖库下载完成",
          progress: 100,
        },
        "running",
      );
    })();

    // 解压旧版原生库（现代版本交由 LWJGL 自解压）
    await ensureNatives({
      root,
      version: meta.id,
      meta,
      onProgress: ({ done, total, name }: { done: number; total: number; name: string }) => {
        reportProgress(
          {
            detail: "正在解压原生库",
            expand: `${done}/${total}`,
            progress: total > 0 ? (done / total) * 100 : 100,
          },
          "running",
        );
        log.info(`extract natives ${done}/${total} ${name}`);
      },
    });

    // 安装资源文件
    reportProgress(
      {
        detail: "准备下载资源",
        progress: 0,
      },
      "running",
    );
    const assets = path.join(root, "assets");
    await (async () => {
      const indexes = path.join(assets, "indexes");
      const objects = path.join(assets, "objects");

      // 创建索引目录
      await fs.mkdir(indexes, { recursive: true });
      await fs.mkdir(objects, { recursive: true });

      const index = path.join(indexes, `${meta.assetIndex.id}.json`);

      let assetsIndex: MinecraftAssetIndex;

      if (!(await Bun.file(index).exists())) {
        assetsIndex = await http(meta.assetIndex.url).json<MinecraftAssetIndex>();
        await Bun.write(index, JSON.stringify(assetsIndex, null, 2));
        log.info(`save assets index: ${index}`);
      } else {
        assetsIndex = await Bun.file(index).json();
      }

      const entries = Object.entries(assetsIndex.objects);

      let completed = 0;
      const total = entries.length;

      await runWithConcurrency(entries, 32, async ([name, asset]) => {
        const destination = path.join(objects, asset.hash.slice(0, 2), asset.hash);

        await fs.mkdir(path.dirname(destination), { recursive: true });

        // 验证
        if (await Bun.file(destination).exists()) {
          const hash = Bun.CryptoHasher.hash(
            "sha1",
            await Bun.file(destination).arrayBuffer(),
            "hex",
          );
          if (hash === asset.hash) {
            completed++;
            const percent = total > 0 ? (completed / total) * 100 : 100;
            reportProgress(
              {
                detail: "正在下载资源",
                expand: `${completed}/${total}`,
                progress: percent,
              },
              "running",
            );
            return;
          }

          await fs.rm(destination, { force: true });
        }

        const url = `${RESOURCES}/${asset.hash.slice(0, 2)}/${asset.hash}`;

        await download(url, destination, {
          logger: log,
          timeout: 20000,
        });

        completed++;
        const percent = total > 0 ? (completed / total) * 100 : 100;
        reportProgress(
          {
            detail: "正在下载资源",
            expand: `${completed}/${total}`,
            progress: percent,
          },
          "running",
        );
        log.info(`download assets ${completed}/${total} ${name}`);
      });

      reportProgress(
        {
          detail: "资源下载完成",
          progress: 100,
        },
        "running",
      );
    })();

    // 创建实例
    reportProgress(
      {
        detail: "创建实例",
        progress: 100,
      },
      "running",
    );
    await (async () => {
      // symlink：vanilla/fabric/quilt/neoforge 都指向原版 core。
      // neoforge 的 patched jar 由 FML 经 -DlibraryDirectory + --fml.mcVersion 定位，不进 classpath；
      // 这样 detectProduction 能读到原版 SharedConstants（无 NeoForge 引用），判定为生产环境。
      const coreLink = core;

      const instanceJar = path.join(instance, `${options.name}.jar`);
      await fs.rm(instanceJar, { force: true }).catch(() => {});
      await fs.symlink(coreLink, instanceJar);

      meta.inheritsFrom = meta.id;
      meta.id = options.name;

      // neoforge/forge 的实例 json 已由各自 installer 写为合并后的 manifest，这里不覆盖
      if (options.loader.type !== "neoforge" && options.loader.type !== "forge") {
        await Bun.write(path.join(instance, `${meta.id}.json`), JSON.stringify(meta, null, 2));
      }
      await Bun.write(
        path.join(instance, "ac.config.toml"),
        stringify({
          name: options.name,
          version: new URL(options.url).pathname.split("/").pop()!.replace(".json", ""),
          loader: resolvedLoader,
        } as InstanceConfig),
      );
    })();

    reportProgress(
      {
        detail: "安装完成",
        progress: 100,
      },
      "done",
    );
    log.info("done");

    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error(`failed: ${errorMsg}`);
    reportProgress(
      {
        detail: `安装失败: ${errorMsg}`,
        progress: 100,
      },
      "error",
    );
    throw error;
  }
}
