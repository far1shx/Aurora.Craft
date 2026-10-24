import { MODRINTH_API } from "~/lib/config.ts";
import type { ModrinthSearchResult } from "~/lib/rpc-schema.ts";
import { http } from "~/lib/utils.ts";

export const modrinthController = {
  "modrinth.search": async (options: {
    query?: string;
    facets?: string[][];
    index?: "relevance" | "downloads" | "follows" | "newest" | "updated";
    offset?: number;
    limit?: number;
  }): Promise<ModrinthSearchResult> => {
    const params = new URLSearchParams();

    if (options.query !== undefined) params.set("query", options.query);
    if (options.facets !== undefined) params.set("facets", JSON.stringify(options.facets));
    if (options.index !== undefined) params.set("index", options.index);
    if (options.offset !== undefined) params.set("offset", String(options.offset));
    if (options.limit !== undefined) params.set("limit", String(options.limit));

    return await http(`${MODRINTH_API}/search?${params}`).json<ModrinthSearchResult>();
  },
};

export type ModrinthController = typeof modrinthController;
