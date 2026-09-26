import { z } from "zod";
import {
  createGroup,
  createMember,
  getAnalyticsOverview,
  getDashboardSummary,
  getWeeklyAttendance,
  listGroups,
  listMembersWithGroups,
  saveWeeklyAttendance,
} from "./db";
import { publicProcedure, router } from "./_core/trpc";

const serviceDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

export const appRouter = router({
  dashboard: router({
    summary: publicProcedure.query(() => getDashboardSummary()),
  }),
  groups: router({
    list: publicProcedure.query(() => listGroups()),
    create: publicProcedure
      .input(z.object({ code: z.string().trim().min(1).max(32), name: z.string().trim().min(1).max(80) }))
      .mutation(({ input }) => createGroup(input)),
  }),
  members: router({
    list: publicProcedure.query(() => listMembersWithGroups()),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(80),
          phone: z.string().trim().max(32).nullable().optional(),
          status: z.enum(["active", "dormant", "transferred", "new"]),
          groupId: z.number().int().positive(),
        }),
      )
      .mutation(({ input }) => createMember(input)),
  }),
  attendance: router({
    getWeek: publicProcedure.input(z.object({ serviceDate })).query(({ input }) => getWeeklyAttendance(input.serviceDate)),
    save: publicProcedure
      .input(
        z.object({
          serviceDate,
          records: z.array(z.object({ memberId: z.number().int().positive(), attended: z.boolean() })).max(1000),
        }),
      )
      .mutation(({ input }) => saveWeeklyAttendance(input)),
  }),
  analytics: router({
    overview: publicProcedure.query(() => getAnalyticsOverview()),
  }),
});

export type AppRouter = typeof appRouter;
