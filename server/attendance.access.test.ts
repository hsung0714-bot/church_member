import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createNonAdminContext(): TrpcContext {
  return {
    user: {
      id: 42,
      username: "ordinary-member",
      passwordHash: "irrelevant",
      email: "member@example.com",
      name: "Ordinary Member",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("attendance administration access", () => {
  it("blocks ordinary authenticated users from reading member records", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(caller.members.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks ordinary authenticated users from writing weekly attendance", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.attendance.save({
        serviceDate: "2026-09-27",
        records: [{ memberId: 1, attended: true }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
