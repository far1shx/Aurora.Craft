import { librariesRule } from "~/service/library.ts";
import type { LibraryRule, MinecraftArguments } from "~/types/minecraft.ts";

// manifest arguments 元素：字符串或带 rules / value 的对象
type ArgumentEntry = NonNullable<MinecraftArguments["game"]>[number];

function substitute(input: string, context: Record<string, string>): string {
  return input.replace(/\$\{([^}]+)\}/g, (match: string, key: string): string => {
    return context[key] ?? match;
  });
}

// 复用 librariesRule 过滤 os/arch，带 features 的条目一律跳过
export function collectArguments(
  entries: ArgumentEntry[] | undefined,
  context: Record<string, string>,
): string[] {
  const result: string[] = [];

  for (const entry of entries ?? []) {
    if (typeof entry === "string") {
      result.push(substitute(entry, context));
      continue;
    }

    const rules = entry.rules as LibraryRule[] | undefined;
    if (!librariesRule(rules)) continue;

    const value = entry.value as string | string[] | undefined;
    if (typeof value === "string") {
      result.push(substitute(value, context));
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") result.push(substitute(item, context));
      }
    }
  }

  return result;
}
