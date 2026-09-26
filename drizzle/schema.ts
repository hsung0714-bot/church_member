import {
  boolean,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const members = mysqlTable(
  "members",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    cohort: int("cohort").notNull(),
    gender: mysqlEnum("gender", ["male", "female"]),
    phone: varchar("phone", { length: 32 }),
    status: mysqlEnum("status", ["active", "dormant", "transferred", "new"])
      .default("active")
      .notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("members_cohort_idx").on(table.cohort), index("members_status_idx").on(table.status)],
);

export const attendanceWeeks = mysqlTable(
  "attendance_weeks",
  {
    id: int("id").autoincrement().primaryKey(),
    serviceDate: date("serviceDate", { mode: "string" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("attendance_weeks_date_unique").on(table.serviceDate)],
);

export const attendance = mysqlTable(
  "attendance",
  {
    id: int("id").autoincrement().primaryKey(),
    weekId: int("weekId")
      .notNull()
      .references(() => attendanceWeeks.id, { onDelete: "cascade" }),
    memberId: int("memberId")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    attended: boolean("attended").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("attendance_week_member_unique").on(table.weekId, table.memberId),
    index("attendance_member_idx").on(table.memberId),
  ],
);

export type Member = typeof members.$inferSelect;
export type AttendanceWeek = typeof attendanceWeeks.$inferSelect;
export type AttendanceRecord = typeof attendance.$inferSelect;
