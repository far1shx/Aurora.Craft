import { spawn } from "node:child_process";
import path from "node:path";
import { logger } from "mirinjs";
import type { LaunchController } from "~/controllers/launch.ts";
import type { MutationInput } from "~/lib/utils.ts";
import { instanceConfig } from "~/service/instance.ts";
import { librariesRule } from "~/service/library.ts";
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

    const args = [];

    args.push("--username", "far1sh");
    args.push("--version", config.version);
    args.push("--gameDir", instance);
    args.push("--assetsDir", path.join(root, "assets"));

    const meta = (await Bun.file(
      path.join(instance, `${config.name}.json`),
    ).json()) as MinecraftVersion;

    args.push("--assetIndex", meta.assetIndex.id);
    args.push("--uuid", "f0ae8739-0655-419c-8e5a-a1f1222e6804");
    args.push("--accessToken", "0");

    const libs = meta.libraries.filter((item) => librariesRule(item.rules));

    const classpathEntries = libs
      .filter((item) => item.downloads?.artifact?.path)
      .map((item) => path.join(root, "libraries", item.downloads!.artifact!.path!));

    classpathEntries.push(path.join(instance, `${meta.id}.jar`));

    const classpath = classpathEntries.join(path.delimiter);

    const natives = path.join(root, "natives", config.version);

    const jvmArgs = [
      "-Xmx4G",
      "-XX:+UseCompactObjectHeaders",
      "-XX:+AlwaysPreTouch",
      "-XX:+UseStringDeduplication",
      "-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump",
      "-XX:StackShadowPages=32",
      "--enable-native-access=ALL-UNNAMED",
      "--add-exports",
      "java.base/jdk.internal.misc=ALL-UNNAMED",
      `-Djava.library.path=${natives}/java`,
      `-Djna.tmpdir=${natives}/jna`,
      `-Dorg.lwjgl.system.SharedLibraryExtractPath=${natives}/lwjgl`,
      `-Dio.netty.native.workdir=${natives}/netty`,
      "-Dminecraft.launcher.brand=Aurora Craft",
      `-Dminecraft.launcher.version=${import.meta.env.APP_VERSION}`,
      "-cp",
      classpath,
      meta.mainClass,
      ...args,
    ];

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
