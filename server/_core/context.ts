import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { isAuthenticated } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  authed: boolean;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    authed: isAuthenticated(opts.req),
  };
}
