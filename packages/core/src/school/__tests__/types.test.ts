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
