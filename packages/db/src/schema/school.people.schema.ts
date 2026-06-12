import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";
import {
  guardianStatusEnum,
  studentRelationshipTypeEnum,
  studentStatusEnum,
  timestamps
} from "#@/schema/school.shared";

export const students = pgTable(
  "students",
  {
    admissionNumber: text("admission_number").notNull(),
    dateOfBirth: date("date_of_birth"),
    fullName: text("full_name").notNull(),
    gender: text("gender"),
    id: uuid("id").defaultRandom().primaryKey(),
    joinedOn: date("joined_on"),
    leftOn: date("left_on"),
    medicalNotes: text("medical_notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    preferredName: text("preferred_name"),
    status: studentStatusEnum("status").default("active").notNull(),
    ...timestamps()
  },
  (table) => [
    index("students_organization_idx").on(table.organizationId),
    uniqueIndex("students_admission_number_uidx").on(table.organizationId, table.admissionNumber),
    uniqueIndex("students_org_id_uidx").on(table.organizationId, table.id),
    check(
      "students_date_order_chk",
      sql`${table.leftOn} IS NULL OR ${table.joinedOn} IS NULL OR ${table.joinedOn} <= ${table.leftOn}`
    )
  ]
);

export const guardians = pgTable(
  "guardians",
  {
    address: jsonb("address").$type<Record<string, unknown>>(),
    email: text("email"),
    fullName: text("full_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    notes: text("notes"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    phone: text("phone"),
    preferredLanguage: text("preferred_language"),
    secondaryPhone: text("secondary_phone"),
    status: guardianStatusEnum("status").default("active").notNull(),
    ...timestamps()
  },
  (table) => [
    index("guardians_organization_idx").on(table.organizationId),
    uniqueIndex("guardians_org_id_uidx").on(table.organizationId, table.id)
  ]
);

export const studentRelationships = pgTable(
  "student_relationships",
  {
    canPickup: boolean("can_pickup").default(false).notNull(),
    emergencyContact: boolean("emergency_contact").default(false).notNull(),
    guardianId: uuid("guardian_id").references(() => guardians.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    isBillingContact: boolean("is_billing_contact").default(false).notNull(),
    isPrimaryContact: boolean("is_primary_contact").default(false).notNull(),
    notes: text("notes"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    receivesAcademicUpdates: boolean("receives_academic_updates").default(true).notNull(),
    relatedStudentId: uuid("related_student_id").references(() => students.id, {
      onDelete: "cascade"
    }),
    relationship: studentRelationshipTypeEnum("relationship").notNull(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("student_relationships_guardian_idx").on(table.organizationId, table.guardianId),
    index("student_relationships_related_student_idx").on(
      table.organizationId,
      table.relatedStudentId
    ),
    index("student_relationships_student_idx").on(table.organizationId, table.studentId),
    uniqueIndex("student_relationships_guardian_uidx")
      .on(table.organizationId, table.studentId, table.guardianId, table.relationship)
      .where(sql`${table.guardianId} IS NOT NULL`),
    uniqueIndex("student_relationships_student_uidx")
      .on(table.organizationId, table.studentId, table.relatedStudentId, table.relationship)
      .where(sql`${table.relatedStudentId} IS NOT NULL`),
    foreignKey({
      columns: [table.organizationId, table.studentId],
      foreignColumns: [students.organizationId, students.id],
      name: "student_relationships_student_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.guardianId],
      foreignColumns: [guardians.organizationId, guardians.id],
      name: "student_relationships_guardian_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.relatedStudentId],
      foreignColumns: [students.organizationId, students.id],
      name: "student_relationships_related_student_org_fk"
    }).onDelete("cascade"),
    check(
      "student_relationships_target_chk",
      sql`(${table.guardianId} IS NOT NULL AND ${table.relatedStudentId} IS NULL) OR (${table.guardianId} IS NULL AND ${table.relatedStudentId} IS NOT NULL)`
    ),
    check(
      "student_relationships_not_self_chk",
      sql`${table.relatedStudentId} IS NULL OR ${table.studentId} <> ${table.relatedStudentId}`
    )
  ]
);
