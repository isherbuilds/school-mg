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
