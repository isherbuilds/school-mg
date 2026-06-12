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

const uuidSchema = z.uuid();
const nonEmptyTextSchema = z.string().trim().min(1);
const isoDateSchema = z.iso.date();

function hasUpdateFields(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((key) => key !== "id" && input[key] !== undefined);
}

export const schoolIdInputSchema = z.object({
  id: uuidSchema
});
export type SchoolIdInput = z.infer<typeof schoolIdInputSchema>;

const schoolSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");
const schoolOrganizationIdSchema = z.string().trim().min(1);

export const schoolBootstrapCreateInputSchema = z.object({
  name: nonEmptyTextSchema.max(160),
  slug: schoolSlugSchema.optional()
});
export type SchoolBootstrapCreateInput = z.infer<typeof schoolBootstrapCreateInputSchema>;

export const schoolSelectInputSchema = z.object({
  id: schoolOrganizationIdSchema
});
export type SchoolSelectInput = z.infer<typeof schoolSelectInputSchema>;

export const schoolSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  id: schoolOrganizationIdSchema,
  name: nonEmptyTextSchema,
  role: schoolAccessRoleSchema,
  slug: schoolSlugSchema
});
export type SchoolSummary = z.infer<typeof schoolSummarySchema>;

export const schoolBootstrapCreateOutputSchema = z.object({
  activeSchool: schoolSummarySchema
});
export type SchoolBootstrapCreateOutput = z.infer<typeof schoolBootstrapCreateOutputSchema>;

export const schoolBootstrapListOutputSchema = z.object({
  activeSchoolId: schoolOrganizationIdSchema.nullable(),
  schools: z.array(schoolSummarySchema)
});
export type SchoolBootstrapListOutput = z.infer<typeof schoolBootstrapListOutputSchema>;

export const staffAssignableRoleSchema = z.enum(["principal", "teacher"]);
export type StaffAssignableRole = z.infer<typeof staffAssignableRoleSchema>;

export const staffAccessStatusSchema = z.enum(["not_invited", "pending", "linked", "revoked"]);
export type StaffAccessStatus = z.infer<typeof staffAccessStatusSchema>;

