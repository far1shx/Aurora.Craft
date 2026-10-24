/**
 * Typed nested RPC client for dot-namespaced routes.
 *
 * The transport (Electroview-backed) is injected once at app bootstrap; this
 * module only turns flat `"namespace.method"` keys into a two-level proxy so
 * callers can write `api.window.min(null)` / `api.event.task.on(cb)`.
 *
 * Usage (UI code only — never import server handler values):
 * ```ts
 * import { api } from "@/lib/controller.ts";
 * await api.window.min(null);
 * api.event.task.on((update) => { ... });
 * ```
 */

import type { AppMessages, AppRequests } from "~/lib/rpc-schema.ts";

// ── Type helpers ──────────────────────────────────────────────────────────────

/** Extract the namespace prefix from a `"NS.method"` key. */
type Namespace<K extends string> = K extends `${infer NS}.${string}` ? NS : never;

/** Extract the method suffix for a given namespace from a `"NS.method"` key. */
type MethodOf<K extends string, NS extends string> = K extends `${NS}.${infer M}` ? M : never;

/** Convert a single request schema entry to its client-callable shape. */
type RequestToClient<T> = T extends { params: infer I; response: infer O }
  ? (input: I) => Promise<Awaited<O>>
  : never;

/** Convert a single message schema entry to its client-listener shape. */
type MessageToClient<T> = { on(listener: (payload: T) => void): () => void };

type RequestKeys = keyof AppRequests & string;
type MessageKeys = keyof AppMessages & string;

/**
 * Two-level client type for requests:
 * `{ window: { min: (input: null) => Promise<void>, ... }, ... }`
 */
type RequestClient = {
  [NS in Namespace<RequestKeys>]: {
    [M in MethodOf<RequestKeys, NS>]: `${NS}.${M}` extends keyof AppRequests
      ? RequestToClient<AppRequests[`${NS}.${M}`]>
      : never;
  };
};

/**
 * Two-level client type for event subscriptions:
 * `{ event: { task: { on(l) { ... } }, toast: { on(l) { ... } } } }`
 */
type MessageClient = {
  [NS in Namespace<MessageKeys>]: {
    [M in MethodOf<MessageKeys, NS>]: `${NS}.${M}` extends keyof AppMessages
      ? MessageToClient<AppMessages[`${NS}.${M}`]>
      : never;
  };
};

/** Combined client type — requests and messages merged. */
export type NestedClient = RequestClient & MessageClient;

// ── Runtime ───────────────────────────────────────────────────────────────────

/** Minimal transport the Electroview bootstrap must provide. */
export interface RpcTransport {
  request(method: string, params: unknown): Promise<unknown>;
  on(method: string, listener: (payload: unknown) => void): () => void;
}

let _transport: RpcTransport | undefined;

export function setTransport(transport: RpcTransport): void {
  _transport = transport;
}

function transport(): RpcTransport {
  if (!_transport) {
    throw new Error(
      "RPC transport not initialized — import @/lib/rpc.ts before using the api client.",
    );
  }
  return _transport;
}

/**
 * Create the typed two-level RPC client.
 *
 * `setTransport()` must have been called before the first request.
 */
export function nestedClient(): NestedClient {
  const namespaceCache = new Map<string, object>();

  return new Proxy({} as NestedClient, {
    get(_target: NestedClient, namespace: string | symbol): unknown {
      if (typeof namespace !== "string") return undefined;

      let sub = namespaceCache.get(namespace);
      if (!sub) {
        // 同时缓存事件订阅方法与 query/mutation 方法，保证对象引用稳定
        const eventCache = new Map<
          string,
          { on(listener: (payload: unknown) => void): () => void }
        >();

        sub = new Proxy({} as Record<string, unknown>, {
          get(_t: Record<string, unknown>, method: string | symbol): unknown {
            if (typeof method !== "string") return undefined;

            const fullMethod = `${namespace}.${method}`;
            const callable = (input: unknown): Promise<unknown> =>
              transport().request(fullMethod, input);

            let event = eventCache.get(method);
            if (!event) {
              event = {
                on: (listener: (payload: unknown) => void): (() => void) =>
                  transport().on(fullMethod, listener),
              };
              eventCache.set(method, event);
            }

            // 让同一个属性既能当函数调用（query/mutation），又能当事件订阅器
            return Object.assign(callable, event);
          },
        });
        namespaceCache.set(namespace, sub);
      }
      return sub;
    },
  });
}
