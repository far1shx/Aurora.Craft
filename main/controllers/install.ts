import { VERSION_MANIFEST } from "~/lib/config.ts";
import { http } from "~/lib/utils.ts";
import { installMinecraft } from "~/service/install.ts";
import {
  type MetaLoader,
  listForgeVersions,
  listLoaderVersions,
  listNeoforgeVersions,
} from "~/service/loader.ts";
import type { Loader } from "~/types/instance.ts";

export const installController = {
  "install.getVersionList": async (
    _: null,
  ): Promise<{
    latest: { release: string; snapshot: string };
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
  "install.installMinecraft": (options: {
    taskId?: string;
    url: string;
    loader: Loader;
    library: string;
    name: string;
  }): Promise<boolean> => installMinecraft({ options }),
  "install.getLoaderVersions": async (options: {
    loader: MetaLoader | { type: "neoforge" } | { type: "forge" };
    mcVersion: string;
  }): Promise<string[]> => {
    if (options.loader.type === "neoforge") {
      return await listNeoforgeVersions(options.mcVersion);
    }
    if (options.loader.type === "forge") {
      return await listForgeVersions(options.mcVersion);
    }
    return await listLoaderVersions(options.loader as MetaLoader, options.mcVersion);
  },
};

export type InstallController = typeof installController;
