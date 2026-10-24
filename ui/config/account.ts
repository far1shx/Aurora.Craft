import { proxy, snapshot, subscribe } from "valtio";
import { api } from "@/lib/controller.ts";
import { debounce } from "@/lib/debounce";
import type { Account } from "~/types/account.ts";

export const accountConfig = proxy<Account[]>([]);

const saved = (await api.config.get({ name: "account" })) as { accounts?: Account[] };
if (Array.isArray(saved.accounts)) {
  accountConfig.push(...saved.accounts);
}

subscribe(
  accountConfig,
  debounce(async (): Promise<void> => {
    const data: Record<string, unknown> = { accounts: snapshot(accountConfig) };

    await api.config.set({ name: "account", data });
  }, 300),
);
