import { app } from "mirinjs";
import type { EventController } from "~/controllers/event.ts";
import type { EventPayload } from "~/lib/utils.ts";

export function toast(options: EventPayload<EventController["routes"]["toast"]>): void {
  app.rpc["event.toast"]?.broadcast({
    ...options,
  });
}
