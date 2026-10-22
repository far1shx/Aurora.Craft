import { rpc } from "mirinjs/rpc";
import { VERSION_MANIFEST } from "~/lib/config.ts";
import { http } from "~/lib/utils.ts";
import { installMinecraft } from "~/service/install.ts";
import { type MetaLoader, listLoaderVersions } from "~/service/loader.ts";
import type { Loader } from "~/types/instance.ts";

export const installController = rpc.router({
  getVersionList: rpc.query(
    async (
      _: null,
    ): Promise<{
      latest: {
        release: string;
        snapshot: string;
      };
      versions: {
        id: string;
        type: "release" | "snapshot" | "old_beta" | "old_alpha";
        url: string;
        time: string;
        releaseTime: string;
        sha1: string;
        complianceLevel: number;
      }[];
    }> => {
      return await http(VERSION_MANIFEST).json();
    },
  ),
  installMinecraft: rpc.mutation(
    (options: {
      taskId?: string;
      url: string;
      loader: Loader;
      library: string;
      name: string;
    }): ReturnType<typeof installMinecraft> => installMinecraft({ options }),
  ),
  getLoaderVersions: rpc.query(
    async (options: { loader: MetaLoader; mcVersion: string }) =>
      await listLoaderVersions(options.loader, options.mcVersion),
  ),
});

export type InstallController = typeof installController;
