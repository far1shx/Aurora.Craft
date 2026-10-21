import { rpc } from "mirinjs/rpc";

export const eventController = rpc.router({
  task: rpc.event<{
    id: string;
    progress: number;
    expand?: string;
    detail?: string;
    status: "running" | "done" | "error";
  }>(),
  toast: rpc.event<{
    title: string;
    description?: string;
    type?: "success" | "info" | "warning" | "error";
  }>(),
});

export type EventController = typeof eventController;
