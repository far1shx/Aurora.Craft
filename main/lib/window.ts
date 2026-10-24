import type { BrowserWindow } from "electrobun/main";

let current: BrowserWindow | undefined;

export function setMainWindow(window: BrowserWindow): void {
  current = window;
}

export function mainWindow(): BrowserWindow | undefined {
  return current;
}
