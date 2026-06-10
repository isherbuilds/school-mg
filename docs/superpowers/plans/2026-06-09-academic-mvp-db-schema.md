# Academic MVP DB Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first School App database schema slice for staff-side academic setup, people records, scoped permissions, timetable, daily attendance, calendar exceptions, and basic transport assignment.

**Architecture:** Keep the migration phase-owned and academic-first. Put reusable school enum contracts in `packages/core`, Drizzle table definitions in focused `packages/db/src/schema/*.schema.ts` files, and keep finance, communication, marksheets, AI/MCP, and full transport operations out of this migration.

**Tech Stack:** TypeScript, Drizzle ORM relations v2, PostgreSQL, Vitest, Vite Plus, Better Auth schema adapter.

---

## File Structure

- Create `packages/core/src/school/constants.ts`: shared literal arrays for roles, lifecycle statuses, attendance, calendar events, and transport assignment enums.
- Create `packages/core/src/school/types.ts`: Zod schemas and inferred types for those literals.
- Create `packages/core/src/school/index.ts`: school-domain barrel export.
- Modify `packages/core/src/index.ts`: export school domain.
- Modify `packages/core/package.json`: expose `@tsu-stack/core/school`.
- Create `packages/core/src/school/__tests__/types.test.ts`: contract tests for narrowed role, attendance, calendar, and transport values.
- Create `packages/db/vite.config.ts`: allow package-local schema tests.
- Modify `packages/db/package.json`: add `test:unit` script and depend on `@tsu-stack/core` through the workspace package boundary.
- Modify `packages/db/src/schema/auth.schema.ts`: add Better Auth organization baseline tables and relations.
- Modify `packages/auth/src/index.ts`: enable the Better Auth organization plugin that owns those auth tables.
- Create `packages/db/src/schema/school.shared.ts`: Drizzle enum declarations and timestamp helper.
- Create `packages/db/src/schema/school.people.schema.ts`: staff actors, access roles, staff profiles, students, guardians, student relationships.
- Create `packages/db/src/schema/school.academics.schema.ts`: academic years, terms, grade levels, sections, subjects, enrollments, subject offerings, staff assignments.
- Create `packages/db/src/schema/school.scheduling.schema.ts`: calendar events, timetable slots, attendance sessions, attendance records.
- Create `packages/db/src/schema/school.transport.schema.ts`: transport stops, routes, ordered route stops, student rider assignments.
- Modify `packages/db/src/schema/index.ts`: export auth and current phase schema only.
- Modify `packages/db/src/schema/relations.ts`: define current phase relations.
- Create `packages/db/src/schema/__tests__/school-schema-exports.test.ts`: export and enum contract tests.
- Create one generated Drizzle migration under `packages/db/migrations/<timestamp>_<name>/`.
- Modify `docs/SCHEMA.md`: mark implemented MVP schema tables as current after migration generation.

## Implementation Rules

- Use `text` IDs for Better Auth-owned tables because current `user.id` is `text`.
- Use `uuid().defaultRandom()` for School App domain table IDs.
- Match Better Auth organization plugin schema for auth-owned organization, member, invitation, and active session fields.
- Every tenant-owned domain table carries `organization_id`.
- Required tenant-owned references use organization-scoped foreign keys where cross-tenant mixing would corrupt data.
- Hot tenant list paths use `organization_id`-leading indexes.
- Access roles remain only `owner`, `principal`, `teacher`.
- Assignment roles remain only `coordinator`, `homeroom_teacher`, `subject_teacher`, `substitute_teacher`.
- Staff assignments store `staff_profile_id`; actor identity is derived through the profile.
- Staff assignments must target exactly one grade level, section, or subject offering.
- Attendance records carry organization, academic year, and section scope columns so session and enrollment scope match at the database layer.
- Attendance statuses remain only `present`, `absent`.
- Calendar exceptions never create absences. Service/UI code decides whether to create attendance sessions.
- Basic transport assignment excludes vehicles, drivers, runs, GPS, maintenance, incidents, and transport fee links.
- Do not add finance, communication, marksheet, AI, MCP, or parent portal tables in this plan.
- Do not add Better Auth API key tables until an API key/MCP integration phase enables that plugin.

## Source-Verified Patterns

- Drizzle schema uses dialect-specific `pgTable`, `index`, `uniqueIndex`, checks, and generated SQL migrations. Sources: https://orm.drizzle.team/docs/sql-schema-declaration, https://orm.drizzle.team/docs/indexes-constraints, https://orm.drizzle.team/docs/drizzle-kit-generate
- Drizzle relations v2 uses one central `defineRelations(schema, (r) => ...)` config, with relation parts allowed for adapter-owned auth relations. Sources: https://orm.drizzle.team/docs/relations-v2, https://orm.drizzle.team/docs/relations-v1-v2, https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2
- Better Auth organization plugin owns `organization`, `member`, `invitation`, plus `session.activeOrganizationId` and `session.activeTeamId`. Sources: https://www.better-auth.com/docs/plugins/organization, https://www.better-auth.com/docs/adapters/drizzle
- Zod 4 uses `z.enum()` for enum-like inputs; `z.nativeEnum()` is deprecated. Source: https://zod.dev/v4/changelog

### Task 1: Core School Contracts

**Files:**

- Create: `packages/core/src/school/constants.ts`
- Create: `packages/core/src/school/types.ts`
- Create: `packages/core/src/school/index.ts`
- Create: `packages/core/src/school/__tests__/types.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/package.json`

- [x] **Step 1: Write failing core contract tests**

