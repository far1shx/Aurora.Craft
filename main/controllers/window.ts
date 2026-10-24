import { mainWindow } from "~/lib/window.ts";

export const windowController = {
  "window.min": (_: null): void => {
    mainWindow()?.minimize();
  },
  "window.close": (_: null): void => {
    mainWindow()?.close();
  },
};

export type WindowController = typeof windowController;
