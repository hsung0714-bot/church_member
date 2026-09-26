import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  attendance,
  attendanceWeeks,
  churchGroups,
  InsertUser,
  members,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listGroups() {
  const db = await requireDb();
  return db.select().from(churchGroups).orderBy(churchGroups.name);
}

export async function createGroup(input: { code: string; name: string }) {
  const db = await requireDb();
  await db
    .insert(churchGroups)
    .values(input)
    .onDuplicateKeyUpdate({ set: { name: input.name } });
  const result = await db
    .select()
    .from(churchGroups)
    .where(eq(churchGroups.code, input.code))
    .limit(1);
  return result[0]!;
}

export async function listMembersWithGroups() {
  const db = await requireDb();
  return db
    .select({
      id: members.id,
      name: members.name,
      phone: members.phone,
      status: members.status,
      joinedAt: members.joinedAt,
      groupId: churchGroups.id,
      groupCode: churchGroups.code,
      groupName: churchGroups.name,
    })
    .from(members)
    .leftJoin(churchGroups, eq(members.groupId, churchGroups.id))
    .orderBy(churchGroups.name, members.name);
}

export async function createMember(input: {
  name: string;
  phone?: string | null;
  status: "active" | "dormant" | "transferred" | "new";
  groupId: number;
}) {
  const db = await requireDb();
  await db.insert(members).values(input);
  const result = await db.select().from(members).orderBy(desc(members.id)).limit(1);
  return result[0]!;
}

async function ensureWeek(serviceDate: string) {
  const db = await requireDb();
  await db
    .insert(attendanceWeeks)
    .values({ serviceDate })
    .onDuplicateKeyUpdate({ set: { serviceDate } });
  const result = await db
    .select()
    .from(attendanceWeeks)
    .where(eq(attendanceWeeks.serviceDate, serviceDate))
    .limit(1);
  return result[0]!;
}

const attendingStatuses = ["active", "new"] as const;

export async function getWeeklyAttendance(serviceDate: string) {
  const db = await requireDb();
  const weeks = await db
    .select()
    .from(attendanceWeeks)
    .where(eq(attendanceWeeks.serviceDate, serviceDate))
    .limit(1);
  const week = weeks[0];
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      phone: members.phone,
      status: members.status,
      groupId: churchGroups.id,
      groupCode: churchGroups.code,
      groupName: churchGroups.name,
      attended: attendance.attended,
    })
    .from(members)
    .leftJoin(churchGroups, eq(members.groupId, churchGroups.id))
    .leftJoin(
      attendance,
      and(eq(attendance.memberId, members.id), eq(attendance.weekId, week?.id ?? 0)),
    )
    .where(inArray(members.status, [...attendingStatuses]))
    .orderBy(churchGroups.name, members.name);

  return {
    week,
    members: rows.map(row => ({ ...row, attended: Boolean(row.attended) })),
  };
}

export async function saveWeeklyAttendance(input: {
  serviceDate: string;
  recordedBy: number;
  records: { memberId: number; attended: boolean }[];
}) {
  const db = await requireDb();
  const week = await ensureWeek(input.serviceDate);
  if (!input.records.length) return { updated: 0 };

  await db
    .insert(attendance)
    .values(
      input.records.map(record => ({
        weekId: week.id,
        memberId: record.memberId,
        attended: record.attended,
        recordedBy: input.recordedBy,
      })),
    )
    .onDuplicateKeyUpdate({
      set: {
        attended: sql`VALUES(${attendance.attended})`,
        recordedBy: input.recordedBy,
        updatedAt: new Date(),
      },
    });
  return { updated: input.records.length };
}

export async function getDashboardSummary() {
  const db = await requireDb();
  const [memberCount] = await db
    .select({ value: count() })
    .from(members)
    .where(inArray(members.status, [...attendingStatuses]));
  const latest = await db
    .select({ id: attendanceWeeks.id, serviceDate: attendanceWeeks.serviceDate })
    .from(attendanceWeeks)
    .innerJoin(attendance, eq(attendance.weekId, attendanceWeeks.id))
    .groupBy(attendanceWeeks.id, attendanceWeeks.serviceDate)
    .orderBy(desc(attendanceWeeks.serviceDate))
    .limit(1);
  const latestWeek = latest[0];
  if (!latestWeek) {
    return { totalMembers: Number(memberCount?.value ?? 0), present: 0, rate: 0, serviceDate: null };
  }
  const [present] = await db
    .select({ value: count() })
    .from(attendance)
    .where(and(eq(attendance.weekId, latestWeek.id), eq(attendance.attended, true)));
  const totalMembers = Number(memberCount?.value ?? 0);
  const presentCount = Number(present?.value ?? 0);
  return {
    totalMembers,
    present: presentCount,
    rate: totalMembers ? Math.round((presentCount / totalMembers) * 100) : 0,
    serviceDate: latestWeek.serviceDate,
  };
}

export async function getAnalyticsOverview() {
  const db = await requireDb();
  const groups = await listGroups();
  const [active] = await db
    .select({ value: count() })
    .from(members)
    .where(inArray(members.status, [...attendingStatuses]));
  const totalMembers = Number(active?.value ?? 0);
  const weeks = await db
    .select({ id: attendanceWeeks.id, serviceDate: attendanceWeeks.serviceDate })
    .from(attendanceWeeks)
    .innerJoin(attendance, eq(attendance.weekId, attendanceWeeks.id))
    .groupBy(attendanceWeeks.id, attendanceWeeks.serviceDate)
    .orderBy(desc(attendanceWeeks.serviceDate))
    .limit(8);

  const trend = await Promise.all(
    [...weeks].reverse().map(async week => {
      const [present] = await db
        .select({ value: count() })
        .from(attendance)
        .where(and(eq(attendance.weekId, week.id), eq(attendance.attended, true)));
      const presentCount = Number(present?.value ?? 0);
      return {
        date: week.serviceDate.slice(5).replace("-", "/"),
        fullDate: week.serviceDate,
        present: presentCount,
        rate: totalMembers ? Math.round((presentCount / totalMembers) * 100) : 0,
      };
    }),
  );

  const latestWeek = weeks[0];
  const groupRates = await Promise.all(
    groups.map(async group => {
      const [total] = await db
        .select({ value: count() })
        .from(members)
        .where(and(eq(members.groupId, group.id), inArray(members.status, [...attendingStatuses])));
      const memberTotal = Number(total?.value ?? 0);
      let presentCount = 0;
      if (latestWeek) {
        const [present] = await db
          .select({ value: count() })
          .from(attendance)
          .innerJoin(members, eq(attendance.memberId, members.id))
          .where(
            and(
              eq(attendance.weekId, latestWeek.id),
              eq(attendance.attended, true),
              eq(members.groupId, group.id),
            ),
          );
        presentCount = Number(present?.value ?? 0);
      }
      return {
        groupId: group.id,
        group: group.name,
        total: memberTotal,
        present: presentCount,
        rate: memberTotal ? Math.round((presentCount / memberTotal) * 100) : 0,
      };
    }),
  );

  return { totalMembers, trend, groupRates, latestDate: latestWeek?.serviceDate ?? null };
}
