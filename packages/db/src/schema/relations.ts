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
      section: r.one.sections({
        from: r.staffAssignments.sectionId,
        to: r.sections.id
      }),
      staffProfile: r.one.staffProfiles({
        from: r.staffAssignments.staffProfileId,
        to: r.staffProfiles.id
      }),
      subjectOffering: r.one.subjectOfferings({
        from: r.staffAssignments.subjectOfferingId,
        to: r.subjectOfferings.id
      })
    },
    staffProfiles: {
      assignments: r.many.staffAssignments({
        from: r.staffProfiles.id,
        to: r.staffAssignments.staffProfileId
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
      dropoffStop: r.one.transportStops({
        from: r.transportRiders.dropoffStopId,
        to: r.transportStops.id
      }),
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
