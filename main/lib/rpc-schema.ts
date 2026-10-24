import type { RPCSchema } from "electrobun/view";
import type { MetaLoader } from "~/service/loader.ts";
import type { InstanceConfig, Loader } from "~/types/instance.ts";

export type TaskEvent = {
  id: string;
  progress: number;
  expand?: string;
  detail?: string;
  status: "running" | "done" | "error";
};

export type ToastEvent = {
  title: string;
  description?: string;
  type?: "success" | "info" | "warning" | "error";
};

export type ModrinthSearchResult = {
  hits: {
    project_id: string;
    project_type: "mod" | "modpack" | "resourcepack" | "shader";
    title: string;
    description: string;
    author: string;
    categories: string[];
    icon_url?: string;
    downloads: number;
    follows: number;
    versions: string[];
    date_created: string;
    date_modified: string;
    latest_version: string;
    license: string;
    slug?: string;
    client_side: string;
    server_side: string;
    gallery: string[];
    display_categories?: string[];
    all_project_types?: string[];
    color?: number;
  }[];
  offset: number;
  limit: number;
  total_hits: number;
};

/** Flat request map — each key is `"namespace.method"`. */
export type AppRequests = {
  // window
  "window.min": { params: null; response: undefined };
  "window.close": { params: null; response: undefined };
  // config
  "config.get": {
    params: { name: string; root?: string };
    response: Record<string, unknown>;
  };
  "config.set": {
    params: { name: string; data: Record<string, unknown>; root?: string };
    response: undefined;
  };
  // tool
  "tool.defaultLibraryPath": { params: null; response: string };
  // install
  "install.getVersionList": {
    params: null;
    response: {
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
    };
  };
  "install.installMinecraft": {
    params: {
      taskId?: string;
      url: string;
      loader: Loader;
      library: string;
      name: string;
    };
    response: boolean;
  };
  "install.getLoaderVersions": {
    params: {
      loader: MetaLoader | { type: "neoforge" } | { type: "forge" };
      mcVersion: string;
    };
    response: string[];
  };
  // launch
  "launch.run": {
    params: { library: string; name: string };
    response: unknown;
  };
  // instance
  "instance.check": { params: { library: string; name: string }; response: boolean };
  "instance.config": { params: { library: string; name: string }; response: InstanceConfig };
  "instance.scan": {
    params: { library: string };
    response: (InstanceConfig & { library: string })[];
  };
  // modrinth
  "modrinth.search": {
    params: {
      query?: string;
      facets?: string[][];
      index?: "relevance" | "downloads" | "follows" | "newest" | "updated";
      offset?: number;
      limit?: number;
    };
    response: ModrinthSearchResult;
  };
  // account
  "account.createOffline": {
    params: { username: string; uuid?: string };
    response: undefined;
  };
  "account.scan": { params: null; response: unknown };
};

/** Flat message map sent from the main process to the webview (`webview.messages`). */
export type AppMessages = {
  "event.task": TaskEvent;
  "event.toast": ToastEvent;
};

export type AppRPC = {
  bun: RPCSchema<{
    requests: AppRequests;
    // 主进程收到的消息（当前没有 webview→main 的单向消息）
    messages: Record<string, never>;
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    // 主进程 → 渲染进程的单向事件
    messages: AppMessages;
  }>;
};
