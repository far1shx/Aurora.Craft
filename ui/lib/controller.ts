import { nestedClient } from "@/lib/nested-client.ts";
import type { AppController } from "~/main.ts";

/**
 * Typed RPC client for the app's nested router.
 *
 * Access procedures via their namespace:
 *   `api.window.min(null)`
 *   `api.install.getVersionList(null)`
 */
export const api = nestedClient<AppController>();
