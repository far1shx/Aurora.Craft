export interface MinecraftAssetIndex {
  objects: Record<
    string,
    {
      hash: string;
      size: number;
    }
  >;
}

export interface MinecraftVersion {
  arguments?: MinecraftArguments;
  assetIndex: AssetIndex;
  assets: string;
  complianceLevel?: number;
  downloads: {
    client?: DownloadArtifact;
    client_mappings?: DownloadArtifact;
    server?: DownloadArtifact;
    server_mappings?: DownloadArtifact;
  };
  id: string;
  javaVersion?: {
    component: string;
    majorVersion: number;
  };
  libraries: MinecraftLibrary[];
  logging?: {
    client?: {
      argument: string;
      file: DownloadArtifact;
      type: string;
    };
  };
  mainClass: string;
  minimumLauncherVersion: number;
  releaseTime: string;
  time: string;
  type: "release" | "snapshot" | "old_beta" | "old_alpha";
}

export interface DownloadArtifact {
  id?: string;
  path?: string;
  sha1: string;
  size: number;
  totalSize?: number;
  url: string;
}

export interface AssetIndex {
  id: string;
  sha1: string;
  size: number;
  totalSize: number;
  url: string;
}

export type LibraryPlatform = "osx" | "linux" | "windows";

export type KnownClassifier =
  | "natives-linux"
  | "natives-osx"
  | "natives-macos"
  | "natives-windows"
  | "natives-windows-32"
  | "natives-windows-64";

export interface MinecraftLibrary {
  downloads?: {
    /** 新版本原生库及普通库均通过 artifact 提供下载 */
    artifact?: DownloadArtifact;
    /** 旧版本（1.19 之前）原生库通过 classifiers 分发 */
    classifiers?: Partial<Record<KnownClassifier, DownloadArtifact>> &
      Record<string, DownloadArtifact>;
  };
  /** 旧版本解压原生库时的排除规则（如 META-INF/） */
  extract?: {
    exclude?: string[];
  };
  /** 格式通常为 groupId:artifactId:version[:classifier] */
  name: string;
  /** 旧版本原生库映射表，将 os 映射为 classifiers 中的 key */
  natives?: Partial<Record<LibraryPlatform, string>>;
  /** 库适用平台规则，新版本原生库直接依据 rules 中的 os/arch 进行判断 */
  rules?: LibraryRule[];
  url?: string;
}

export interface LibraryRule {
  action: "allow" | "disallow";
  features?: Record<string, boolean>;
  os?: {
    arch?: "x86" | "x64" | "arm" | "arm64" | (string & {});
    name?: LibraryPlatform | (string & {});
    version?: string;
    versionRange?: {
      min?: string;
      max?: string;
    };
  };
}

export interface MinecraftArguments {
  game?: Array<string | Record<string, unknown>>;
  jvm?: Array<string | Record<string, unknown>>;
}