Create `packages/core/src/school/__tests__/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  attendanceStatusSchema,
  calendarEventTypeSchema,
  schoolAccessRoleSchema,
  staffAssignmentRoleSchema,
  studentRelationshipTypeSchema,
  transportRideStatusSchema
} from "#@/school/types";

describe("school domain contracts", () => {
  it("keeps MVP access roles intentionally small", () => {
    expect(schoolAccessRoleSchema.options).toEqual(["owner", "principal", "teacher"]);
    expect(() => schoolAccessRoleSchema.parse("academic_admin")).toThrow();
    expect(() => schoolAccessRoleSchema.parse("front_office")).toThrow();
  });

  it("separates scoped assignment roles from access roles", () => {
    expect(staffAssignmentRoleSchema.options).toEqual([
      "coordinator",
      "homeroom_teacher",
      "subject_teacher",
      "substitute_teacher"
    ]);
  });

  it("keeps daily attendance statuses at present and absent", () => {
    expect(attendanceStatusSchema.options).toEqual(["present", "absent"]);
    expect(() => attendanceStatusSchema.parse("late")).toThrow();
    expect(() => attendanceStatusSchema.parse("excused")).toThrow();
  });

  it("keeps calendar exception types explicit", () => {
    expect(calendarEventTypeSchema.options).toEqual([
      "holiday",
      "closure",
      "field_trip",
      "half_day",
      "late_start"
    ]);
  });

  it("supports immediate family relationships without adding parent portal access", () => {
    expect(studentRelationshipTypeSchema.options).toEqual([
      "mother",
      "father",
      "guardian",
      "grandparent",
      "sibling",
      "other"
    ]);
  });

  it("keeps basic transport assignment status narrow", () => {
    expect(transportRideStatusSchema.options).toEqual(["active", "inactive", "paused"]);
  });
});
```

- [x] **Step 2: Run core tests and verify failure**

Run:

```bash
vp run --filter @tsu-stack/core test:unit -- src/school/__tests__/types.test.ts
```

Expected: FAIL because `#@/school/types` does not exist.

- [x] **Step 3: Add school constants**

Create `packages/core/src/school/constants.ts`:

```ts
export const schoolAccessRoles = ["owner", "principal", "teacher"] as const;

export const schoolActorStatuses = ["invited", "active", "suspended", "archived"] as const;

export const staffStatuses = ["active", "on_leave", "inactive"] as const;

export const guardianStatuses = ["active", "inactive", "blocked"] as const;

export const studentStatuses = ["prospect", "active", "inactive", "withdrawn", "alumni"] as const;

export const studentRelationshipTypes = [
  "mother",
  "father",
  "guardian",
  "grandparent",
  "sibling",
  "other"
] as const;

export const termKinds = ["semester", "trimester", "quarter", "custom"] as const;

export const enrollmentStatuses = ["enrolled", "completed", "withdrawn", "transferred"] as const;

export const staffAssignmentRoles = [
  "coordinator",
  "homeroom_teacher",
  "subject_teacher",
  "substitute_teacher"
] as const;

export const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

export const schoolShifts = ["morning", "afternoon", "full_day", "custom"] as const;

export const calendarEventTypes = [
  "holiday",
  "closure",
  "field_trip",
  "half_day",
  "late_start"
] as const;

export const calendarAttendanceBehaviors = [
  "attendance_not_expected",
  "attendance_expected_with_label"
] as const;

export const attendanceStatuses = ["present", "absent"] as const;

export const transportRouteWindows = ["morning", "afternoon", "both", "custom"] as const;

export const transportRideStatuses = ["active", "inactive", "paused"] as const;
```

- [x] **Step 4: Add school Zod schemas and types**

Create `packages/core/src/school/types.ts`:

```ts
import { z } from "zod";

import {
  attendanceStatuses,
  calendarAttendanceBehaviors,
  calendarEventTypes,
  enrollmentStatuses,
  guardianStatuses,
  schoolAccessRoles,
  schoolActorStatuses,
  schoolShifts,
  staffAssignmentRoles,
  staffStatuses,
  studentRelationshipTypes,
  studentStatuses,
  termKinds,
  transportRideStatuses,
  transportRouteWindows,
  weekdays
} from "#@/school/constants";

export const schoolAccessRoleSchema = z.enum(schoolAccessRoles);
export type SchoolAccessRole = z.infer<typeof schoolAccessRoleSchema>;

export const schoolActorStatusSchema = z.enum(schoolActorStatuses);
export type SchoolActorStatus = z.infer<typeof schoolActorStatusSchema>;

export const staffStatusSchema = z.enum(staffStatuses);
export type StaffStatus = z.infer<typeof staffStatusSchema>;

export const guardianStatusSchema = z.enum(guardianStatuses);
export type GuardianStatus = z.infer<typeof guardianStatusSchema>;

export const studentStatusSchema = z.enum(studentStatuses);
export type StudentStatus = z.infer<typeof studentStatusSchema>;

export const studentRelationshipTypeSchema = z.enum(studentRelationshipTypes);
export type StudentRelationshipType = z.infer<typeof studentRelationshipTypeSchema>;

export const termKindSchema = z.enum(termKinds);
export type TermKind = z.infer<typeof termKindSchema>;

export const enrollmentStatusSchema = z.enum(enrollmentStatuses);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;

export const staffAssignmentRoleSchema = z.enum(staffAssignmentRoles);
export type StaffAssignmentRole = z.infer<typeof staffAssignmentRoleSchema>;

export const weekdaySchema = z.enum(weekdays);
export type Weekday = z.infer<typeof weekdaySchema>;

export const schoolShiftSchema = z.enum(schoolShifts);
export type SchoolShift = z.infer<typeof schoolShiftSchema>;

export const calendarEventTypeSchema = z.enum(calendarEventTypes);
export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>;

export const calendarAttendanceBehaviorSchema = z.enum(calendarAttendanceBehaviors);
export type CalendarAttendanceBehavior = z.infer<typeof calendarAttendanceBehaviorSchema>;

export const attendanceStatusSchema = z.enum(attendanceStatuses);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const transportRouteWindowSchema = z.enum(transportRouteWindows);
export type TransportRouteWindow = z.infer<typeof transportRouteWindowSchema>;

export const transportRideStatusSchema = z.enum(transportRideStatuses);
export type TransportRideStatus = z.infer<typeof transportRideStatusSchema>;
```

