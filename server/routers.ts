import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
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
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

const serviceDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    summary: adminProcedure.query(() => getDashboardSummary()),
  }),
  groups: router({
    list: adminProcedure.query(() => listGroups()),
    create: adminProcedure
      .input(z.object({ code: z.string().trim().min(1).max(32), name: z.string().trim().min(1).max(80) }))
      .mutation(({ input }) => createGroup(input)),
  }),
  members: router({
    list: adminProcedure.query(() => listMembersWithGroups()),
    create: adminProcedure
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
    getWeek: adminProcedure.input(z.object({ serviceDate })).query(({ input }) => getWeeklyAttendance(input.serviceDate)),
    save: adminProcedure
      .input(
        z.object({
          serviceDate,
          records: z.array(z.object({ memberId: z.number().int().positive(), attended: z.boolean() })).max(1000),
        }),
      )
      .mutation(({ ctx, input }) =>
        saveWeeklyAttendance({ ...input, recordedBy: ctx.user.id }),
      ),
  }),
  analytics: router({
    overview: adminProcedure.query(() => getAnalyticsOverview()),
  }),
});

export type AppRouter = typeof appRouter;
