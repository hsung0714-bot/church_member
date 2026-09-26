import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("input validation", () => {
  it("rejects a malformed service date", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.attendance.save({
        serviceDate: "2026/09/27",
        records: [],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an empty group code", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.groups.create({ code: "", name: "07기" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
