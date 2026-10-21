export interface InstanceConfig {
  name: string;
  version: string;
  loader:
    | {
        type: "none";
        version?: string;
      }
    | {
        type: "fabric" | "quilt" | "forge" | "neoforge";
        version: string;
      };
}
