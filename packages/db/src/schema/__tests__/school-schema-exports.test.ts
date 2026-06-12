import { readFileSync } from "node:fs";

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
  member,
  organization,
  schoolAccessRoleEnum,
  sections,
  staffAssignments,
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

const academicMvpMigration = "20260609181709_zippy_luke_cage";
const memberCentricStaffMigration = "20260612135711_chilly_sheva_callister";

function readAcademicMvpMigration() {
  return readFileSync(
    new URL(`../../../migrations/${academicMvpMigration}/migration.sql`, import.meta.url),
    "utf8"
  );
}

function readMemberCentricStaffMigration() {
  return readFileSync(
    new URL(`../../../migrations/${memberCentricStaffMigration}/migration.sql`, import.meta.url),
    "utf8"
  );
}

describe("school schema exports", () => {
  it("exports organization baseline and academic MVP tables", () => {
    expect(getTableName(organization)).toBe("organization");
    expect(getTableName(member)).toBe("member");
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

  it("imports shared school contracts through the core package boundary", () => {
    const sharedSchema = readFileSync(new URL("../school.shared.ts", import.meta.url), "utf8");

    expect(sharedSchema).toContain('from "@tsu-stack/core/school"');
    expect(sharedSchema).not.toContain("../../../core/src");
  });

  it("keeps tenant-owned join tables tenant scoped", () => {
    const migration = readAcademicMvpMigration();

    expect(migration).toContain('CREATE TABLE "student_relationships"');
    expect(migration).toContain('"organization_id" text NOT NULL');
    expect(migration).toContain('CREATE TABLE "attendance_records"');
    expect(migration).toContain('CREATE TABLE "transport_route_stops"');
  });

  it("enforces tenant-safe attendance record scope", () => {
    const migration = readAcademicMvpMigration();

    expect(migration).toContain("attendance_records_session_scope_fk");
    expect(migration).toContain("attendance_records_enrollment_scope_fk");
  });

  it("uses partial unique indexes for nullable staff assignment scopes", () => {
    const migration = readMemberCentricStaffMigration();

    expect(migration).toContain("staff_assignments_grade_scope_uidx");
    expect(migration).toContain("staff_assignments_section_scope_uidx");
    expect(migration).toContain("staff_assignments_subject_scope_uidx");
    expect(migration).toContain('"member_id"');
    expect(migration).toContain('WHERE "active" = true');
  });

  it("enforces section and year scope for subject offerings and timetable slots", () => {
    const migration = readAcademicMvpMigration();

    expect(migration).toContain("subject_offerings_section_scope_fk");
    expect(migration).toContain("staff_assignments_section_scope_fk");
    expect(migration).toContain("staff_assignments_subject_offering_scope_fk");
    expect(migration).toContain("timetable_slots_subject_offering_scope_fk");
  });

  it("bounds transport route stop minutes and distance", () => {
    const migration = readAcademicMvpMigration();

    expect(migration).toContain("transport_route_stops_pickup_minute_bounds_chk");
    expect(migration).toContain("transport_route_stops_dropoff_minute_bounds_chk");
    expect(migration).toContain("transport_route_stops_distance_non_negative_chk");
  });

  it("allows only one current academic year per organization", () => {
    const migration = readAcademicMvpMigration();

    expect(migration).toContain("academic_years_current_uidx");
    expect(migration).toContain('WHERE "is_current" = true');
  });

  it("scopes optional member references to the same tenant", () => {
    const migration = readMemberCentricStaffMigration();

    expect(migration).toContain("member_org_id_uidx");
    expect(migration).toContain("timetable_slots_teacher_member_org_fk");
    expect(migration).toContain("attendance_sessions_taken_by_member_org_fk");
    expect(migration).toContain("attendance_records_marked_by_member_org_fk");
  });

  it("keeps staff lifecycle fields off the auth member and invitation rows", () => {
    const migration = readMemberCentricStaffMigration();

    expect(migration).not.toContain('ALTER TABLE "member" ADD COLUMN "joined_on"');
    expect(migration).not.toContain('ALTER TABLE "member" ADD COLUMN "left_on"');
    expect(migration).not.toContain('ALTER TABLE "member" ADD COLUMN "metadata" jsonb');
    expect(migration).not.toContain('ALTER TABLE "invitation" ADD COLUMN "joined_on"');
    expect(migration).not.toContain('ALTER TABLE "invitation" ADD COLUMN "left_on"');
    expect(migration).not.toContain('ALTER TABLE "invitation" ADD COLUMN "metadata" jsonb');
  });

  it("does not mix nullable SET NULL with tenant-scoped composite foreign keys", () => {
    const migration = readAcademicMvpMigration();

    expect(migration).toContain("calendar_events_year_org_fk");
    expect(migration).toContain("timetable_slots_subject_offering_scope_fk");
    expect(migration).toContain("transport_riders_dropoff_stop_org_fk");
    expect(migration).toContain('"academic_year_id" uuid NOT NULL');
    expect(migration).toContain('"subject_offering_id" uuid NOT NULL');
    expect(migration).toContain('"dropoff_stop_id" uuid NOT NULL');
    expect(migration).not.toContain(
      'CONSTRAINT "calendar_events_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL'
    );
    expect(migration).not.toContain(
      'CONSTRAINT "timetable_slots_subject_offering_id_subject_offerings_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE SET NULL'
    );
    expect(migration).not.toContain(
      'CONSTRAINT "transport_riders_dropoff_stop_id_transport_stops_id_fkey" FOREIGN KEY ("dropoff_stop_id") REFERENCES "transport_stops"("id") ON DELETE SET NULL'
    );
  });
});
