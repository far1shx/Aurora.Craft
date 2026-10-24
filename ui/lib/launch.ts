import { settingsConfig } from "@/config/settings.ts";
import { api } from "@/lib/controller.ts";

export async function launch(options: Parameters<typeof api.launch.run>[0]): Promise<void> {
  const config = await api.instance.config({ ...options });

  settingsConfig.last_startup = {
    library: options.library,
    name: config.name,
    meta: `${config.version}${config.loader.type !== "none" ? ` | ${config.loader.type}` : ""}`,
  };

  await api.launch.run({ ...options });
}
