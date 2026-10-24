export const VERSION_MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
export const RESOURCES = "https://resources.download.minecraft.net";
export const MODRINTH_API = "https://api.modrinth.com/v2";

export const FABRIC_META = "https://meta.fabric.far1sh.cn/v2";
export const FABRIC_MAVEN = "https://maven.fabric.far1sh.cn";

export const QUILT_META = "https://meta.quiltmc.org/v3";
export const QUILT_MAVEN = "https://maven.quiltmc.org";

export const NEOFORGE_MAVEN = "https://maven.neoforged.net/releases";
export const NEOFORGE_VERSIONS_API =
  "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge";

export const FORGE_MAVEN = "https://maven.minecraftforge.net";
export const FORGE_VERSIONS_API =
  "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml";

// 下载时替换 host：官方源 origin -> 实际使用源 origin（以本文件为准）。
// 未列出的 host 不替换；换镜像时只需改 FABRIC_MAVEN / QUILT_MAVEN 常量。
export const MAVEN_MIRROR_ORIGINS: Record<string, string> = {
  "https://maven.fabricmc.net": FABRIC_MAVEN,
  "https://maven.quiltmc.org": QUILT_MAVEN,
};

export function mirrorUrl(url: string): string {
  for (const [origin, target] of Object.entries(MAVEN_MIRROR_ORIGINS)) {
    if (url === origin || url.startsWith(`${origin}/`)) {
      return `${target.replace(/\/+$/, "")}${url.slice(origin.length)}`;
    }
  }
  return url;
}
