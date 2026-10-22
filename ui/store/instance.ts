import { proxy } from "valtio";
import { settingsConfig } from "@/config/settings.ts";
import { api } from "@/lib/controller.ts";

const normalize = (library: string): string => library.replace(/[\\/]+$/, "");

let pending: Promise<void> | undefined;

export const instanceStore = proxy({
  list: [] as Awaited<ReturnType<typeof api.instance.scan>>,

  refresh: async (): Promise<void> => {
    if (pending) return pending;

    pending = (async (): Promise<void> => {
      const libraries: string[] = [
        ...new Map(settingsConfig.library.map((library) => [normalize(library), library])).values(),
      ];

      const results = await Promise.all(
        libraries.map(async (library) => await api.instance.scan({ library })),
      );

      const instances = new Map(
        results.flat().map((instance) => [`${instance.library}:${instance.name}`, instance]),
      );

      instanceStore.list.splice(0, instanceStore.list.length, ...instances.values());
    })();

    try {
      await pending;
    } finally {
      pending = undefined;
    }
  },
});
