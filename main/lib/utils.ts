import type { EventProc, MutationProc, QueryProc } from "mirinjs/rpc";

export type QueryInput<T> = T extends QueryProc<infer TInput, infer _TOutput> ? TInput : never;

export type MutationInput<T> =
  T extends MutationProc<infer TInput, infer _TOutput> ? TInput : never;

export type EventPayload<T> = T extends EventProc<infer TInput> ? TInput : never;

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  }

  if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
  }

  return `${bytesPerSecond.toFixed(0)} B/s`;
}

export function platform(): "windows" | "osx" | "linux" | undefined {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "osx";
    case "linux":
      return "linux";
    default:
      return undefined;
  }
}
