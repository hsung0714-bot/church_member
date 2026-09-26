import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { attendance, attendanceWeeks, members } from "../drizzle/schema";

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

export async function listMembers() {
  const db = await requireDb();
  return db.select().from(members).orderBy(members.cohort, members.name);
}

export async function createMember(input: {
  name: string;
  phone?: string | null;
  status: "active" | "dormant" | "transferred" | "new";
  cohort: number;
  gender?: "male" | "female" | null;
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
      cohort: members.cohort,
      gender: members.gender,
      attended: attendance.attended,
    })
    .from(members)
    .leftJoin(
      attendance,
      and(eq(attendance.memberId, members.id), eq(attendance.weekId, week?.id ?? 0)),
    )
    .where(inArray(members.status, [...attendingStatuses]))
    .orderBy(members.cohort, members.name);

  return {
    week,
    members: rows.map(row => ({ ...row, attended: Boolean(row.attended) })),
  };
}

export async function saveWeeklyAttendance(input: {
  serviceDate: string;
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
      })),
    )
    .onDuplicateKeyUpdate({
      set: {
        attended: sql`VALUES(${attendance.attended})`,
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

  const cohortTotals = await db
    .select({ cohort: members.cohort, total: count() })
    .from(members)
    .where(inArray(members.status, [...attendingStatuses]))
    .groupBy(members.cohort);

  const cohortPresent = new Map<number, number>();
  if (latestWeek) {
    const presentRows = await db
      .select({ cohort: members.cohort, present: count() })
      .from(attendance)
      .innerJoin(members, eq(attendance.memberId, members.id))
      .where(and(eq(attendance.weekId, latestWeek.id), eq(attendance.attended, true)))
      .groupBy(members.cohort);
    for (const row of presentRows) cohortPresent.set(row.cohort, Number(row.present));
  }

  const groupRates = cohortTotals
    .map(row => {
      const memberTotal = Number(row.total);
      const presentCount = cohortPresent.get(row.cohort) ?? 0;
      return {
        cohort: row.cohort,
        group: `${row.cohort}기`,
        total: memberTotal,
        present: presentCount,
        rate: memberTotal ? Math.round((presentCount / memberTotal) * 100) : 0,
      };
    })
    .sort((a, b) => a.cohort - b.cohort);

  return { totalMembers, trend, groupRates, latestDate: latestWeek?.serviceDate ?? null };
}
