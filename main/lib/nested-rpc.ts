/**
 * Utility for composing nested RPC namespaces.
 *
 * Flattens `{ window: Router<{min, close}>, install: Router<{getVersionList}> }`
 * into a Router-compatible object whose route keys use dot notation:
 * `"window.min"`, `"window.close"`, `"install.getVersionList"`.
 *
 * The mirin RPC server dispatches on those dot-separated names; the companion
 * `nestedClient()` in the UI rebuilds the two-level proxy so callers write
 * `api.window.min()` instead of the flat `api["window.min"]()`.
 */

import { type Procedure, type Router, rpc } from "mirinjs/rpc";

type AnyRouter = Router<Record<string, Procedure>>;

/** Produce `{ "NS.M": Proc }` pairs for one namespace. */
type FlattenEntry<NS extends string, R extends AnyRouter> =
  R extends Router<infer T> ? { [M in keyof T & string as `${NS}.${M}`]: T[M] } : never;

/** Union of flat entry objects across all namespaces. */
type FlattenAll<T extends Record<string, AnyRouter>> = {
  [NS in keyof T & string]: FlattenEntry<NS, T[NS]>;
}[keyof T & string];

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Precise flat record type: `{ "window.min": Proc, "install.getVersionList": Proc, … }`.
 * Literal keys are preserved so `NestedClientFor` can reconstruct the hierarchy.
 */
export type FlatRoutes<T extends Record<string, AnyRouter>> = UnionToIntersection<FlattenAll<T>>;

/**
 * A router object that is structurally compatible with `Router<any>` (so it can
 * be passed to `app.serve()`) while also carrying precise literal-key types in
 * `routes` (so `typeof appController` retains them for `NestedClientFor`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface NestedRouter<T extends Record<string, AnyRouter>> extends Router<any> {
  readonly routes: FlatRoutes<T>;
}

/**
 * Build a mirin Router from a namespace → sub-router map.
 * Method names use dot notation: `"namespace.method"`.
 *
 * @example
 * ```ts
 * export const appController = nestedRouter({
 *   window:  windowController,
 *   install: installController,
 * });
 * export type AppController = typeof appController;
 * ```
 */
export function nestedRouter<T extends Record<string, AnyRouter>>(controllers: T): NestedRouter<T> {
  const flat: Record<string, Procedure> = {};
  for (const [ns, router] of Object.entries(controllers)) {
    for (const [method, proc] of Object.entries(router.routes)) {
      flat[`${ns}.${method}`] = proc as Procedure;
    }
  }
  // All values in `flat` are confirmed Procedures at runtime.
  // The cast bypasses TypeScript's inability to prove that
  // `UnionToIntersection<…>` satisfies `Record<string, Procedure>` in a
  // generic context — safe because the runtime object is exactly that.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  return rpc.router(flat as any) as unknown as NestedRouter<T>;
}
