import fs from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { platform } from "~/lib/utils.ts";
import { librariesRule } from "~/service/library.ts";
import type { MinecraftVersion } from "~/types/minecraft.ts";

export interface NativeTask {
  name: string;
  jarPath: string;
  sha1: string;
  exclude: string[];
}

// 仅处理旧式 natives + classifiers；现代 LWJGL3 的 natives 由运行时自解压
export function collectNatives(meta: MinecraftVersion): NativeTask[] {
  const currentPlatform = platform();
  if (!currentPlatform) return [];

  const tasks: NativeTask[] = [];

  for (const lib of meta.libraries) {
    if (!lib.natives || !lib.downloads?.classifiers) continue;
    if (!librariesRule(lib.rules)) continue;

    let classifierKey = lib.natives[currentPlatform];
    if (!classifierKey) continue;

    const arch = process.arch === "x64" || process.arch === "arm64" ? "64" : "32";
    // biome-ignore lint/suspicious/noTemplateCurlyInString: manifest 用 ${arch} 占位符，需要手动替换
    classifierKey = classifierKey.replace("${arch}", arch);

    const artifact = lib.downloads.classifiers[classifierKey];
    if (!artifact?.url || !artifact.path) continue;

    tasks.push({
      name: `${lib.name}:${classifierKey}`,
      jarPath: artifact.path,
      sha1: artifact.sha1,
      exclude: lib.extract?.exclude ?? [],
    });
  }

  return tasks;
}

function signature(tasks: NativeTask[]): string {
  return tasks
    .map((task) => `${task.name}:${task.sha1}`)
    .sort()
    .join("\n");
}

async function extractNatives({
  libraries,
  natives,
  tasks,
  onProgress,
}: {
  libraries: string;
  natives: string;
  tasks: NativeTask[];
  onProgress?: (info: { done: number; total: number; name: string }) => void;
}): Promise<void> {
  await fs.mkdir(natives, { recursive: true });

  const root = path.resolve(natives);
  let done = 0;

  for (const task of tasks) {
    const jar = path.join(libraries, task.jarPath);
    const unzipped = unzipSync(await Bun.file(jar).bytes());

    for (const [entryName, bytes] of Object.entries(unzipped)) {
      if (!bytes) continue;
      if (entryName.endsWith("/")) continue;
      if (task.exclude.some((prefix) => entryName.startsWith(prefix))) continue;

      const destination = path.resolve(natives, entryName);
      // 防止路径穿越
      if (destination !== root && !destination.startsWith(root + path.sep)) continue;

      await fs.mkdir(path.dirname(destination), { recursive: true });
      await Bun.write(destination, bytes);
    }

    done++;
    onProgress?.({ done, total: tasks.length, name: task.name });
  }
}

// marker 存任务签名，命中则跳过；install 写入，launch 兜底
export async function ensureNatives({
  root,
  version,
  meta,
  onProgress,
}: {
  root: string;
  version: string;
  meta: MinecraftVersion;
  onProgress?: (info: { done: number; total: number; name: string }) => void;
}): Promise<void> {
  const tasks = collectNatives(meta);
  if (tasks.length === 0) return;

  const natives = path.join(root, "natives", version, "java");
  const marker = path.join(natives, ".extracted.json");
  const sig = signature(tasks);

  if (
    (
      await Bun.file(marker)
        .text()
        .catch(() => "")
    ).trim() === sig
  )
    return;

  await extractNatives({ libraries: path.join(root, "libraries"), natives, tasks, onProgress });
  await Bun.write(marker, sig);
}
