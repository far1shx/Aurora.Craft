import { proxy, snapshot, subscribe } from "valtio";
import { api } from "@/lib/controller.ts";
import { debounce } from "@/lib/debounce";

export const settingsConfig = proxy<{
  theme: string;
  library: string[];
  java: { version: string; path: string }[];
  agreement: boolean;
  error_collection: boolean;
  navigation: {
    show: boolean;
    permanent: boolean;
  };
  alert: {
    account: boolean;
  };
  customized: {
    skin: boolean;
  };
}>({
  theme: "system",
  library: [],
  java: [],
  agreement: false,
  error_collection: true,
  navigation: {
    show: true,
    permanent: false,
  },
  alert: {
    account: true,
  },
  customized: {
    skin: true,
  },
});

Object.assign(settingsConfig, await api.config.get({ name: "settings" }));

const library: string = await api.tool.defaultLibraryPath(null);

settingsConfig.library = [library, ...settingsConfig.library.filter((item) => item !== library)];

subscribe(
  settingsConfig,
  debounce(async (): Promise<void> => {
    const data = snapshot(settingsConfig);

    await api.config.set({ name: "settings", data });
  }, 300),
);
