import { spawn } from "node:child_process";
import path from "node:path";
import { logger } from "mirinjs";
import type { LaunchController } from "~/controllers/launch.ts";
import type { MutationInput } from "~/lib/utils.ts";
import { collectArguments } from "~/service/arguments.ts";
import { instanceConfig } from "~/service/instance.ts";
import { librariesRule } from "~/service/library.ts";
import { ensureNatives } from "~/service/natives.ts";
import type { MinecraftVersion } from "~/types/minecraft.ts";

export async function launchMinecraft({
  options,
}: {
  options: MutationInput<LaunchController["routes"]["run"]>;
}): Promise<boolean> {
  const log = logger.child("launch").child("minecraft");

  try {
    const root = options.library;
    const config = await instanceConfig({ options });

    const instance = path.join(root, "instances", config.name);

    const meta = (await Bun.file(
      path.join(instance, `${config.name}.json`),
    ).json()) as MinecraftVersion;

    const libs = meta.libraries.filter((item) => librariesRule(item.rules));

    const classpathEntries: string[] = [];
    for (const lib of libs) {
      const artifactPath = lib.downloads?.artifact?.path;
      if (artifactPath) classpathEntries.push(path.join(root, "libraries", artifactPath));
    }

    classpathEntries.push(path.join(instance, `${meta.id}.jar`));

    const classpath = classpathEntries.join(path.delimiter);

    const natives = path.join(root, "natives", config.version);

    // 兜底解压原生库（install 已处理则跳过）
    await ensureNatives({ root, version: config.version, meta });

    const context: Record<string, string> = {
      auth_player_name: "far1sh",
      version_name: config.name,
      game_directory: instance,
      assets_root: path.join(root, "assets"),
      assets_index_name: meta.assetIndex.id,
      auth_uuid: "f0ae8739-0655-419c-8e5a-a1f1222e6804",
      auth_access_token: "0",
      auth_session: "legacy",
      user_type: "msa",
      user_properties: "{}",
      version_type: meta.type,
      clientid: "",
      auth_xuid: "",
      natives_directory: path.join(natives, "java"),
      launcher_name: "Aurora Craft",
      launcher_version: import.meta.env.APP_VERSION,
      classpath,
      library_directory: path.join(root, "libraries"),
      classpath_separator: path.delimiter,
      resolution_width: "854",
      resolution_height: "480",
    };

    const jvmArgs: string[] = [
      "-Xmx4G",
      "-XX:+UseCompactObjectHeaders",
      "-XX:+AlwaysPreTouch",
      "-XX:+UseStringDeduplication",
      "-XX:StackShadowPages=32",
      "--enable-native-access=ALL-UNNAMED",
      "--add-exports",
      "java.base/jdk.internal.misc=ALL-UNNAMED",
      `-Djna.tmpdir=${path.join(natives, "jna")}`,
      `-Dorg.lwjgl.system.SharedLibraryExtractPath=${path.join(natives, "lwjgl")}`,
      `-Dio.netty.native.workdir=${path.join(natives, "netty")}`,
    ];

    const gameArgs: string[] = [];

    const baseGameArgs: string[] = [
      "--username",
      "far1sh",
      "--version",
      config.name,
      "--gameDir",
      instance,
      "--assetsDir",
      path.join(root, "assets"),
      "--assetIndex",
      meta.assetIndex.id,
      "--uuid",
      "f0ae8739-0655-419c-8e5a-a1f1222e6804",
      "--accessToken",
      "0",
      "--userType",
      "msa",
      "--versionType",
      meta.type,
    ];

    if (meta.arguments) {
      jvmArgs.push(...collectArguments(meta.arguments.jvm, context));
      gameArgs.push(...collectArguments(meta.arguments.game, context));
    } else {
      // 1.13 之前无 arguments 字段，手动拼装
      jvmArgs.push(
        `-Djava.library.path=${path.join(natives, "java")}`,
        "-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump",
        "-Dminecraft.launcher.brand=Aurora Craft",
        `-Dminecraft.launcher.version=${import.meta.env.APP_VERSION}`,
      );

      gameArgs.push(...baseGameArgs);
    }

    // 部分早期 manifest 缺少 -cp / java.library.path
    if (!jvmArgs.includes("-cp")) {
      jvmArgs.push("-cp", classpath);
    }
    if (!jvmArgs.some((arg) => arg.startsWith("-Djava.library.path="))) {
      jvmArgs.push(`-Djava.library.path=${path.join(natives, "java")}`);
    }

    jvmArgs.push(meta.mainClass, ...gameArgs);

    const child = spawn("javaw", jvmArgs, {
      cwd: instance,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (data: Buffer) => {
      log.info(`${data.toString("utf8").trimEnd()}`);
    });

    child.stderr?.on("data", (data: Buffer) => {
      log.error(`${data.toString("utf8").trimEnd()}`);
    });

    child.on("error", (error) => {
      log.error("failed", error);
    });

    child.on("exit", (code, signal) => {
      log.info("exited", { code, signal });
    });

    child.unref();

    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error(`failed: ${errorMsg}`);
    throw error;
  }
}
