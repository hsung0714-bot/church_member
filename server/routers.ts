import { z } from "zod";
import {
  createMember,
  deleteMember,
  getAnalyticsOverview,
  getDashboardSummary,
  getWeeklyAttendance,
  listMembers,
  saveWeeklyAttendance,
  updateMember,
} from "./db";
import { publicProcedure, router } from "./_core/trpc";

const serviceDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

const memberFields = {
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(32).nullable().optional(),
  status: z.enum(["active", "dormant", "transferred", "new"]),
  cohort: z.number().int().min(1).max(99).nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
};

export const appRouter = router({
  dashboard: router({
    summary: publicProcedure.query(() => getDashboardSummary()),
  }),
  members: router({
    list: publicProcedure.query(() => listMembers()),
    create: publicProcedure.input(z.object(memberFields)).mutation(({ input }) => createMember(input)),
    update: publicProcedure
      .input(z.object({ id: z.number().int().positive(), ...memberFields }))
      .mutation(({ input }) => updateMember(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteMember(input.id)),
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
    overview: publicProcedure
      .input(z.object({ from: serviceDate.optional(), to: serviceDate.optional() }).optional())
      .query(({ input }) => getAnalyticsOverview(input ?? {})),
  }),
});

export type AppRouter = typeof appRouter;
