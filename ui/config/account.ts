import { proxy, snapshot, subscribe } from "valtio";
import { api } from "@/lib/controller.ts";
import { debounce } from "@/lib/debounce";

type MicrosoftAccount = {
  type: "microsoft";
  token: string;
};

type YggdrasilAccount = {
  type: "yggdrasil";
  token: string;
};

type OfflineAccount = {
  type: "offline";
  name: string;
  uuid: string;
};

type Account = MicrosoftAccount | YggdrasilAccount | OfflineAccount;

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
