import { describe, expect, it } from "vitest";

import {
  academicTermCreateInputSchema,
  academicTermSchema,
  academicTermUpdateInputSchema,
  academicYearCreateInputSchema,
  academicYearUpdateInputSchema,
  attendanceStatusSchema,
  calendarEventTypeSchema,
  gradeLevelUpdateInputSchema,
  sectionCreateInputSchema,
  schoolAccessRoleSchema,
  schoolBootstrapCreateInputSchema,
  schoolBootstrapCreateOutputSchema,
  schoolBootstrapListOutputSchema,
  schoolSelectInputSchema,
  schoolSetupListOutputSchema,
  schoolSummarySchema,
  staffAccessGrantInputSchema,
  staffAccessRevokeInputSchema,
  staffAssignableRoleSchema,
  staffAssignmentRoleSchema,
  staffMemberCreateInputSchema,
  staffMemberSchema,
  staffMemberUpdateInputSchema,
  subjectCreateInputSchema,
  studentRelationshipTypeSchema,
  transportRideStatusSchema
} from "#@/school/types";
import { normalizeSchoolSlug } from "#@/school/utils";

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

  it("limits staff-manageable access roles to principal and teacher", () => {
    expect(staffAssignableRoleSchema.options).toEqual(["principal", "teacher"]);
    expect(() => staffAssignableRoleSchema.parse("owner")).toThrow("Invalid option");
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

  it("validates academic term transport records", () => {
    expect(
      academicTermSchema.parse({
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        createdAt: "2026-06-11T00:00:00.000Z",
        endDate: "2026-09-30",
        id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
        kind: "semester",
        name: "Term 1",
        sortOrder: 1,
        startDate: "2026-06-01",
        updatedAt: "2026-06-11T00:00:00.000Z"
      })
    ).toMatchObject({
      kind: "semester",
      name: "Term 1",
      sortOrder: 1
    });
  });

  it("validates academic term date ranges", () => {
    expect(() =>
      academicTermCreateInputSchema.parse({
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        endDate: "2026-06-01",
        name: "Term 1",
        startDate: "2026-09-30"
      })
    ).toThrow("Start date must be before or equal to end date.");

    expect(() =>
      academicTermUpdateInputSchema.parse({
        endDate: "2026-06-01",
        id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
        startDate: "2026-09-30"
      })
    ).toThrow("Start date must be before or equal to end date.");
  });

  it("defaults academic term create inputs", () => {
    expect(
      academicTermCreateInputSchema.parse({
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        endDate: "2026-09-30",
        name: "Term 1",
        startDate: "2026-06-01"
      })
    ).toMatchObject({
      kind: "custom",
      sortOrder: 0
    });
  });

  it("rejects negative and non-integer academic term sort orders", () => {
    expect(() =>
      academicTermCreateInputSchema.parse({
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        endDate: "2026-09-30",
        name: "Term 1",
        sortOrder: -1,
        startDate: "2026-06-01"
      })
    ).toThrow("Too small");

    expect(() =>
      academicTermCreateInputSchema.parse({
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        endDate: "2026-09-30",
        name: "Term 1",
        sortOrder: 1.5,
        startDate: "2026-06-01"
      })
    ).toThrow("Invalid input");
  });

  it("rejects incomplete academic term updates", () => {
    expect(() =>
      academicTermUpdateInputSchema.parse({
        id: "018f3ad5-8af8-733f-bb74-33f7f224f127"
      })
    ).toThrow("At least one field must be provided.");

    expect(() =>
      academicTermUpdateInputSchema.parse({
        id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
        startDate: "2026-06-01"
      })
    ).toThrow("Start date and end date must be updated together.");

    expect(() =>
      academicTermUpdateInputSchema.parse({
        endDate: "2026-09-30",
        id: "018f3ad5-8af8-733f-bb74-33f7f224f127"
      })
    ).toThrow("Start date and end date must be updated together.");
  });

  it("includes academic terms in school setup list output", () => {
    const output = schoolSetupListOutputSchema.parse({
      academicTerms: [],
      academicYears: [],
      canManageSetup: true,
      gradeLevels: [],
      sections: [],
      subjects: []
    });

    expect(output.academicTerms).toEqual([]);
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

  it("requires staff create inputs to include email", () => {
    expect(() =>
      staffMemberCreateInputSchema.parse({
        employeeCode: "T-100",
        fullName: "Asha Rao"
      })
    ).toThrow("Invalid input");
  });

  it("rejects staff create inputs with departments longer than 120 characters", () => {
    expect(() =>
      staffMemberCreateInputSchema.parse({
        department: "a".repeat(121),
        email: "asha.rao@example.com",
        employeeCode: "T-100",
        fullName: "Asha Rao"
      })
    ).toThrow("Too big");
  });

  it("serializes pending teacher staff member transport records", () => {
    const staffMember = {
      accessStatus: "pending",
      actorId: "018f3ad5-8af8-733f-bb74-33f7f224f128",
      createdAt: "2026-06-11T00:00:00.000Z",
      department: null,
      email: "asha.rao@example.com",
      employeeCode: "T-100",
      fullName: "Asha Rao",
      id: "018f3ad5-8af8-733f-bb74-33f7f224f126",
      invitationId: null,
      joinedOn: "2026-06-01",
      leftOn: null,
      phone: null,
      roles: ["teacher"],
      status: "active",
      title: null,
      updatedAt: "2026-06-11T00:00:00.000Z",
      userId: null
    };

    expect(staffMemberSchema.parse(staffMember)).toEqual(staffMember);
  });

  it("validates staff access grant and revoke inputs by staff profile id", () => {
    const input = {
      staffProfileId: "018f3ad5-8af8-733f-bb74-33f7f224f126"
    };

    expect(staffAccessGrantInputSchema.parse(input)).toEqual(input);
    expect(staffAccessRevokeInputSchema.parse(input)).toEqual(input);
    expect(() =>
      staffAccessGrantInputSchema.parse({
        staffProfileId: "not-a-uuid"
      })
    ).toThrow("Invalid UUID");
    expect(() =>
      staffAccessRevokeInputSchema.parse({
        staffProfileId: "not-a-uuid"
      })
    ).toThrow("Invalid UUID");
  });

  it("rejects id-only staff member updates", () => {
    expect(() =>
      staffMemberUpdateInputSchema.parse({
        id: "018f3ad5-8af8-733f-bb74-33f7f224f126"
      })
    ).toThrow("At least one field must be provided.");
  });

  it("rejects staff member updates with departments longer than 120 characters", () => {
    expect(() =>
      staffMemberUpdateInputSchema.parse({
        department: "a".repeat(121),
        id: "018f3ad5-8af8-733f-bb74-33f7f224f126"
      })
    ).toThrow("Too big");
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

  it("trims school bootstrap input and accepts omitted slug", () => {
    expect(
      schoolBootstrapCreateInputSchema.parse({
        name: "  Spring Valley School  "
      })
    ).toEqual({
      name: "Spring Valley School"
    });

    expect(
      schoolBootstrapCreateInputSchema.parse({
        name: "Spring Valley School",
        slug: "  spring-valley  "
      })
    ).toEqual({
      name: "Spring Valley School",
      slug: "spring-valley"
    });
  });

  it("normalizes generated school slugs in one shared utility", () => {
    expect(normalizeSchoolSlug("  Spring Valley School  ")).toBe("spring-valley-school");
    expect(normalizeSchoolSlug("A")).toBe("a-school");
    expect(normalizeSchoolSlug("!!!")).toBe("school");
    expect(normalizeSchoolSlug("North---East Academy")).toBe("north-east-academy");
    expect(normalizeSchoolSlug("a".repeat(100))).toHaveLength(80);
  });

  it("trims selected school id and rejects blank school selection", () => {
    expect(
      schoolSelectInputSchema.parse({
        id: "  org-1  "
      })
    ).toEqual({ id: "org-1" });

    expect(() => schoolSelectInputSchema.parse({ id: "  " })).toThrow("Too small");
  });

  it("keeps school bootstrap output focused on active school selection", () => {
    const school = {
      createdAt: "2026-06-11T00:00:00.000Z",
      id: "org-1",
      name: "Spring Valley School",
      role: "owner" as const,
      slug: "spring-valley"
    };

    expect(schoolSummarySchema.parse(school)).toEqual(school);
    expect(
      schoolBootstrapCreateOutputSchema.parse({
        activeSchool: school
      })
    ).toEqual({
      activeSchool: school
    });

    expect(
      schoolBootstrapListOutputSchema.parse({
        activeSchoolId: school.id,
        schools: [school]
      })
    ).toEqual({
      activeSchoolId: school.id,
      schools: [school]
    });

    expect(
      schoolBootstrapListOutputSchema.parse({
        activeSchoolId: null,
        schools: []
      })
    ).toEqual({
      activeSchoolId: null,
      schools: []
    });
  });
});
