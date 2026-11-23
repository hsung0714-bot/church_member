import { z } from "zod";
import {
  createMember,
  deleteMember,
  getAnalyticsOverview,
  getDashboardSummary,
  getMemberAttendanceRates,
  getWeeklyAttendance,
  listMembers,
  saveWeeklyAttendance,
  updateMember,
} from "./db";
import { TRPCError } from "@trpc/server";
import {
  createSessionToken,
  passwordMatches,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "./_core/auth";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkLoginRateLimit(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return;
  }
  entry.count += 1;
  if (entry.count > 10) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "잠시 후 다시 시도해 주세요." });
  }
}

const serviceDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

const memberFields = {
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(32).nullable().optional(),
  status: z.enum(["active", "dormant", "transferred", "new"]),
  cohort: z.number().int().min(1).max(99).nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
};

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ({ authed: ctx.authed })),
    login: publicProcedure
      .input(z.object({ password: z.string().min(1).max(200) }))
      .mutation(({ ctx, input }) => {
        checkLoginRateLimit(ctx.req.ip ?? "unknown");
        if (!process.env.ADMIN_PASSWORD) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ADMIN_PASSWORD가 설정되지 않았습니다." });
        }
        if (!passwordMatches(input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "비밀번호가 올바르지 않습니다." });
        }
        const { token, maxAge } = createSessionToken();
        ctx.res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(ctx.req), maxAge });
        return { authed: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(SESSION_COOKIE, sessionCookieOptions(ctx.req));
      return { authed: false };
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(() => getDashboardSummary()),
  }),
  members: router({
    list: protectedProcedure.query(() => listMembers()),
    create: protectedProcedure.input(z.object(memberFields)).mutation(({ input }) => createMember(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ...memberFields }))
      .mutation(({ input }) => updateMember(input)),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteMember(input.id)),
  }),
  attendance: router({
    getWeek: protectedProcedure.input(z.object({ serviceDate })).query(({ input }) => getWeeklyAttendance(input.serviceDate)),
    save: protectedProcedure
      .input(
        z.object({
          serviceDate,
          records: z.array(z.object({ memberId: z.number().int().positive(), attended: z.boolean() })).max(1000),
        }),
      )
      .mutation(({ input }) => saveWeeklyAttendance(input)),
  }),
  analytics: router({
    overview: protectedProcedure
      .input(z.object({ from: serviceDate.optional(), to: serviceDate.optional() }).optional())
      .query(({ input }) => getAnalyticsOverview(input ?? {})),
    memberRates: protectedProcedure
      .input(z.object({ from: serviceDate, to: serviceDate }))
      .query(({ input }) => getMemberAttendanceRates(input.from, input.to)),
  }),
});

export type AppRouter = typeof appRouter;
