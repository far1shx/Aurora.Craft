import {
  FABRIC_MAVEN,
  FABRIC_META,
  FORGE_MAVEN,
  FORGE_VERSIONS_API,
  NEOFORGE_MAVEN,
  NEOFORGE_VERSIONS_API,
  QUILT_META,
} from "~/lib/config.ts";
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

// 语义化版本比较：返回负数 a<b、0 相等、正数 a>b；稳定版高于同号 pre-release
function compareVersions(a: string, b: string): number {
  const parse = (v: string): [number[], string | null] => {
    const main = v.split("-")[0] ?? "";
    const pre = v.includes("-") ? (v.split("-").slice(1).join("-") ?? "") : null;
    return [main.split(".").map((n) => Number.parseInt(n, 10) || 0), pre];
  };
  const [numA, preA] = parse(a);
  const [numB, preB] = parse(b);
  for (let i = 0; i < Math.max(numA.length, numB.length); i++) {
    const diff = (numA[i] ?? 0) - (numB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  // 数字部分相同：无 pre-release（稳定版）> 有 pre-release
  if (preA === null && preB === null) return 0;
  if (preA === null) return 1;
  if (preB === null) return -1;
  return preA.localeCompare(preB);
}

export async function listLoaderVersions(loader: MetaLoader, mcVersion: string): Promise<string[]> {
  const entries = await fetchJson<LoaderListEntry[]>(
    `${metaBase(loader)}/versions/loader/${encodeURIComponent(mcVersion)}`,
  );

  return entries
    .map((entry) => entry.loader.version)
    .filter((version) => version.length > 0)
    .sort((a, b) => compareVersions(b, a)); // 降序：最新在前
}

async function resolveLoaderVersion(loader: MetaLoader, mcVersion: string): Promise<string> {
  const versions = await listLoaderVersions(loader, mcVersion);

  // 优先用最新稳定版（无 pre-release 后缀），避免 beta 的兼容性问题
  const stable = versions.find((version) => !version.includes("-"));
  if (stable) return stable;

  for (const version of versions) return version;

  throw Error(`no ${loader.type} loader available for ${mcVersion}`);
}

export async function applyLoader({
  meta,
  loader,
}: {
  meta: MinecraftVersion;
  loader: MetaLoader;
}): Promise<string> {
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

  return loaderVersion;
}

// --- NeoForge ---

// 兼容 NeoForge 新旧版本号：26.x 起走新轨（26.3.0.95 -> 26.3），旧轨 1.x.x -> 21.1.x
function getMcVersionFromNeoForgeVersion(version: string): string {
  const parts = version.split(".");
  const major = parseInt(parts[0] ?? "0", 10);

  if (major >= 26) {
    const minor = parts[1] ?? "0";
    const patch = parts[2] ?? "0";
    let mc = `${major}.${minor}`;
    if (patch !== "0") mc += `.${patch}`;
    const snapshot = version.split("+")[1];
    if (snapshot) mc += `-${snapshot}`;
    return mc;
  }

  return `1.${parts[0]}.${parts[1]}`;
}

function matchesMcVersion(neoVersion: string, mcVersion: string): boolean {
  if (neoVersion.startsWith("0")) return false; // April Fools
  const mc = getMcVersionFromNeoForgeVersion(neoVersion);
  return mc === mcVersion;
}

export async function listNeoforgeVersions(mcVersion: string): Promise<string[]> {
  const data = await http(NEOFORGE_VERSIONS_API, {
    headers: LOADER_HEADERS,
  }).json<{ versions: string[] }>();

  return [...data.versions]
    .reverse()
    .filter(
      (version) =>
        !version.includes("-alpha") &&
        !version.includes("-beta") &&
        matchesMcVersion(version, mcVersion),
    );
}

export function getNeoforgeInstallerUrl(version: string): string {
  return `${NEOFORGE_MAVEN}/net/neoforged/neoforge/${version}/neoforge-${version}-installer.jar`;
}

// --- Forge ---

// Forge 版本号为 <mcVersion>-<build>（如 1.21.1-52.0.20、26.3-66.1.0）
function getMcVersionFromForgeVersion(version: string): string {
  return version.split("-")[0] ?? "";
}

// 旧版 Forge（1.13 之前）没有 install_profile.json / processors，安装流程完全不同
function isModernForgeMcVersion(mcVersion: string): boolean {
  // 26.x 起是新版本号方案，全部属于现代流程
  if (mcVersion.startsWith("26.")) return true;
  const parts = mcVersion.split(".");
  const minor = Number.parseInt(parts[1] ?? "0", 10);
  return minor >= 13;
}

export async function listForgeVersions(mcVersion: string): Promise<string[]> {
  if (!isModernForgeMcVersion(mcVersion)) return [];

  const xml = await http(FORGE_VERSIONS_API, { headers: LOADER_HEADERS }).text();

  // maven-metadata.xml 里 <version> 与 update 无关，需要正则逐个取出
  const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
    .map((match) => match[1] ?? "")
    .filter((version) => version.length > 0 && getMcVersionFromForgeVersion(version) === mcVersion);

  // 按 build 号降序（同 MC 版本下 build 单调递增）
  return versions.sort((a, b) => {
    const buildA = a.split("-")[1] ?? "0";
    const buildB = b.split("-")[1] ?? "0";
    return compareVersions(buildB, buildA);
  });
}

export function getForgeInstallerUrl(version: string): string {
  return `${FORGE_MAVEN}/net/minecraftforge/forge/${version}/forge-${version}-installer.jar`;
}
