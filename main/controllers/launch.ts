import { launchMinecraft } from "~/service/launch.ts";

export const launchController = {
  "launch.run": (options: { library: string; name: string }): Promise<boolean> =>
    launchMinecraft({ options }),
};

export type LaunchController = typeof launchController;
