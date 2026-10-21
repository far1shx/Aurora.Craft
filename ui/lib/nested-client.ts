/**
 * Typed nested RPC client for dot-namespaced routes.
 *
 * Wraps `window.mirin.call("namespace.method", input)` behind a two-level
 * Proxy so callers write `api.window.min()` instead of `api["window.min"]()`.
 *
 * Usage (UI code only — never import server handler values):
 * ```ts
 * import type { AppController } from "~/main.ts";
 * import { nestedClient } from "@/lib/nested-client.ts";
 *
 * export const api = nestedClient<AppController>();
 * await api.window.min(null);
 * await api.install.getVersionList(null);
 * ```
 */

import type { EventProc, MutationProc, QueryProc } from "mirinjs/rpc";

// ── Type helpers ──────────────────────────────────────────────────────────────

/** Extract the namespace prefix from a `"NS.method"` key. */
type Namespace<K extends string> = K extends `${infer NS}.${string}` ? NS : never;

/** Extract the method suffix for a given namespace from a `"NS.method"` key. */
type MethodOf<K extends string, NS extends string> = K extends `${NS}.${infer M}` ? M : never;

/** Convert a single Procedure type to its client-callable shape. */
type ProcToClient<P> =
  P extends QueryProc<infer I, infer O>
    ? (input: I) => Promise<Awaited<O>>
    : P extends MutationProc<infer I, infer O>
      ? (input: I) => Promise<Awaited<O>>
      : P extends EventProc<infer Payload>
        ? { on(listener: (payload: Payload) => void): () => void }
        : never;

/**
 * Extract the `routes` record directly from a router-shaped object's property.
 *
 * We intentionally avoid `R extends Router<infer T>` here.  `NestedRouter<T>`
 * extends `Router<any>`, so TypeScript would infer `T = any` from the generic
 * parameter rather than picking up the narrowed `routes: FlatRoutes<T>` field.
 * Reading `R["routes"]` via a structural `infer` sidesteps that problem and
 * correctly resolves to `FlatRoutes<T>` with all its literal keys intact.
 */
type RoutesOf<R> = R extends { readonly routes: infer T } ? T : never;

/**
 * Converts an `AppController` (or any nested-router shape) into a two-level
 * client type:
 *
 * ```
 * { "window.min": MutationProc<null, void> }
 *   →  { window: { min: (input: null) => Promise<void> } }
 * ```
 */
export type NestedClientFor<R> = {
  [NS in Namespace<keyof RoutesOf<R> & string>]: {
    [M in MethodOf<keyof RoutesOf<R> & string, NS>]: `${NS}.${M}` extends keyof RoutesOf<R>
      ? ProcToClient<RoutesOf<R>[`${NS}.${M}`]>
      : never;
  };
};

// ── Runtime ───────────────────────────────────────────────────────────────────

interface MirinTransport {
  call(method: string, input: unknown): Promise<unknown>;
  onEvent(method: string, listener: (payload: unknown) => void): () => void;
}

function transport(): MirinTransport {
  // `window.mirin` is installed by the mirin preload bootstrap.
  const t = (window as { mirin?: MirinTransport }).mirin;
  if (!t) {
    throw new Error(
      "window.mirin is not available — this page is not running inside a mirin webview " +
        "(or the preload bootstrap failed to authenticate).",
    );
  }
  return t;
}

/**
 * Create a typed two-level RPC client for a nested router.
 *
 * Pass the router's *type* only — never import the router value (and its
 * handlers) into UI code.
 *
 * @example
 * ```ts
 * import type { AppController } from "~/main.ts";
 * export const api = nestedClient<AppController>();
 * await api.window.min(null);
 * ```
 */
export function nestedClient<R>(): NestedClientFor<R> {
  // Cache per-namespace sub-proxies so object identity is stable across renders.
  const nsCache = new Map<string, object>();

  return new Proxy({} as NestedClientFor<R>, {
    get(_target: NestedClientFor<R>, ns: string | symbol): unknown {
      if (typeof ns !== "string") return undefined;

      let sub = nsCache.get(ns);
      if (!sub) {
        const evCache = new Map<string, { on(l: (p: unknown) => void): () => void }>();

        sub = new Proxy({} as Record<string, unknown>, {
          get(_t: Record<string, unknown>, method: string | symbol): unknown {
            if (typeof method !== "string") return undefined;

            const fullMethod = `${ns}.${method}`;
            const callable = (input: unknown): Promise<unknown> =>
              transport().call(fullMethod, input);

            let ev = evCache.get(method);
            if (!ev) {
              ev = {
                on: (listener: (p: unknown) => void): (() => void) =>
                  transport().onEvent(fullMethod, listener),
              };
              evCache.set(method, ev);
            }

            // Merge event helpers onto the callable so it works as both
            // a function (query/mutation) and an event emitter.
            return Object.assign(callable, ev);
          },
        });
        nsCache.set(ns, sub);
      }
      return sub;
    },
  });
}