- [x] **Step 5: Add school barrel export**

Create `packages/core/src/school/index.ts`:

```ts
export * from "#@/school/constants";
export * from "#@/school/types";
```

Modify `packages/core/src/index.ts`:

```ts
export * from "#@/assets/index";
export * from "#@/health/index";
export * from "#@/school/index";
```

Modify `packages/core/package.json` exports:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./assets": "./src/assets/index.ts",
    "./health": "./src/health/index.ts",
    "./school": "./src/school/index.ts",
    "./*": "./src/*.ts"
  }
}
```

Preserve existing package fields while adding only `"./school"`.

- [x] **Step 6: Run core tests and verify pass**

Run:

```bash
vp run --filter @tsu-stack/core test:unit -- src/school/__tests__/types.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit core contracts**

Run:

```bash
git add packages/core/src/index.ts packages/core/src/school packages/core/package.json
git commit -m "feat(core): add school domain contracts"
```

### Task 2: DB Test Harness And Shared Enum Schema

**Files:**

- Create: `packages/db/vite.config.ts`
- Modify: `packages/db/package.json`
- Create: `packages/db/src/schema/__tests__/school-schema-exports.test.ts`
- Create: `packages/db/src/schema/school.shared.ts`

- [x] **Step 1: Add DB package test config**

Create `packages/db/vite.config.ts`:

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["src/schema/__tests__/**/*.test.ts"]
  }
});
```

Modify `packages/db/package.json`:

```json
{
  "scripts": {
    "db": "pnpm dotenvx run -f ../env/.env -- drizzle-kit",
    "db:dev:start": "docker compose -f docker-compose.dev.yaml up -d",
    "db:dev:stop": "docker compose -f docker-compose.dev.yaml stop",
    "auth:generate": "vp run -w auth:generate",
    "test:unit": "vp test"
  },
  "dependencies": {
    "@tsu-stack/core": "workspace:*",
    "@tsu-stack/logger": "workspace:*",
    "drizzle-orm": "catalog:",
    "postgres": "catalog:"
  }
}
```

Preserve existing fields and only add `test:unit` plus `@tsu-stack/core`.

- [x] **Step 2: Write failing schema export test**

Create `packages/db/src/schema/__tests__/school-schema-exports.test.ts`:

```ts
import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  academicTerms,
  academicYears,
  attendanceRecords,
  attendanceSessions,
  calendarEvents,
  gradeLevels,
  guardians,
  organization,
  schoolAccessRoleEnum,
  schoolActorRoles,
  schoolActors,
  sections,
  staffAssignments,
  staffProfiles,
  studentEnrollments,
  studentRelationships,
  students,
  subjectOfferings,
  subjects,
  timetableSlots,
  transportRiders,
  transportRouteStops,
  transportRoutes,
  transportStops
} from "#@/schema/index";

describe("school schema exports", () => {
  it("exports organization baseline and academic MVP tables", () => {
    expect(getTableName(organization)).toBe("organization");
    expect(getTableName(schoolActors)).toBe("school_actors");
    expect(getTableName(schoolActorRoles)).toBe("school_actor_roles");
    expect(getTableName(staffProfiles)).toBe("staff_profiles");
    expect(getTableName(students)).toBe("students");
    expect(getTableName(guardians)).toBe("guardians");
    expect(getTableName(studentRelationships)).toBe("student_relationships");
    expect(getTableName(academicYears)).toBe("academic_years");
    expect(getTableName(academicTerms)).toBe("academic_terms");
    expect(getTableName(gradeLevels)).toBe("grade_levels");
    expect(getTableName(sections)).toBe("sections");
    expect(getTableName(subjects)).toBe("subjects");
    expect(getTableName(studentEnrollments)).toBe("student_enrollments");
    expect(getTableName(subjectOfferings)).toBe("subject_offerings");
    expect(getTableName(staffAssignments)).toBe("staff_assignments");
    expect(getTableName(calendarEvents)).toBe("calendar_events");
    expect(getTableName(timetableSlots)).toBe("timetable_slots");
    expect(getTableName(attendanceSessions)).toBe("attendance_sessions");
    expect(getTableName(attendanceRecords)).toBe("attendance_records");
    expect(getTableName(transportStops)).toBe("transport_stops");
    expect(getTableName(transportRoutes)).toBe("transport_routes");
    expect(getTableName(transportRouteStops)).toBe("transport_route_stops");
    expect(getTableName(transportRiders)).toBe("transport_riders");
  });

  it("keeps rejected old access roles out of the enum", () => {
    expect(schoolAccessRoleEnum.enumValues).toEqual(["owner", "principal", "teacher"]);
    expect(schoolAccessRoleEnum.enumValues).not.toContain("academic_admin");
    expect(schoolAccessRoleEnum.enumValues).not.toContain("front_office");
  });
});
```

- [x] **Step 3: Run DB schema test and verify failure**

Run:

```bash
vp run --filter @tsu-stack/db test:unit -- src/schema/__tests__/school-schema-exports.test.ts
```

Expected: FAIL because school schema exports do not exist.

- [x] **Step 4: Add shared Drizzle enums and timestamp helper**

Create `packages/db/src/schema/school.shared.ts`:

```ts
import {
  attendanceStatuses,
  calendarAttendanceBehaviors,
  calendarEventTypes,
  enrollmentStatuses,
  guardianStatuses,
  schoolAccessRoles,
  schoolActorStatuses,
  schoolShifts,
  staffAssignmentRoles,
  staffStatuses,
  studentRelationshipTypes,
  studentStatuses,
  termKinds,
  transportRideStatuses,
  transportRouteWindows,
  weekdays
} from "@tsu-stack/core/school";
import { pgEnum, timestamp } from "drizzle-orm/pg-core";

