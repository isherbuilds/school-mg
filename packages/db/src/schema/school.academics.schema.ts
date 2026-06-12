import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { member, organization } from "#@/schema/auth.schema";
import { students } from "#@/schema/school.people.schema";
import {
  enrollmentStatusEnum,
  schoolShiftEnum,
  staffAssignmentRoleEnum,
  termKindEnum,
  timestamps
} from "#@/schema/school.shared";

export const academicYears = pgTable(
  "academic_years",
  {
    endDate: date("end_date").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isCurrent: boolean("is_current").default(false).notNull(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    ...timestamps()
  },
  (table) => [
    index("academic_years_organization_idx").on(table.organizationId),
    uniqueIndex("academic_years_current_uidx")
      .on(table.organizationId)
      .where(sql`${table.isCurrent} = true`),
    uniqueIndex("academic_years_name_uidx").on(table.organizationId, table.name),
    uniqueIndex("academic_years_org_id_uidx").on(table.organizationId, table.id),
    check("academic_years_date_order_chk", sql`${table.startDate} <= ${table.endDate}`)
  ]
);

export const academicTerms = pgTable(
  "academic_terms",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    endDate: date("end_date").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    kind: termKindEnum("kind").default("custom").notNull(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    startDate: date("start_date").notNull(),
    ...timestamps()
  },
  (table) => [
    index("academic_terms_year_idx").on(table.organizationId, table.academicYearId),
    uniqueIndex("academic_terms_name_uidx").on(
      table.organizationId,
      table.academicYearId,
      table.name
    ),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "academic_terms_year_org_fk"
    }).onDelete("cascade"),
    check("academic_terms_date_order_chk", sql`${table.startDate} <= ${table.endDate}`)
  ]
);

export const gradeLevels = pgTable(
  "grade_levels",
  {
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps()
  },
  (table) => [
    uniqueIndex("grade_levels_code_uidx").on(table.organizationId, table.code),
    uniqueIndex("grade_levels_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("grade_levels_name_uidx").on(table.organizationId, table.name)
  ]
);

export const sections = pgTable(
  "sections",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    capacity: integer("capacity"),
    code: text("code").notNull(),
    gradeLevelId: uuid("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    shift: schoolShiftEnum("shift").default("full_day").notNull(),
    ...timestamps()
  },
  (table) => [
    index("sections_grade_idx").on(table.organizationId, table.gradeLevelId),
    index("sections_year_idx").on(table.organizationId, table.academicYearId),
    uniqueIndex("sections_attendance_scope_uidx").on(
      table.organizationId,
      table.id,
      table.academicYearId
    ),
    uniqueIndex("sections_code_uidx").on(table.organizationId, table.academicYearId, table.code),
    uniqueIndex("sections_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("sections_org_tuple_uidx").on(
      table.organizationId,
      table.id,
      table.academicYearId,
      table.gradeLevelId
    ),
    uniqueIndex("sections_name_uidx").on(
      table.organizationId,
      table.academicYearId,
      table.gradeLevelId,
      table.name
    ),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "sections_year_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.gradeLevelId],
      foreignColumns: [gradeLevels.organizationId, gradeLevels.id],
      name: "sections_grade_org_fk"
    }).onDelete("cascade")
  ]
);

