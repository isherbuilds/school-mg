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