export const schoolAccessRoleEnum = pgEnum("school_access_role", schoolAccessRoles);
export const schoolActorStatusEnum = pgEnum("school_actor_status", schoolActorStatuses);
export const staffStatusEnum = pgEnum("staff_status", staffStatuses);
export const guardianStatusEnum = pgEnum("guardian_status", guardianStatuses);
export const studentStatusEnum = pgEnum("student_status", studentStatuses);
export const studentRelationshipTypeEnum = pgEnum(
  "student_relationship_type",
  studentRelationshipTypes
);
export const termKindEnum = pgEnum("term_kind", termKinds);
export const enrollmentStatusEnum = pgEnum("enrollment_status", enrollmentStatuses);
export const staffAssignmentRoleEnum = pgEnum("staff_assignment_role", staffAssignmentRoles);
export const weekdayEnum = pgEnum("weekday", weekdays);
export const schoolShiftEnum = pgEnum("school_shift", schoolShifts);
export const calendarEventTypeEnum = pgEnum("calendar_event_type", calendarEventTypes);
export const calendarAttendanceBehaviorEnum = pgEnum(
  "calendar_attendance_behavior",
  calendarAttendanceBehaviors
);
export const attendanceStatusEnum = pgEnum("attendance_status", attendanceStatuses);
export const transportRouteWindowEnum = pgEnum("transport_route_window", transportRouteWindows);
export const transportRideStatusEnum = pgEnum("transport_ride_status", transportRideStatuses);

export function timestamps() {
  return {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  };
}
```

- [ ] **Step 5: Commit DB harness and enum primitives**

Run:

```bash
git add packages/db/package.json packages/db/vite.config.ts packages/db/src/schema/__tests__/school-schema-exports.test.ts packages/db/src/schema/school.shared.ts
git commit -m "test(db): add school schema contract harness"
```

### Task 3: Organization, People, And Access Tables

**Files:**

- Modify: `packages/db/src/schema/auth.schema.ts`
- Modify: `packages/auth/src/index.ts`
- Create: `packages/db/src/schema/school.people.schema.ts`
- Modify: `packages/db/src/schema/index.ts`

- [x] **Step 1: Add organization baseline to auth schema**

In `packages/db/src/schema/auth.schema.ts`, add `uniqueIndex` to the `drizzle-orm/pg-core` imports.

Add these fields to the existing `session` table:

```ts
activeOrganizationId: text("active_organization_id"),
activeTeamId: text("active_team_id"),
```

Add these tables after `verification`:

```ts
export const organization = pgTable("organization", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  id: text("id").primaryKey(),
  logo: text("logo"),
  metadata: text("metadata"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
});

export const member = pgTable(
  "member",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
    uniqueIndex("member_org_user_uidx").on(table.organizationId, table.userId)
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role"),
    status: text("status").default("pending").notNull()
  },
  (table) => [
    index("invitation_email_idx").on(table.email),
    index("invitation_organizationId_idx").on(table.organizationId)
  ]
);
```

Extend the `defineRelationsPart` object with `invitation`, `member`, and `organization`. Add these relation entries:

```ts
invitation: {
  inviter: r.one.user({
    from: r.invitation.inviterId,
    to: r.user.id
  }),
  organization: r.one.organization({
    from: r.invitation.organizationId,
    to: r.organization.id
  })
},
member: {
  organization: r.one.organization({
    from: r.member.organizationId,
    to: r.organization.id
  }),
  user: r.one.user({
    from: r.member.userId,
    to: r.user.id
  })
},
organization: {
  invitations: r.many.invitation({
    from: r.organization.id,
    to: r.invitation.organizationId
  }),
  members: r.many.member({
    from: r.organization.id,
    to: r.member.organizationId
  })
}
```

Add to `user` relations:

```ts
invitations: r.many.invitation({
  from: r.user.id,
  to: r.invitation.inviterId
}),
members: r.many.member({
  from: r.user.id,
  to: r.member.userId
})
```

- [x] **Step 2: Enable the Better Auth organization plugin**

Modify `packages/auth/src/index.ts` imports:

```ts
import { openAPI, organization } from "better-auth/plugins";
```

Modify the `plugins` array:

```ts
plugins: [
  organization(),
  openAPI({
    theme: "deepSpace"
  })
],
```

- [x] **Step 3: Add people and access tables**

Create `packages/db/src/schema/school.people.schema.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { organization, user } from "#@/schema/auth.schema";
import {
  guardianStatusEnum,
  schoolAccessRoleEnum,
  schoolActorStatusEnum,
  staffStatusEnum,
  studentRelationshipTypeEnum,
  studentStatusEnum,
  timestamps
} from "#@/schema/school.shared";

