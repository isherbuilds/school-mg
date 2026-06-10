import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";
import {
  academicYears,
  sections,
  studentEnrollments,
  subjectOfferings
} from "#@/schema/school.academics.schema";
import { schoolActors } from "#@/schema/school.people.schema";
import {
  attendanceStatusEnum,
  calendarAttendanceBehaviorEnum,
  calendarEventTypeEnum,
  timestamps,
  weekdayEnum
} from "#@/schema/school.shared";

export const calendarEvents = pgTable(
  "calendar_events",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    attendanceBehavior: calendarAttendanceBehaviorEnum("attendance_behavior")
      .default("attendance_not_expected")
      .notNull(),
    description: text("description"),
    endDate: date("end_date").notNull(),
    eventType: calendarEventTypeEnum("event_type").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    title: text("title").notNull(),
    ...timestamps()
  },
  (table) => [
    index("calendar_events_organization_start_idx").on(table.organizationId, table.startDate),
    uniqueIndex("calendar_events_org_id_uidx").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "calendar_events_year_org_fk"
    }).onDelete("cascade"),
    check("calendar_events_date_order_chk", sql`${table.startDate} <= ${table.endDate}`)
  ]
);

export const timetableSlots = pgTable(
  "timetable_slots",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    endMinute: integer("end_minute").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    roomLabel: text("room_label"),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(),
    startMinute: integer("start_minute").notNull(),
    subjectOfferingId: uuid("subject_offering_id")
      .notNull()
      .references(() => subjectOfferings.id, { onDelete: "cascade" }),
    teacherActorId: uuid("teacher_actor_id").references(() => schoolActors.id),
    weekday: weekdayEnum("weekday").notNull(),
    ...timestamps()
  },
  (table) => [
    index("timetable_slots_section_idx").on(table.organizationId, table.sectionId),
    index("timetable_slots_teacher_idx").on(table.organizationId, table.teacherActorId),
    uniqueIndex("timetable_slots_section_slot_uidx").on(
      table.organizationId,
      table.sectionId,
      table.weekday,
      table.slotIndex
    ),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "timetable_slots_year_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.sectionId, table.academicYearId],
      foreignColumns: [sections.organizationId, sections.id, sections.academicYearId],
      name: "timetable_slots_section_scope_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [
        table.organizationId,
        table.sectionId,
        table.academicYearId,
        table.subjectOfferingId
      ],
      foreignColumns: [
        subjectOfferings.organizationId,
        subjectOfferings.sectionId,
        subjectOfferings.academicYearId,
        subjectOfferings.id
      ],
      name: "timetable_slots_subject_offering_scope_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.teacherActorId],
      foreignColumns: [schoolActors.organizationId, schoolActors.id],
      name: "timetable_slots_teacher_actor_org_fk"
    }),
    check("timetable_slots_time_order_chk", sql`${table.startMinute} < ${table.endMinute}`),
    check(
      "timetable_slots_time_bounds_chk",
      sql`${table.startMinute} >= 0 AND ${table.endMinute} <= 1440`
    )
  ]
);

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    calendarEventId: uuid("calendar_event_id").references(() => calendarEvents.id),
    id: uuid("id").defaultRandom().primaryKey(),
    lockedAt: timestamp("locked_at"),
    notes: text("notes"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    takenByActorId: uuid("taken_by_actor_id").references(() => schoolActors.id),
    ...timestamps()
  },
  (table) => [
    index("attendance_sessions_section_date_idx").on(
      table.organizationId,
      table.sectionId,
      table.attendanceDate
    ),
    uniqueIndex("attendance_sessions_record_scope_uidx").on(
      table.organizationId,
      table.sectionId,
      table.academicYearId,
      table.id
    ),
    uniqueIndex("attendance_sessions_section_date_uidx").on(
      table.organizationId,
      table.sectionId,
      table.attendanceDate
    ),
    foreignKey({
      columns: [table.organizationId, table.calendarEventId],
      foreignColumns: [calendarEvents.organizationId, calendarEvents.id],
      name: "attendance_sessions_calendar_event_org_fk"
    }),
    foreignKey({
      columns: [table.organizationId, table.takenByActorId],
      foreignColumns: [schoolActors.organizationId, schoolActors.id],
      name: "attendance_sessions_taken_by_actor_org_fk"
    }),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "attendance_sessions_year_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.sectionId, table.academicYearId],
      foreignColumns: [sections.organizationId, sections.id, sections.academicYearId],
      name: "attendance_sessions_section_scope_fk"
    }).onDelete("cascade")
  ]
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    academicYearId: uuid("academic_year_id").notNull(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => studentEnrollments.id, { onDelete: "cascade" }),
    markedAt: timestamp("marked_at").defaultNow().notNull(),
    markedByActorId: uuid("marked_by_actor_id").references(() => schoolActors.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    remark: text("remark"),
    sectionId: uuid("section_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").default("present").notNull()
  },
  (table) => [
    primaryKey({
      columns: [table.sessionId, table.enrollmentId],
      name: "attendance_records_pk"
    }),
    index("attendance_records_enrollment_idx").on(table.organizationId, table.enrollmentId),
    foreignKey({
      columns: [table.organizationId, table.markedByActorId],
      foreignColumns: [schoolActors.organizationId, schoolActors.id],
      name: "attendance_records_marked_by_actor_org_fk"
    }),
    foreignKey({
      columns: [table.organizationId, table.sectionId, table.academicYearId, table.sessionId],
      foreignColumns: [
        attendanceSessions.organizationId,
        attendanceSessions.sectionId,
        attendanceSessions.academicYearId,
        attendanceSessions.id
      ],
      name: "attendance_records_session_scope_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.sectionId, table.academicYearId, table.enrollmentId],
      foreignColumns: [
        studentEnrollments.organizationId,
        studentEnrollments.sectionId,
        studentEnrollments.academicYearId,
        studentEnrollments.id
      ],
      name: "attendance_records_enrollment_scope_fk"
    }).onDelete("cascade")
  ]
);
