import ky from "ky";
import { rpc } from "mirinjs/rpc";
import { VERSION_MANIFEST } from "~/lib/config.ts";
import { installMinecraft } from "~/service/install.ts";

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
      return await ky(VERSION_MANIFEST).json();
    },
  ),
  installMinecraft: rpc.mutation(
    (options: {
      taskId?: string;
      url: string;
      loader:
        | {
            type: "none";
            version?: string;
          }
        | {
            type: "fabric" | "quilt" | "forge" | "neoforge";
            version: string;
          };
      library: string;
      name: string;
    }): ReturnType<typeof installMinecraft> => installMinecraft({ options }),
  ),
});

export type InstallController = typeof installController;