export const schoolActors = pgTable(
  "school_actors",
  {
    email: text("email"),
    fullName: text("full_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lastSeenAt: date("last_seen_at"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    phone: text("phone"),
    preferences: jsonb("preferences").$type<Record<string, unknown>>(),
    status: schoolActorStatusEnum("status").default("invited").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps()
  },
  (table) => [
    index("school_actors_organization_idx").on(table.organizationId),
    index("school_actors_user_idx").on(table.userId),
    uniqueIndex("school_actors_email_uidx").on(table.organizationId, table.email),
    uniqueIndex("school_actors_user_uidx").on(table.organizationId, table.userId)
  ]
);

export const schoolActorRoles = pgTable(
  "school_actor_roles",
  {
    active: boolean("active").default(true).notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => schoolActors.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: schoolAccessRoleEnum("role").notNull(),
    ...timestamps()
  },
  (table) => [
    index("school_actor_roles_actor_active_idx").on(table.actorId, table.active),
    index("school_actor_roles_organization_role_idx").on(table.organizationId, table.role),
    uniqueIndex("school_actor_roles_actor_role_uidx").on(table.actorId, table.role)
  ]
);

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    actorId: uuid("actor_id")
      .notNull()
      .references(() => schoolActors.id, { onDelete: "cascade" }),
    department: text("department"),
    employeeCode: text("employee_code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    joinedOn: date("joined_on"),
    leftOn: date("left_on"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: staffStatusEnum("status").default("active").notNull(),
    title: text("title"),
    ...timestamps()
  },
  (table) => [
    index("staff_profiles_organization_idx").on(table.organizationId),
    uniqueIndex("staff_profiles_actor_uidx").on(table.actorId),
    uniqueIndex("staff_profiles_employee_code_uidx").on(table.organizationId, table.employeeCode),
    check(
      "staff_profiles_date_order_chk",
      sql`${table.leftOn} IS NULL OR ${table.joinedOn} IS NULL OR ${table.joinedOn} <= ${table.leftOn}`
    )
  ]
);

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
    check(
      "students_date_order_chk",
      sql`${table.leftOn} IS NULL OR ${table.joinedOn} IS NULL OR ${table.joinedOn} <= ${table.leftOn}`
    )
  ]
);

