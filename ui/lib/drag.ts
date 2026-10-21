import type { CSSProperties } from "react";

type DragStyle = CSSProperties & { WebkitAppRegion: "drag" | "no-drag" };

export const dragStyle: DragStyle = { WebkitAppRegion: "drag" };
export const noDragStyle: DragStyle = { WebkitAppRegion: "no-drag" };
