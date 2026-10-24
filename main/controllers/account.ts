import { createHash } from "node:crypto";
import path from "node:path";
import envPaths from "env-paths";
import { type ToastSender, toast } from "~/lib/toast.ts";
import type { Account } from "~/types/account.ts";

const config = path.join(
  envPaths("aurora.craft", { suffix: "" }).config.replace(/[\\/]Config$/, ""),
  "config",
);

export function createAccountController(rpc: ToastSender): {
  "account.createOffline": (options: { username: string; uuid?: string }) => void;
  "account.scan": () => Account[];
} {
  return {
    "account.createOffline": (options: { username: string; uuid?: string }): void => {
      if (
        options.uuid &&
        !/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(
          options.uuid,
        )
      ) {
        toast(rpc, {
          title: "创建失败",
          description: "请输入有效的 UUID",
          type: "error",
        });
      }

      const offlineUUID: () => string = () => {
        const hash = createHash("md5").update(`OfflinePlayer:${options.username}`, "utf8").digest();

        // biome-ignore lint/style/noNonNullAssertion: hash[6] 必然存在（md5 digest 为 16 字节）
        hash[6] = (hash[6]! & 0x0f) | 0x30;
        // biome-ignore lint/style/noNonNullAssertion: hash[8] 必然存在（md5 digest 为 16 字节）
        hash[8] = (hash[8]! & 0x3f) | 0x80;

        const hex = hash.toString("hex");

        return [
          hex.slice(0, 8),
          hex.slice(8, 12),
          hex.slice(12, 16),
          hex.slice(16, 20),
          hex.slice(20, 32),
        ].join("-");
      };

      const _uuid = options.uuid ?? offlineUUID();
    },
    "account.scan": (): Account[] => {
      const _file = Bun.file(path.join(config, "account.toml"));

      return [];
    },
  };
}

export type AccountController = ReturnType<typeof createAccountController>;