export const guardians = pgTable(
  "guardians",
  {
    actorId: uuid("actor_id").references(() => schoolActors.id, { onDelete: "set null" }),
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
    index("guardians_actor_idx").on(table.actorId),
    index("guardians_organization_idx").on(table.organizationId)
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
    index("student_relationships_guardian_idx").on(table.guardianId),
    index("student_relationships_related_student_idx").on(table.relatedStudentId),
    index("student_relationships_student_idx").on(table.studentId),
    uniqueIndex("student_relationships_guardian_uidx").on(
      table.studentId,
      table.guardianId,
      table.relationship
    ),
    uniqueIndex("student_relationships_student_uidx").on(
      table.studentId,
      table.relatedStudentId,
      table.relationship
    ),
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
```

- [x] **Step 4: Export people tables**

Modify `packages/db/src/schema/index.ts`:

```ts
export {
  account,
  invitation,
  member,
  organization,
  session,
  user,
  verification
} from "#@/schema/auth.schema";
export * from "#@/schema/school.shared";
export * from "#@/schema/school.people.schema";
```

- [x] **Step 5: Run DB schema test and verify partial failure**

Run:

```bash
vp run --filter @tsu-stack/db test:unit -- src/schema/__tests__/school-schema-exports.test.ts
```

Expected: FAIL because academic, scheduling, attendance, and transport exports do not exist yet. Auth organization, people, and access imports should resolve.

- [ ] **Step 6: Commit auth organization and people schema**

Run:

```bash
git add packages/auth/src/index.ts packages/db/src/schema/auth.schema.ts packages/db/src/schema/index.ts packages/db/src/schema/school.people.schema.ts
git commit -m "feat(db): add organization and people schema"
```

### Task 4: Academic Setup And Assignment Tables

**Files:**

- Create: `packages/db/src/schema/school.academics.schema.ts`
- Modify: `packages/db/src/schema/index.ts`

- [x] **Step 1: Add academic schema**

Create `packages/db/src/schema/school.academics.schema.ts`:

```ts
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

import { organization } from "#@/schema/auth.schema";
import { schoolActors, staffProfiles, students } from "#@/schema/school.people.schema";
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
    uniqueIndex("academic_years_name_uidx").on(table.organizationId, table.name),
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
    index("academic_terms_year_idx").on(table.academicYearId),
    uniqueIndex("academic_terms_name_uidx").on(table.academicYearId, table.name),
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
    index("sections_year_idx").on(table.academicYearId),
    uniqueIndex("sections_code_uidx").on(table.academicYearId, table.code),
    uniqueIndex("sections_org_tuple_uidx").on(
      table.organizationId,
      table.id,
      table.academicYearId,
      table.gradeLevelId
    ),
    uniqueIndex("sections_name_uidx").on(table.academicYearId, table.gradeLevelId, table.name)
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
    index("student_enrollments_section_idx").on(table.sectionId),
    index("student_enrollments_student_idx").on(table.studentId),
    uniqueIndex("student_enrollments_open_uidx")
      .on(table.studentId)
      .where(sql`${table.endDate} IS NULL AND ${table.status} = 'enrolled'`),
    uniqueIndex("student_enrollments_roll_uidx").on(table.sectionId, table.rollNumber),
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
    })
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
    index("subject_offerings_section_idx").on(table.sectionId),
    uniqueIndex("subject_offerings_unique_uidx").on(
      table.academicYearId,
      table.sectionId,
      table.subjectId
    )
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
    gradeLevelId: uuid("grade_level_id").references(() => gradeLevels.id, {
      onDelete: "cascade"
    }),
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: staffAssignmentRoleEnum("role").notNull(),
    sectionId: uuid("section_id").references(() => sections.id, { onDelete: "cascade" }),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    startDate: date("start_date"),
    subjectOfferingId: uuid("subject_offering_id").references(() => subjectOfferings.id, {
      onDelete: "cascade"
    }),
    ...timestamps()
  },
  (table) => [
    index("staff_assignments_staff_profile_idx").on(table.organizationId, table.staffProfileId),
    uniqueIndex("staff_assignments_grade_scope_uidx")
      .on(
        table.organizationId,
        table.academicYearId,
        table.staffProfileId,
        table.role,
        table.gradeLevelId
      )
      .where(sql`${table.active} = true AND ${table.gradeLevelId} IS NOT NULL`),
    uniqueIndex("staff_assignments_section_scope_uidx")
      .on(
        table.organizationId,
        table.academicYearId,
        table.staffProfileId,
        table.role,
        table.sectionId
      )
      .where(sql`${table.active} = true AND ${table.sectionId} IS NOT NULL`),
    uniqueIndex("staff_assignments_subject_scope_uidx")
      .on(
        table.organizationId,
        table.academicYearId,
        table.staffProfileId,
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
    )
  ]
);
```

- [x] **Step 2: Export academic tables**

Append to `packages/db/src/schema/index.ts`:

```ts
export * from "#@/schema/school.academics.schema";
```

- [x] **Step 3: Run DB schema test and verify partial failure**

Run:

```bash
vp run --filter @tsu-stack/db test:unit -- src/schema/__tests__/school-schema-exports.test.ts
```

Expected: FAIL because scheduling, attendance, and transport exports do not exist yet. Academic imports should resolve.

- [ ] **Step 4: Commit academic schema**

Run:

```bash
git add packages/db/src/schema/index.ts packages/db/src/schema/school.academics.schema.ts
git commit -m "feat(db): add academic setup schema"
```

### Task 5: Scheduling And Daily Attendance Tables

**Files:**

- Create: `packages/db/src/schema/school.scheduling.schema.ts`
- Modify: `packages/db/src/schema/index.ts`

- [x] **Step 1: Add scheduling and attendance schema**

Create `packages/db/src/schema/school.scheduling.schema.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  check,
  date,
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
    academicYearId: uuid("academic_year_id").references(() => academicYears.id, {
      onDelete: "set null"
    }),
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
    subjectOfferingId: uuid("subject_offering_id").references(() => subjectOfferings.id, {
      onDelete: "set null"
    }),
    teacherActorId: uuid("teacher_actor_id").references(() => schoolActors.id, {
      onDelete: "set null"
    }),
    weekday: weekdayEnum("weekday").notNull(),
    ...timestamps()
  },
  (table) => [
    index("timetable_slots_section_idx").on(table.sectionId),
    index("timetable_slots_teacher_idx").on(table.teacherActorId),
    uniqueIndex("timetable_slots_section_slot_uidx").on(
      table.sectionId,
      table.weekday,
      table.slotIndex
    ),
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
    calendarEventId: uuid("calendar_event_id").references(() => calendarEvents.id, {
      onDelete: "set null"
    }),
    id: uuid("id").defaultRandom().primaryKey(),
    lockedAt: timestamp("locked_at"),
    notes: text("notes"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    takenByActorId: uuid("taken_by_actor_id").references(() => schoolActors.id, {
      onDelete: "set null"
    }),
    ...timestamps()
  },
  (table) => [
    index("attendance_sessions_section_date_idx").on(table.sectionId, table.attendanceDate),
    uniqueIndex("attendance_sessions_section_date_uidx").on(table.sectionId, table.attendanceDate)
  ]
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => studentEnrollments.id, { onDelete: "cascade" }),
    markedAt: timestamp("marked_at").defaultNow().notNull(),
    markedByActorId: uuid("marked_by_actor_id").references(() => schoolActors.id, {
      onDelete: "set null"
    }),
    remark: text("remark"),
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
    index("attendance_records_enrollment_idx").on(table.enrollmentId)
  ]
);
```

- [x] **Step 2: Export scheduling tables**

Append to `packages/db/src/schema/index.ts`:

```ts
export * from "#@/schema/school.scheduling.schema";
```

- [x] **Step 3: Run DB schema test and verify partial failure**

Run:

```bash
vp run --filter @tsu-stack/db test:unit -- src/schema/__tests__/school-schema-exports.test.ts
```

Expected: FAIL because transport exports do not exist yet. Scheduling and attendance imports should resolve.

- [ ] **Step 4: Commit scheduling schema**

Run:

```bash
git add packages/db/src/schema/index.ts packages/db/src/schema/school.scheduling.schema.ts
git commit -m "feat(db): add scheduling and attendance schema"
```

### Task 6: Basic Transport Assignment Tables

**Files:**

- Create: `packages/db/src/schema/school.transport.schema.ts`
- Modify: `packages/db/src/schema/index.ts`

- [x] **Step 1: Add basic transport assignment schema**

Create `packages/db/src/schema/school.transport.schema.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";
import { students } from "#@/schema/school.people.schema";
import {
  timestamps,
  transportRideStatusEnum,
  transportRouteWindowEnum
} from "#@/schema/school.shared";

export const transportStops = pgTable(
  "transport_stops",
  {
    active: boolean("active").default(true).notNull(),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("transport_stops_organization_idx").on(table.organizationId),
    uniqueIndex("transport_stops_code_uidx").on(table.organizationId, table.code)
  ]
);

