import { pgEnum, timestamp } from "drizzle-orm/pg-core";

import {
  attendanceStatuses,
  calendarAttendanceBehaviors,
  calendarEventTypes,
  enrollmentStatuses,
  guardianStatuses,
  schoolAccessRoles,
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

export const schoolAccessRoleEnum = pgEnum("school_access_role", schoolAccessRoles);
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
