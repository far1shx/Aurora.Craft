import { proxy } from "valtio";
import { settingsConfig } from "@/config/settings.ts";
import { api } from "@/lib/controller.ts";

export const instanceStore = proxy({
  list: [] as Awaited<ReturnType<typeof api.instance.scan>>,

  refresh: async () => {
    const results: (typeof instanceStore.list)[] = await Promise.all(
      settingsConfig.library.map(async (library) => await api.instance.scan({ library })),
    );

    const instances = results.flat();

    instanceStore.list.splice(
      0,
      instanceStore.list.length,
      ...Array.from(
        new Map(
          instances.map((instance) => [`${instance.library}:${instance.name}`, instance]),
        ).values(),
      ),
    );
  },
});
