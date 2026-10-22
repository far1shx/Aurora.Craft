export type Loader =
  | {
      type: "none";
      version?: string;
    }
  | {
      type: "fabric" | "quilt" | "forge" | "neoforge";
      version: string;
    };

export interface InstanceConfig {
  name: string;
  version: string;
  loader: Loader;
}
