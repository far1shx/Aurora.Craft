import { FFIType, dlopen } from "bun:ffi";
import { defineConfig } from "mirinjs/config";

function getDpiScale(): number {
  if (process.platform !== "win32") return 1;
  try {
    const user32 = dlopen("user32.dll", {
      SetProcessDpiAwarenessContext: { args: [FFIType.i64], returns: FFIType.bool },
      GetDpiForSystem: { args: [], returns: FFIType.u32 },
    });
    user32.symbols.SetProcessDpiAwarenessContext(-4n);
    const dpi = user32.symbols.GetDpiForSystem();
    return dpi > 0 ? dpi / 96 : 1;
  } catch {
    return 1;
  }
}

const scale = getDpiScale();

const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 500;
const LOGICAL_MIN_WIDTH = 700;
const LOGICAL_MIN_HEIGHT = 460;

export default defineConfig({
  id: "cn.far1sh.aurora.craft",
  name: "aurora.craft",
  main: "main/main.ts",
  icon: "ui/assets/icon.png",

  windows: {
    main: {
      title: "Aurora Craft",
      width: Math.round(LOGICAL_WIDTH * scale),
      height: Math.round(LOGICAL_HEIGHT * scale),
      minWidth: Math.round(LOGICAL_MIN_WIDTH * scale),
      minHeight: Math.round(LOGICAL_MIN_HEIGHT * scale),
      titleBarStyle: "hiddenInset",
      url: "app://ui/index.html",
      show: "ready",
    },
  },
});
