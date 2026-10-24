import ky from "ky";

export const http = ky.create({
  timeout: 15_000,
  fetch: (input: Request, init: RequestInit | undefined) => {
    return fetch(input, {
      ...init,
      // proxy: "http://127.0.0.1:10808",
    });
  },
});

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