export const staffMemberSchema = z.object({
  accessStatus: staffAccessStatusSchema,
  actorId: uuidSchema,
  createdAt: z.iso.datetime(),
  department: z.string().nullable(),
  email: z.email(),
  employeeCode: nonEmptyTextSchema,
  fullName: nonEmptyTextSchema,
  id: uuidSchema,
  invitationId: z.string().nullable(),
  joinedOn: isoDateSchema.nullable(),
  leftOn: isoDateSchema.nullable(),
  phone: z.string().nullable(),
  roles: z.array(staffAssignableRoleSchema),
  status: staffStatusSchema,
  title: z.string().nullable(),
  updatedAt: z.iso.datetime(),
  userId: z.string().nullable()
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

const staffMemberInputBaseSchema = z.object({
  department: nonEmptyTextSchema.max(120).nullable().optional(),
  email: z.email(),
  employeeCode: nonEmptyTextSchema.max(80),
  fullName: nonEmptyTextSchema.max(160),
  joinedOn: isoDateSchema.nullable().optional(),
  leftOn: isoDateSchema.nullable().optional(),
  phone: nonEmptyTextSchema.max(40).nullable().optional(),
  roles: z.array(staffAssignableRoleSchema).min(1),
  status: staffStatusSchema,
  title: nonEmptyTextSchema.max(120).nullable().optional()
});

export const staffMemberCreateInputSchema = staffMemberInputBaseSchema
  .extend({
    roles: z.array(staffAssignableRoleSchema).min(1).default(["teacher"]),
    status: staffStatusSchema.default("active")
  })
  .refine(
    (input) => input.joinedOn == null || input.leftOn == null || input.joinedOn <= input.leftOn,
    {
      message: "Joined date must be before or equal to left date.",
      path: ["leftOn"]
    }
  );
export type StaffMemberCreateInput = z.infer<typeof staffMemberCreateInputSchema>;

export const staffMemberUpdateInputSchema = staffMemberInputBaseSchema
  .partial()
  .extend({
    id: uuidSchema
  })
  .refine(hasUpdateFields, {
    message: "At least one field must be provided.",
    path: ["id"]
  })
  .refine(
    (input) => input.joinedOn == null || input.leftOn == null || input.joinedOn <= input.leftOn,
    {
      message: "Joined date must be before or equal to left date.",
      path: ["leftOn"]
    }
  );
export type StaffMemberUpdateInput = z.infer<typeof staffMemberUpdateInputSchema>;

export const staffListInputSchema = z.object({});
export type StaffListInput = z.infer<typeof staffListInputSchema>;

export const staffListOutputSchema = z.object({
  canManagePrincipalRole: z.boolean(),
  canManageStaff: z.boolean(),
  staff: z.array(staffMemberSchema)
});
export type StaffListOutput = z.infer<typeof staffListOutputSchema>;

export const staffAccessGrantInputSchema = z.object({
  staffProfileId: uuidSchema
});
export type StaffAccessGrantInput = z.infer<typeof staffAccessGrantInputSchema>;

export const staffAccessRevokeInputSchema = z.object({
  staffProfileId: uuidSchema
});
export type StaffAccessRevokeInput = z.infer<typeof staffAccessRevokeInputSchema>;

export const staffInvitationPreviewInputSchema = z.object({
  invitationId: z.string().min(1)
});
export type StaffInvitationPreviewInput = z.infer<typeof staffInvitationPreviewInputSchema>;

export const staffInvitationPreviewSchema = z.object({
  email: z.email(),
  expiresAt: z.iso.datetime(),
  invitationId: z.string(),
  organizationName: nonEmptyTextSchema,
  status: z.enum(["pending", "accepted", "rejected", "canceled", "expired"])
});
export type StaffInvitationPreview = z.infer<typeof staffInvitationPreviewSchema>;

export const academicYearSchema = z.object({
  createdAt: z.iso.datetime(),
  endDate: isoDateSchema,
  id: uuidSchema,
  isCurrent: z.boolean(),
  name: nonEmptyTextSchema,
  startDate: isoDateSchema,
  updatedAt: z.iso.datetime()
});
export type AcademicYear = z.infer<typeof academicYearSchema>;

const academicYearInputBaseSchema = z.object({
  endDate: isoDateSchema,
  isCurrent: z.boolean(),
  name: nonEmptyTextSchema.max(120),
  startDate: isoDateSchema
});

export const academicYearCreateInputSchema = academicYearInputBaseSchema
  .extend({
    isCurrent: z.boolean().default(false)
  })
  .refine((input) => input.startDate <= input.endDate, {
    message: "Start date must be before or equal to end date.",
    path: ["endDate"]
  });
export type AcademicYearCreateInput = z.infer<typeof academicYearCreateInputSchema>;

export const academicYearUpdateInputSchema = academicYearInputBaseSchema
  .partial()
  .extend({
    id: uuidSchema
  })
  .refine(hasUpdateFields, {
    message: "At least one field must be provided.",
    path: ["id"]
  })
  .refine(
    (input) =>
      input.startDate === undefined ||
      input.endDate === undefined ||
      input.startDate <= input.endDate,
    {
      message: "Start date must be before or equal to end date.",
      path: ["endDate"]
    }
  )
  .refine((input) => (input.startDate === undefined) === (input.endDate === undefined), {
    message: "Start date and end date must be updated together.",
    path: ["endDate"]
  });
export type AcademicYearUpdateInput = z.infer<typeof academicYearUpdateInputSchema>;

export const academicTermSchema = z.object({
  academicYearId: uuidSchema,
  createdAt: z.iso.datetime(),
  endDate: isoDateSchema,
  id: uuidSchema,
  kind: termKindSchema,
  name: nonEmptyTextSchema,
  sortOrder: z.number().int(),
  startDate: isoDateSchema,
  updatedAt: z.iso.datetime()
});
export type AcademicTerm = z.infer<typeof academicTermSchema>;

const academicTermInputBaseSchema = z.object({
  academicYearId: uuidSchema,
  endDate: isoDateSchema,
  kind: termKindSchema,
  name: nonEmptyTextSchema.max(120),
  sortOrder: z.number().int().min(0),
  startDate: isoDateSchema
});

export const academicTermCreateInputSchema = academicTermInputBaseSchema
  .extend({
    kind: termKindSchema.default("custom"),
    sortOrder: z.number().int().min(0).default(0)
  })
  .refine((input) => input.startDate <= input.endDate, {
    message: "Start date must be before or equal to end date.",
    path: ["endDate"]
  });
export type AcademicTermCreateInput = z.infer<typeof academicTermCreateInputSchema>;

export const academicTermUpdateInputSchema = academicTermInputBaseSchema
  .partial()
  .extend({
    id: uuidSchema
  })
  .refine(hasUpdateFields, {
    message: "At least one field must be provided.",
    path: ["id"]
  })
  .refine(
    (input) =>
      input.startDate === undefined ||
      input.endDate === undefined ||
      input.startDate <= input.endDate,
    {
      message: "Start date must be before or equal to end date.",
      path: ["endDate"]
    }
  )
  .refine((input) => (input.startDate === undefined) === (input.endDate === undefined), {
    message: "Start date and end date must be updated together.",
    path: ["endDate"]
  });
export type AcademicTermUpdateInput = z.infer<typeof academicTermUpdateInputSchema>;

export const gradeLevelSchema = z.object({
  code: nonEmptyTextSchema,
  createdAt: z.iso.datetime(),
  id: uuidSchema,
  name: nonEmptyTextSchema,
  sortOrder: z.number().int(),
  updatedAt: z.iso.datetime()
});
export type GradeLevel = z.infer<typeof gradeLevelSchema>;

const gradeLevelInputBaseSchema = z.object({
  code: nonEmptyTextSchema.max(40),
  name: nonEmptyTextSchema.max(120),
  sortOrder: z.number().int().min(0)
});

export const gradeLevelCreateInputSchema = gradeLevelInputBaseSchema.extend({
  sortOrder: z.number().int().min(0).default(0)
});
export type GradeLevelCreateInput = z.infer<typeof gradeLevelCreateInputSchema>;

export const gradeLevelUpdateInputSchema = gradeLevelInputBaseSchema
  .partial()
  .extend({
    id: uuidSchema
  })
  .refine(hasUpdateFields, {
    message: "At least one field must be provided.",
    path: ["id"]
  });
export type GradeLevelUpdateInput = z.infer<typeof gradeLevelUpdateInputSchema>;

export const subjectSchema = z.object({
  code: nonEmptyTextSchema,
  createdAt: z.iso.datetime(),
  id: uuidSchema,
  isCore: z.boolean(),
  name: nonEmptyTextSchema,
  shortName: z.string().nullable(),
  updatedAt: z.iso.datetime()
});
export type Subject = z.infer<typeof subjectSchema>;

const subjectInputBaseSchema = z.object({
  code: nonEmptyTextSchema.max(40),
  isCore: z.boolean(),
  name: nonEmptyTextSchema.max(120),
  shortName: nonEmptyTextSchema.max(40).nullable().optional()
});

export const subjectCreateInputSchema = subjectInputBaseSchema.extend({
  isCore: z.boolean().default(true)
});
export type SubjectCreateInput = z.infer<typeof subjectCreateInputSchema>;

export const subjectUpdateInputSchema = subjectInputBaseSchema
  .partial()
  .extend({
    id: uuidSchema
  })
  .refine(hasUpdateFields, {
    message: "At least one field must be provided.",
    path: ["id"]
  });
export type SubjectUpdateInput = z.infer<typeof subjectUpdateInputSchema>;

export const sectionSchema = z.object({
  academicYearId: uuidSchema,
  capacity: z.number().int().min(0).nullable(),
  code: nonEmptyTextSchema,
  createdAt: z.iso.datetime(),
  gradeLevelId: uuidSchema,
  id: uuidSchema,
  name: nonEmptyTextSchema,
  shift: schoolShiftSchema,
  updatedAt: z.iso.datetime()
});
export type Section = z.infer<typeof sectionSchema>;

const sectionInputBaseSchema = z.object({
  academicYearId: uuidSchema,
  capacity: z.number().int().min(0).nullable().optional(),
  code: nonEmptyTextSchema.max(40),
  gradeLevelId: uuidSchema,
  name: nonEmptyTextSchema.max(120),
  shift: schoolShiftSchema
});

export const sectionCreateInputSchema = sectionInputBaseSchema.extend({
  shift: schoolShiftSchema.default("full_day")
});
export type SectionCreateInput = z.infer<typeof sectionCreateInputSchema>;

export const sectionUpdateInputSchema = sectionInputBaseSchema
  .partial()
  .extend({
    id: uuidSchema
  })
  .refine(hasUpdateFields, {
    message: "At least one field must be provided.",
    path: ["id"]
  });
export type SectionUpdateInput = z.infer<typeof sectionUpdateInputSchema>;

export const schoolSetupListInputSchema = z.object({
  academicYearId: uuidSchema.optional()
});
export type SchoolSetupListInput = z.infer<typeof schoolSetupListInputSchema>;

export const schoolSetupListOutputSchema = z.object({
  academicTerms: z.array(academicTermSchema),
  academicYears: z.array(academicYearSchema),
  canManageSetup: z.boolean(),
  gradeLevels: z.array(gradeLevelSchema),
  sections: z.array(sectionSchema),
  subjects: z.array(subjectSchema)
});
export type SchoolSetupListOutput = z.infer<typeof schoolSetupListOutputSchema>;