export const transportRoutes = pgTable(
  "transport_routes",
  {
    active: boolean("active").default(true).notNull(),
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    notes: text("notes"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    window: transportRouteWindowEnum("window").default("both").notNull(),
    ...timestamps()
  },
  (table) => [uniqueIndex("transport_routes_code_uidx").on(table.organizationId, table.code)]
);

export const transportRouteStops = pgTable(
  "transport_route_stops",
  {
    distanceFromStartKm: numeric("distance_from_start_km", { precision: 8, scale: 2 }),
    dropoffMinute: integer("dropoff_minute"),
    pickupMinute: integer("pickup_minute"),
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    stopId: uuid("stop_id")
      .notNull()
      .references(() => transportStops.id, { onDelete: "cascade" }),
    stopOrder: integer("stop_order").notNull(),
    ...timestamps()
  },
  (table) => [
    primaryKey({
      columns: [table.routeId, table.stopId],
      name: "transport_route_stops_pk"
    }),
    uniqueIndex("transport_route_stops_order_uidx").on(table.routeId, table.stopOrder),
    check("transport_route_stops_order_positive_chk", sql`${table.stopOrder} > 0`)
  ]
);

export const transportRiders = pgTable(
  "transport_riders",
  {
    activeFrom: date("active_from").notNull(),
    activeTo: date("active_to"),
    afternoonEnabled: boolean("afternoon_enabled").default(true).notNull(),
    dropoffStopId: uuid("dropoff_stop_id").references(() => transportStops.id, {
      onDelete: "set null"
    }),
    emergencyGuardianName: text("emergency_guardian_name"),
    emergencyGuardianPhone: text("emergency_guardian_phone"),
    id: uuid("id").defaultRandom().primaryKey(),
    morningEnabled: boolean("morning_enabled").default(true).notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    pickupStopId: uuid("pickup_stop_id")
      .notNull()
      .references(() => transportStops.id, { onDelete: "restrict" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    status: transportRideStatusEnum("status").default("active").notNull(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("transport_riders_student_idx").on(table.studentId),
    uniqueIndex("transport_riders_student_route_uidx").on(
      table.studentId,
      table.routeId,
      table.activeFrom
    ),
    check(
      "transport_riders_date_order_chk",
      sql`${table.activeTo} IS NULL OR ${table.activeFrom} <= ${table.activeTo}`
    ),
    check(
      "transport_riders_window_chk",
      sql`${table.morningEnabled} = TRUE OR ${table.afternoonEnabled} = TRUE`
    )
  ]
);
```

- [x] **Step 2: Export transport tables**

Append to `packages/db/src/schema/index.ts`:

```ts
export * from "#@/schema/school.transport.schema";
```

- [x] **Step 3: Run DB schema tests and verify pass**

Run:

```bash
vp run --filter @tsu-stack/db test:unit -- src/schema/__tests__/school-schema-exports.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit transport schema**

Run:

```bash
git add packages/db/src/schema/index.ts packages/db/src/schema/school.transport.schema.ts
git commit -m "feat(db): add basic transport assignment schema"
```

### Task 7: Relations, Migration, And Schema Docs

**Files:**

- Modify: `packages/db/src/schema/relations.ts`
- Create: generated migration under `packages/db/migrations/`
- Modify: `docs/SCHEMA.md`

- [x] **Step 1: Define current phase relations**

Replace `packages/db/src/schema/relations.ts` with:

```ts
import { defineRelations } from "drizzle-orm";

import * as schema from "#@/schema/index";

export const relations = defineRelations(schema, (r) => {
  return {
    academicTerms: {
      academicYear: r.one.academicYears({
        from: r.academicTerms.academicYearId,
        to: r.academicYears.id
      })
    },
    academicYears: {
      sections: r.many.sections({
        from: r.academicYears.id,
        to: r.sections.academicYearId
      }),
      terms: r.many.academicTerms({
        from: r.academicYears.id,
        to: r.academicTerms.academicYearId
      })
    },
    attendanceRecords: {
      enrollment: r.one.studentEnrollments({
        from: r.attendanceRecords.enrollmentId,
        to: r.studentEnrollments.id
      }),
      session: r.one.attendanceSessions({
        from: r.attendanceRecords.sessionId,
        to: r.attendanceSessions.id
      })
    },
    attendanceSessions: {
      records: r.many.attendanceRecords({
        from: r.attendanceSessions.id,
        to: r.attendanceRecords.sessionId
      }),
      section: r.one.sections({
        from: r.attendanceSessions.sectionId,
        to: r.sections.id
      })
    },
    gradeLevels: {
      sections: r.many.sections({
        from: r.gradeLevels.id,
        to: r.sections.gradeLevelId
      })
    },
    guardians: {
      relationships: r.many.studentRelationships({
        from: r.guardians.id,
        to: r.studentRelationships.guardianId
      })
    },
    schoolActors: {
      roles: r.many.schoolActorRoles({
        from: r.schoolActors.id,
        to: r.schoolActorRoles.actorId
      }),
      staffProfile: r.one.staffProfiles({
        from: r.schoolActors.id,
        to: r.staffProfiles.actorId
      })
    },
    sections: {
      academicYear: r.one.academicYears({
        from: r.sections.academicYearId,
        to: r.academicYears.id
      }),
      gradeLevel: r.one.gradeLevels({
        from: r.sections.gradeLevelId,
        to: r.gradeLevels.id
      }),
      studentEnrollments: r.many.studentEnrollments({
        from: r.sections.id,
        to: r.studentEnrollments.sectionId
      }),
      subjectOfferings: r.many.subjectOfferings({
        from: r.sections.id,
        to: r.subjectOfferings.sectionId
      }),
      timetableSlots: r.many.timetableSlots({
        from: r.sections.id,
        to: r.timetableSlots.sectionId
      })
    },
    staffAssignments: {
      actor: r.one.schoolActors({
        from: r.staffAssignments.actorId,
        to: r.schoolActors.id
      }),
      section: r.one.sections({
        from: r.staffAssignments.sectionId,
        to: r.sections.id
      }),
      subjectOffering: r.one.subjectOfferings({
        from: r.staffAssignments.subjectOfferingId,
        to: r.subjectOfferings.id
      })
    },
    students: {
      enrollments: r.many.studentEnrollments({
        from: r.students.id,
        to: r.studentEnrollments.studentId
      }),
      relationships: r.many.studentRelationships({
        from: r.students.id,
        to: r.studentRelationships.studentId
      }),
      transportRiders: r.many.transportRiders({
        from: r.students.id,
        to: r.transportRiders.studentId
      })
    },
    studentEnrollments: {
      section: r.one.sections({
        from: r.studentEnrollments.sectionId,
        to: r.sections.id
      }),
      student: r.one.students({
        from: r.studentEnrollments.studentId,
        to: r.students.id
      })
    },
    studentRelationships: {
      guardian: r.one.guardians({
        from: r.studentRelationships.guardianId,
        to: r.guardians.id
      }),
      relatedStudent: r.one.students({
        from: r.studentRelationships.relatedStudentId,
        to: r.students.id
      }),
      student: r.one.students({
        from: r.studentRelationships.studentId,
        to: r.students.id
      })
    },
    subjectOfferings: {
      section: r.one.sections({
        from: r.subjectOfferings.sectionId,
        to: r.sections.id
      }),
      subject: r.one.subjects({
        from: r.subjectOfferings.subjectId,
        to: r.subjects.id
      })
    },
    subjects: {
      offerings: r.many.subjectOfferings({
        from: r.subjects.id,
        to: r.subjectOfferings.subjectId
      })
    },
    timetableSlots: {
      section: r.one.sections({
        from: r.timetableSlots.sectionId,
        to: r.sections.id
      }),
      subjectOffering: r.one.subjectOfferings({
        from: r.timetableSlots.subjectOfferingId,
        to: r.subjectOfferings.id
      }),
      teacher: r.one.schoolActors({
        from: r.timetableSlots.teacherActorId,
        to: r.schoolActors.id
      })
    },
    transportRiders: {
      pickupStop: r.one.transportStops({
        from: r.transportRiders.pickupStopId,
        to: r.transportStops.id
      }),
      route: r.one.transportRoutes({
        from: r.transportRiders.routeId,
        to: r.transportRoutes.id
      }),
      student: r.one.students({
        from: r.transportRiders.studentId,
        to: r.students.id
      })
    },
    transportRoutes: {
      riders: r.many.transportRiders({
        from: r.transportRoutes.id,
        to: r.transportRiders.routeId
      }),
      stops: r.many.transportRouteStops({
        from: r.transportRoutes.id,
        to: r.transportRouteStops.routeId
      })
    },
    transportRouteStops: {
      route: r.one.transportRoutes({
        from: r.transportRouteStops.routeId,
        to: r.transportRoutes.id
      }),
      stop: r.one.transportStops({
        from: r.transportRouteStops.stopId,
        to: r.transportStops.id
      })
    },
    transportStops: {
      routeStops: r.many.transportRouteStops({
        from: r.transportStops.id,
        to: r.transportRouteStops.stopId
      })
    }
  };
});
```

- [x] **Step 2: Run DB schema tests**

Run:

```bash
vp run --filter @tsu-stack/db test:unit -- src/schema/__tests__/school-schema-exports.test.ts
```

Expected: PASS.

- [x] **Step 3: Generate migration**

Run:

```bash
vp run db:generate
```

Expected: Drizzle creates one new migration folder under `packages/db/migrations/`.

- [x] **Step 4: Inspect migration for forbidden scope**

Run:

```bash
rg -n "announcement|message|conversation|assessment|report_card|fee_|finance|vehicle|crew|run_event|maintenance|assistant|mcp" packages/db/migrations packages/db/src/schema
```

Expected: no matches in the new migration or current phase schema, except deferred mentions in docs outside `packages/db`.

- [x] **Step 5: Check local DATABASE_URL before applying**

Run:

```bash
pnpm dotenvx run -f ./packages/env/.env -- node -e "const url = process.env.DATABASE_URL ?? ''; console.log(url.replace(/:[^:@/]+@/, ':***@')); if (!/localhost|127\\.0\\.0\\.1/.test(url)) process.exit(1)"
```

Expected: prints a masked localhost or `127.0.0.1` URL and exits 0. If command exits 1, stop and ask user before migration.

- [x] **Step 6: Apply migration locally**

Run:

```bash
vp run db:migrate
```

Expected: migration applies to local PostgreSQL.

- [x] **Step 7: Update schema docs from planned to implemented**

Modify the opening sentence in `docs/SCHEMA.md`:

```md
This document describes the implemented School App MVP data model. The source of truth is `packages/db/src/schema/` plus generated Drizzle migrations.
```

Add this line under `## MVP Tables`:

```md
The tables below are part of the active academic MVP migration. Deferred modules remain documented after this section.
```

- [x] **Step 8: Run final approved validation**

Run:

```bash
vp run --filter @tsu-stack/core test:unit -- src/school/__tests__/types.test.ts
vp run --filter @tsu-stack/db test:unit -- src/schema/__tests__/school-schema-exports.test.ts
```

Expected: both commands PASS.

- [ ] **Step 9: Commit schema, migration, and docs**

Run:

```bash
git add packages/db/src/schema packages/db/migrations docs/SCHEMA.md
git commit -m "feat(db): add academic mvp schema migration"
```

## Self-Review Checklist

- Spec coverage: MVP staff actors, staff profiles, access roles, assignment roles, students, guardians, relationships, academic years, terms, grade levels, sections, subjects, enrollments, subject offerings, timetable, calendar exceptions, daily attendance, and basic transport assignment all map to tasks above.
- Scope exclusions: plan does not create finance, Edernal Books, parent portal, communication, chat, notification, AI/MCP, marksheet, vehicle, driver, run, GPS, maintenance, or incident tables.
- Role complexity: `academic_admin`, `front_office`, and `operations_staff` do not enter core constants or DB enums.
- Attendance simplicity: only `present` and `absent`; no period attendance.
- Calendar behavior: exceptions annotate/suppress attendance expectations; they do not create absence rows.
- Transport simplicity: rider assignment only; no operations layer.
- Type consistency: `organization_id` is `text` everywhere because Better Auth IDs are text in the new repo; School App domain IDs are UUIDs.
- Migration safety: plan checks `DATABASE_URL` before `db:migrate`.
