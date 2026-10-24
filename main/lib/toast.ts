import type { AppMessages } from "~/lib/rpc-schema.ts";

export interface ToastSender {
  send: {
    "event.toast": (payload: AppMessages["event.toast"]) => void;
  };
}

export function toast(rpc: ToastSender, options: AppMessages["event.toast"]): void {
  rpc.send["event.toast"](options);
}