export const subjects = pgTable(
  "subjects",
  {
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isCore: boolean("is_core").default(true).notNull(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    shortName: text("short_name"),
    ...timestamps()
  },
  (table) => [
    uniqueIndex("subjects_code_uidx").on(table.organizationId, table.code),
    uniqueIndex("subjects_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("subjects_name_uidx").on(table.organizationId, table.name)
  ]
);

export const studentEnrollments = pgTable(
  "student_enrollments",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    endDate: date("end_date"),
    gradeLevelId: uuid("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    rollNumber: text("roll_number"),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    status: enrollmentStatusEnum("status").default("enrolled").notNull(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("student_enrollments_section_idx").on(table.organizationId, table.sectionId),
    index("student_enrollments_student_idx").on(table.organizationId, table.studentId),
    uniqueIndex("student_enrollments_attendance_scope_uidx").on(
      table.organizationId,
      table.sectionId,
      table.academicYearId,
      table.id
    ),
    uniqueIndex("student_enrollments_open_uidx")
      .on(table.organizationId, table.studentId)
      .where(sql`${table.endDate} IS NULL AND ${table.status} = 'enrolled'`),
    uniqueIndex("student_enrollments_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("student_enrollments_roll_uidx").on(
      table.organizationId,
      table.sectionId,
      table.rollNumber
    ),
    check(
      "student_enrollments_date_order_chk",
      sql`${table.endDate} IS NULL OR ${table.startDate} <= ${table.endDate}`
    ),
    foreignKey({
      columns: [table.organizationId, table.sectionId, table.academicYearId, table.gradeLevelId],
      foreignColumns: [
        sections.organizationId,
        sections.id,
        sections.academicYearId,
        sections.gradeLevelId
      ],
      name: "student_enrollments_section_tuple_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.studentId],
      foreignColumns: [students.organizationId, students.id],
      name: "student_enrollments_student_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "student_enrollments_year_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.gradeLevelId],
      foreignColumns: [gradeLevels.organizationId, gradeLevels.id],
      name: "student_enrollments_grade_org_fk"
    }).onDelete("cascade")
  ]
);

export const subjectOfferings = pgTable(
  "subject_offerings",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    code: text("code"),
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("subject_offerings_section_idx").on(table.organizationId, table.sectionId),
    uniqueIndex("subject_offerings_assignment_scope_uidx").on(
      table.organizationId,
      table.academicYearId,
      table.id
    ),
    uniqueIndex("subject_offerings_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("subject_offerings_timetable_scope_uidx").on(
      table.organizationId,
      table.sectionId,
      table.academicYearId,
      table.id
    ),
    uniqueIndex("subject_offerings_unique_uidx").on(
      table.organizationId,
      table.academicYearId,
      table.sectionId,
      table.subjectId
    ),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "subject_offerings_year_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.sectionId, table.academicYearId],
      foreignColumns: [sections.organizationId, sections.id, sections.academicYearId],
      name: "subject_offerings_section_scope_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.subjectId],
      foreignColumns: [subjects.organizationId, subjects.id],
      name: "subject_offerings_subject_org_fk"
    }).onDelete("cascade")
  ]
);

export const staffAssignments = pgTable(
  "staff_assignments",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    active: boolean("active").default(true).notNull(),
    endDate: date("end_date"),
    gradeLevelId: uuid("grade_level_id").references(() => gradeLevels.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: staffAssignmentRoleEnum("role").notNull(),
    sectionId: uuid("section_id").references(() => sections.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    startDate: date("start_date"),
    subjectOfferingId: uuid("subject_offering_id").references(() => subjectOfferings.id, {
      onDelete: "cascade"
    }),
    ...timestamps()
  },
  (table) => [
    index("staff_assignments_grade_idx").on(table.organizationId, table.gradeLevelId),
    index("staff_assignments_section_idx").on(table.organizationId, table.sectionId),
    index("staff_assignments_member_idx").on(table.organizationId, table.memberId),
    uniqueIndex("staff_assignments_grade_scope_uidx")
      .on(
        table.organizationId,
        table.academicYearId,
        table.memberId,
        table.role,
        table.gradeLevelId
      )
      .where(sql`${table.active} = true AND ${table.gradeLevelId} IS NOT NULL`),
    uniqueIndex("staff_assignments_section_scope_uidx")
      .on(table.organizationId, table.academicYearId, table.memberId, table.role, table.sectionId)
      .where(sql`${table.active} = true AND ${table.sectionId} IS NOT NULL`),
    uniqueIndex("staff_assignments_subject_scope_uidx")
      .on(
        table.organizationId,
        table.academicYearId,
        table.memberId,
        table.role,
        table.subjectOfferingId
      )
      .where(sql`${table.active} = true AND ${table.subjectOfferingId} IS NOT NULL`),
    check(
      "staff_assignments_scope_chk",
      sql`num_nonnulls(${table.gradeLevelId}, ${table.sectionId}, ${table.subjectOfferingId}) = 1`
    ),
    check(
      "staff_assignments_date_order_chk",
      sql`${table.endDate} IS NULL OR ${table.startDate} IS NULL OR ${table.startDate} <= ${table.endDate}`
    ),
    foreignKey({
      columns: [table.organizationId, table.academicYearId],
      foreignColumns: [academicYears.organizationId, academicYears.id],
      name: "staff_assignments_year_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.memberId],
      foreignColumns: [member.organizationId, member.id],
      name: "staff_assignments_member_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.gradeLevelId],
      foreignColumns: [gradeLevels.organizationId, gradeLevels.id],
      name: "staff_assignments_grade_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.sectionId, table.academicYearId],
      foreignColumns: [sections.organizationId, sections.id, sections.academicYearId],
      name: "staff_assignments_section_scope_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.academicYearId, table.subjectOfferingId],
      foreignColumns: [
        subjectOfferings.organizationId,
        subjectOfferings.academicYearId,
        subjectOfferings.id
      ],
      name: "staff_assignments_subject_offering_scope_fk"
    }).onDelete("cascade")
  ]
);
