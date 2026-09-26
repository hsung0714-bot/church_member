import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { createSessionToken, hashPassword, verifyPassword } from "./_core/auth";
import {
  countUsers,
  createGroup,
  createMember,
  createUser,
  getAnalyticsOverview,
  getDashboardSummary,
  getUserByUsername,
  getWeeklyAttendance,
  listGroups,
  listMembersWithGroups,
  saveWeeklyAttendance,
  touchLastSignedIn,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const credentials = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(8).max(200),
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

const serviceDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

function toPublicUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? toPublicUser(opts.ctx.user) : null)),
    register: publicProcedure.input(credentials.extend({ name: z.string().trim().max(80).optional() })).mutation(async ({ ctx, input }) => {
      const existing = await getUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "이미 사용 중인 아이디입니다." });
      }

      const isFirstUser = (await countUsers()) === 0;
      const passwordHash = await hashPassword(input.password);
      const user = await createUser({
        username: input.username,
        passwordHash,
        name: input.name ?? null,
        role: isFirstUser ? "admin" : "user",
      });

      const sessionToken = await createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return toPublicUser(user);
    }),
    login: publicProcedure.input(credentials).mutation(async ({ ctx, input }) => {
      const user = await getUserByUsername(input.username);
      const invalidCredentialsError = new TRPCError({
        code: "UNAUTHORIZED",
        message: "아이디 또는 비밀번호가 올바르지 않습니다.",
      });
      if (!user) throw invalidCredentialsError;

      const passwordOk = await verifyPassword(input.password, user.passwordHash);
      if (!passwordOk) throw invalidCredentialsError;

      await touchLastSignedIn(user.id);
      const sessionToken = await createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return toPublicUser(user);
    }),
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
