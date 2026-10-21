import { type WindowHandle, app } from "mirinjs";
import { rpc } from "mirinjs/rpc";

function callerWindow(webview: number): WindowHandle | undefined {
  return app.windows.byId(webview);
}

export const windowController = rpc.router({
  min: rpc.mutation((_: null, ctx) => callerWindow(ctx.webview)?.minimize()),
  close: rpc.mutation((_: null) => app.quit()),
});

export type WindowController = typeof windowController;
