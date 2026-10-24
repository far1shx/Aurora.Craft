import { Electroview } from "electrobun/view";
import { setTransport } from "@/lib/nested-client.ts";
import type { AppRPC } from "~/lib/rpc-schema.ts";

const rpc = Electroview.defineRPC<AppRPC>({
  maxRequestTime: Number.POSITIVE_INFINITY,
  handlers: {
    requests: {},
    messages: {},
  },
});

new Electroview({ rpc });

type AnyRequest = (params: unknown) => Promise<unknown>;
type AnyMessageListener = (payload: unknown) => void;

const requests = rpc.request as unknown as Record<string, AnyRequest | undefined>;

setTransport({
  request: async (method: string, params: unknown): Promise<unknown> => {
    const request = requests[method];
    if (!request) {
      throw new Error(`Unknown RPC method: ${method}`);
    }
    return await request(params);
  },
  on: (method: string, listener: AnyMessageListener): (() => void) => {
    rpc.addMessageListener(method as never, listener as never);
    return (): void => {
      rpc.removeMessageListener(method as never, listener as never);
    };
  },
});

export { rpc };
