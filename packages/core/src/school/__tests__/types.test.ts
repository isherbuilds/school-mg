import { describe, expect, it } from "vitest";

import {
  academicYearCreateInputSchema,
  academicYearUpdateInputSchema,
  attendanceStatusSchema,
  calendarEventTypeSchema,
  gradeLevelUpdateInputSchema,
  sectionCreateInputSchema,
  schoolAccessRoleSchema,
  staffAssignmentRoleSchema,
  subjectCreateInputSchema,
  studentRelationshipTypeSchema,
  transportRideStatusSchema
} from "#@/school/types";

describe("school domain contracts", () => {
  it("keeps MVP access roles intentionally small", () => {
    expect(schoolAccessRoleSchema.options).toEqual(["owner", "principal", "teacher"]);
    expect(() => schoolAccessRoleSchema.parse("academic_admin")).toThrow("Invalid option");
    expect(() => schoolAccessRoleSchema.parse("front_office")).toThrow("Invalid option");
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
    expect(() => attendanceStatusSchema.parse("late")).toThrow("Invalid option");
    expect(() => attendanceStatusSchema.parse("excused")).toThrow("Invalid option");
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

  it("validates academic year date ordering", () => {
    expect(() =>
      academicYearCreateInputSchema.parse({
        endDate: "2026-03-31",
        name: "2026-27",
        startDate: "2026-04-01"
      })
    ).toThrow("Start date must be before or equal to end date.");

    expect(
      academicYearCreateInputSchema.parse({
        endDate: "2027-03-31",
        name: "2026-27",
        startDate: "2026-04-01"
      })
    ).toMatchObject({ isCurrent: false });
  });

  it("defaults setup inputs without duplicating database defaults in callers", () => {
    expect(
      subjectCreateInputSchema.parse({
        code: "MATH",
        name: "Mathematics"
      })
    ).toMatchObject({ isCore: true });

    expect(
      sectionCreateInputSchema.parse({
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        code: "5A",
        gradeLevelId: "018f3ad5-8af8-733f-bb74-33f7f224f127",
        name: "Class 5 A"
      })
    ).toMatchObject({ shift: "full_day" });
  });

  it("rejects id-only setup updates", () => {
    expect(() =>
      gradeLevelUpdateInputSchema.parse({
        id: "018f3ad5-8af8-733f-bb74-33f7f224f126"
      })
    ).toThrow("At least one field must be provided.");
  });

  it("requires academic year date updates to include both bounds", () => {
    expect(() =>
      academicYearUpdateInputSchema.parse({
        id: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        startDate: "2026-04-01"
      })
    ).toThrow("Start date and end date must be updated together.");

    expect(
      academicYearUpdateInputSchema.parse({
        endDate: "2027-03-31",
        id: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        startDate: "2026-04-01"
      })
    ).toMatchObject({ endDate: "2027-03-31", startDate: "2026-04-01" });
  });
});
