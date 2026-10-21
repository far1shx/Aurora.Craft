import { rpc } from "mirinjs/rpc";
import { launchMinecraft } from "~/service/launch.ts";

export const launchController = rpc.router({
  run: rpc.mutation(
    (options: { library: string; name: string }): ReturnType<typeof launchMinecraft> =>
      launchMinecraft({ options }),
  ),
});

export type LaunchController = typeof launchController;
