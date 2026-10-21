import { proxy } from "valtio";
import type { api } from "@/lib/controller.ts";

export const task = proxy({
  sheet: {
    open: false,
  },

  list: [] as (Parameters<Parameters<typeof api.event.task.on>[0]>[0] & {
    title: string;
  })[],

  add(title: string): (typeof task.list)[number] {
    const item = proxy<(typeof task.list)[number]>({
      id: crypto.randomUUID(),
      title,
      progress: 0,
      status: "running",
    });

    this.list.unshift(item);

    return item;
  },

  remove(id: string): void {
    const index = this.list.findIndex((t) => t.id === id);

    if (index !== -1) {
      this.list.splice(index, 1);
    }
  },

  clean(): void {
    task.list = task.list.filter((t) => t.status !== "done");
  },

  get overview(): {
    progress: number;
    running: number;
    done: number;
    error: number;
  } {
    const runningTasks = this.list.filter((t) => t.status === "running");

    return {
      progress:
        runningTasks.length === 0
          ? 0
          : runningTasks.reduce((sum, t) => sum + t.progress, 0) / runningTasks.length,

      running: this.list.filter((t) => t.status === "running").length,
      done: this.list.filter((t) => t.status === "done").length,
      error: this.list.filter((t) => t.status === "error").length,
    };
  },
});
