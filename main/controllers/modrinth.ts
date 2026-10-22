import { rpc } from "mirinjs/rpc";
import { MODRINTH_API } from "~/lib/config.ts";
import { http } from "~/lib/utils.ts";

export const modrinthController = rpc.router({
  search: rpc.query(
    async (options: {
      query?: string;
      facets?: string[][];
      index?: "relevance" | "downloads" | "follows" | "newest" | "updated";
      offset?: number;
      limit?: number;
    }): Promise<{
      hits: {
        project_id: string;
        project_type: "mod" | "modpack" | "resourcepack" | "shader";
        all_project_types: (
          | "mod"
          | "resourcepack"
          | "datapack"
          | "shader"
          | "modpack"
          | "plugin"
        )[];
        title: string;
        description: string;
        author: string;
        categories: string[];
        display_categories: string[];
        versions: string[];
        downloads: number;
        follows: number;
        icon_url: string;
        date_created: string;
        date_modified: string;
        latest_version: string;
        license: string;
        environment: (
          | "client_and_server"
          | "client_only"
          | "client_only_server_optional"
          | "singleplayer_only"
          | "server_only"
          | "server_only_client_optional"
          | "dedicated_server_only"
          | "client_or_server"
          | "client_or_server_prefers_both"
          | "unknown"
        )[];
        disclosure_types: (
          | "ai_content"
          | "ai_content_code"
          | "ai_content_assets"
          | "ai_content_text"
          | "ai_functionality"
          | "advertisements"
          | "epilepsy_triggers"
          | "system_interactions"
          | "telemetry"
          | "telemetry_opt_in"
          | "telemetry_opt_out"
          | "telemetry_always_active"
          | "derivative_work"
          | "paid_features"
          | "archived"
        )[];
        gallery: string[];
        slug?: string | null;
        author_id?: string | null;
        organization?: string | null;
        organization_id?: string | null;
        featured_gallery?: string | null;
        color?: number | null;
        client_side: "required" | "optional" | "unsupported" | "unknown";
        server_side: "required" | "optional" | "unsupported" | "unknown";
      }[];
      offset: number;
      limit: number;
      total_hits: number;
    }> => {
      const params = new URLSearchParams();

      if (options.query !== undefined) params.set("query", options.query);
      if (options.facets !== undefined) params.set("facets", JSON.stringify(options.facets));
      if (options.index !== undefined) params.set("index", options.index);
      if (options.offset !== undefined) params.set("offset", String(options.offset));
      if (options.limit !== undefined) params.set("limit", String(options.limit));

      return await http(`${MODRINTH_API}/search?${params}`).json();
    },
  ),
});

export type ModrinthController = typeof modrinthController;
