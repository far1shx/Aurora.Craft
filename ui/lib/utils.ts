import { settingsConfig } from "@/config/settings.ts";

export { cn } from "cn";
export const version: string | undefined = import.meta.env.APP_VERSION;
export const isBeta = version.split("-")[1] === "beta";
export const defaultLibrary: string = settingsConfig.library[0]!;

// 实例名会直接拼进文件系统路径，且不允许空格（空格会被 Windows 尾随截断规则干扰）
const INSTANCE_NAME_MAX = 64;
const WINDOWS_RESERVED = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

// 允许中文、字母、数字、下划线、短横线、点；不含空格与任何路径分隔符
const INSTANCE_NAME_PATTERN = /^[\p{Script=Han}A-Za-z0-9_.-]+$/u;

/** 校验实例名，合法返回 null，否则返回中文错误说明 */
export function validateInstanceName(name: string): string | null {
  if (name.length === 0) return "实例名不能为空";
  if (name.length > INSTANCE_NAME_MAX) return `实例名不能超过 ${INSTANCE_NAME_MAX} 个字符`;
  if (/^\s|\s$/.test(name)) return "实例名不能以空格开头或结尾";
  if (name.includes(" ")) return "实例名不能包含空格";
  if (!INSTANCE_NAME_PATTERN.test(name)) {
    return "实例名只能包含中文、字母、数字、下划线、短横线和点";
  }
  if (name === "." || name === "..") return "实例名不能是 . 或 ..";
  if (name.startsWith(".")) return "实例名不能以点开头";
  if (name.endsWith(".")) return "实例名不能以点结尾";
  // Windows 保留设备名对大小写不敏感，且带扩展名时同样被占用（如 con.txt）
  const stem = name.split(".")[0]?.toLowerCase() ?? "";
  if (WINDOWS_RESERVED.has(stem)) return `实例名不能使用系统保留名称 ${stem.toUpperCase()}`;
  return null;
}

/** 由版本号等原始文本生成合法实例名：空白转短横线，剔除非法字符 */
export function sanitizeInstanceName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Script=Han}A-Za-z0-9_.-]/gu, "")
    .slice(0, INSTANCE_NAME_MAX);

  // 兜底：清理后可能只剩点或空
  if (cleaned.length === 0 || /^\.+$/.test(cleaned)) return "";
  return cleaned.replace(/^\.+/, "").replace(/\.+$/, "");
}
