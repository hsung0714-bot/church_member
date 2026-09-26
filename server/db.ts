import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
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

export async function deleteMember(id: number) {
  const db = await requireDb();
  await db.delete(members).where(eq(members.id, id));
}

export async function updateMember(input: {
  id: number;
  name: string;
  phone?: string | null;
  status: "active" | "dormant" | "transferred" | "new";
  cohort: number;
  gender?: "male" | "female" | null;
}) {
  const db = await requireDb();
  const { id, ...values } = input;
  await db.update(members).set(values).where(eq(members.id, id));
  const result = await db.select().from(members).where(eq(members.id, id)).limit(1);
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

export async function getAnalyticsOverview(range: { from?: string; to?: string } = {}) {
  const db = await requireDb();
  const [active] = await db
    .select({ value: count() })
    .from(members)
    .where(inArray(members.status, [...attendingStatuses]));
  const totalMembers = Number(active?.value ?? 0);

  const hasRange = Boolean(range.from || range.to);
  const dateConditions = [
    range.from ? gte(attendanceWeeks.serviceDate, range.from) : undefined,
    range.to ? lte(attendanceWeeks.serviceDate, range.to) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  const weeks = await db
    .select({ id: attendanceWeeks.id, serviceDate: attendanceWeeks.serviceDate })
    .from(attendanceWeeks)
    .innerJoin(attendance, eq(attendance.weekId, attendanceWeeks.id))
    .where(dateConditions.length ? and(...dateConditions) : undefined)
    .groupBy(attendanceWeeks.id, attendanceWeeks.serviceDate)
    .orderBy(desc(attendanceWeeks.serviceDate))
    .limit(hasRange ? 500 : 8);

  const orderedWeeks = [...weeks].reverse();
  const weekIds = orderedWeeks.map(week => week.id);

  const genderRows = weekIds.length
    ? await db
        .select({ weekId: attendance.weekId, gender: members.gender, present: count() })
        .from(attendance)
        .innerJoin(members, eq(attendance.memberId, members.id))
        .where(and(eq(attendance.attended, true), inArray(attendance.weekId, weekIds)))
        .groupBy(attendance.weekId, members.gender)
    : [];

  const byWeek = new Map<number, { total: number; male: number; female: number }>();
  for (const row of genderRows) {
    const bucket = byWeek.get(row.weekId) ?? { total: 0, male: 0, female: 0 };
    const value = Number(row.present);
    bucket.total += value;
    if (row.gender === "male") bucket.male += value;
    else if (row.gender === "female") bucket.female += value;
    byWeek.set(row.weekId, bucket);
  }

  const trend = orderedWeeks.map(week => {
    const bucket = byWeek.get(week.id) ?? { total: 0, male: 0, female: 0 };
    return {
      date: week.serviceDate.slice(5).replace("-", "/"),
      fullDate: week.serviceDate,
      total: bucket.total,
      male: bucket.male,
      female: bucket.female,
    };
  });

  const latestWeek = orderedWeeks[orderedWeeks.length - 1];
  return { totalMembers, trend, latestDate: latestWeek?.serviceDate ?? null };
}
