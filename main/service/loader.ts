import { FABRIC_MAVEN, FABRIC_META, QUILT_META } from "~/lib/config.ts";
import { http } from "~/lib/utils.ts";
import type { Loader } from "~/types/instance.ts";
import type { MinecraftLibrary, MinecraftVersion } from "~/types/minecraft.ts";

// Quilt Meta 要求可识别的 User-Agent
const LOADER_HEADERS = { "User-Agent": "Aurora.Craft" } as const;

export type MetaLoader = {
  type: "fabric" | "quilt";
  version: string;
};

export function isMetaLoader(loader: Loader): loader is MetaLoader {
  return loader.type === "fabric" || loader.type === "quilt";
}

interface MavenLibrary {
  name: string;
  url?: string;
  sha1?: string;
  size?: number;
  rules?: MinecraftLibrary["rules"];
}

interface LoaderProfile {
  mainClass: string;
  arguments?: {
    game?: string[];
    jvm?: string[];
  };
  libraries?: MavenLibrary[];
}

interface LoaderListEntry {
  loader: {
    version: string;
    stable?: boolean;
  };
}

function metaBase(loader: MetaLoader): string {
  return loader.type === "fabric" ? FABRIC_META : QUILT_META;
}

// maven 坐标 group:artifact:version[:classifier] -> 仓库相对路径
function mavenPath(name: string): string | null {
  const parts = name.split(":");
  if (parts.length < 3) return null;

  const group = parts[0]?.replace(/\./g, "/");
  const artifact = parts[1];
  const version = parts[2];
  const classifier = parts[3];

  if (!group || !artifact || !version) return null;

  const file = classifier
    ? `${artifact}-${version}-${classifier}.jar`
    : `${artifact}-${version}.jar`;
  return `${group}/${artifact}/${version}/${file}`;
}

// maven 坐标库 -> downloads 结构
function toDownloadLibrary(lib: MavenLibrary): MinecraftLibrary | null {
  const relative = mavenPath(lib.name);
  if (!relative) return null;

  const base = (lib.url ?? FABRIC_MAVEN).replace(/\/+$/, "");

  return {
    name: lib.name,
    rules: lib.rules,
    downloads: {
      artifact: {
        path: relative,
        url: `${base}/${relative}`,
        sha1: lib.sha1 ?? "",
        size: lib.size ?? 0,
      },
    },
  };
}

// intermediary / loader 等条目缺 sha1，从 maven 补齐以命中缓存
async function resolveSha1(url: string): Promise<string> {
  try {
    const text = await http(`${url}.sha1`, { headers: LOADER_HEADERS }).text();
    return text.trim().split(/\s+/)[0] ?? "";
  } catch {
    return "";
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  return await http(url, { headers: LOADER_HEADERS }).json<T>();
}

export async function listLoaderVersions(loader: MetaLoader, mcVersion: string): Promise<string[]> {
  const entries = await fetchJson<LoaderListEntry[]>(
    `${metaBase(loader)}/versions/loader/${encodeURIComponent(mcVersion)}`,
  );

  return entries.map((entry) => entry.loader.version).filter((version) => version.length > 0);
}

async function resolveLoaderVersion(loader: MetaLoader, mcVersion: string): Promise<string> {
  const versions = await listLoaderVersions(loader, mcVersion);

  for (const version of versions) return version;

  throw Error(`no ${loader.type} loader available for ${mcVersion}`);
}

export async function applyLoader({
  meta,
  loader,
}: {
  meta: MinecraftVersion;
  loader: MetaLoader;
}): Promise<void> {
  const mcVersion = meta.id; // 此时仍为原版版本号
  const loaderVersion = loader.version || (await resolveLoaderVersion(loader, mcVersion));

  const profile = await fetchJson<LoaderProfile>(
    `${metaBase(loader)}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`,
  );

  meta.mainClass = profile.mainClass;

  meta.arguments = meta.arguments ?? {};
  if (profile.arguments?.jvm?.length) {
    meta.arguments.jvm = [...(meta.arguments.jvm ?? []), ...profile.arguments.jvm];
  }
  if (profile.arguments?.game?.length) {
    meta.arguments.game = [...(meta.arguments.game ?? []), ...profile.arguments.game];
  }

  const existing = new Set(meta.libraries.map((lib) => lib.name));

  const added: MinecraftLibrary[] = [];
  for (const raw of profile.libraries ?? []) {
    const converted = toDownloadLibrary(raw);
    if (!converted || existing.has(converted.name)) continue;
    added.push(converted);
  }

  await Promise.all(
    added
      .filter((lib) => !lib.downloads?.artifact?.sha1)
      .map(async (lib) => {
        const artifact = lib.downloads?.artifact;
        if (!artifact) return;
        artifact.sha1 = await resolveSha1(artifact.url);
      }),
  );

  meta.libraries = [...meta.libraries, ...added];
}
