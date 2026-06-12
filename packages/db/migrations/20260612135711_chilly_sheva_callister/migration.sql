ALTER TABLE "staff_assignments" DROP CONSTRAINT "staff_assignments_staff_profile_id_staff_profiles_id_fkey";--> statement-breakpoint
ALTER TABLE "staff_assignments" DROP CONSTRAINT "staff_assignments_staff_profile_org_fk";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_marked_by_actor_id_school_actors_id_fkey";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_marked_by_actor_org_fk";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP CONSTRAINT "attendance_sessions_taken_by_actor_id_school_actors_id_fkey";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP CONSTRAINT "attendance_sessions_taken_by_actor_org_fk";--> statement-breakpoint
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_teacher_actor_id_school_actors_id_fkey";--> statement-breakpoint
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_teacher_actor_org_fk";--> statement-breakpoint
ALTER TABLE "guardians" DROP CONSTRAINT "guardians_actor_id_school_actors_id_fkey";--> statement-breakpoint
ALTER TABLE "guardians" DROP CONSTRAINT "guardians_actor_org_fk";--> statement-breakpoint
ALTER TABLE "school_actor_roles" DROP CONSTRAINT "school_actor_roles_actor_id_school_actors_id_fkey";--> statement-breakpoint
ALTER TABLE "school_actor_roles" DROP CONSTRAINT "school_actor_roles_actor_org_fk";--> statement-breakpoint
ALTER TABLE "staff_profiles" DROP CONSTRAINT "staff_profiles_actor_id_school_actors_id_fkey";--> statement-breakpoint
ALTER TABLE "staff_profiles" DROP CONSTRAINT "staff_profiles_actor_org_fk";--> statement-breakpoint
DROP INDEX "staff_assignments_staff_profile_idx";--> statement-breakpoint
DROP INDEX "guardians_actor_idx";--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "employee_code" text;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "school_role" "school_access_role";--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "staff_status" "staff_status" DEFAULT 'active'::"staff_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "deactivation_reason" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "employee_code" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "school_role" "school_access_role";--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "staff_status" "staff_status" DEFAULT 'active'::"staff_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
INSERT INTO "member" ("id","organization_id","role","user_id","school_role","staff_status","department","employee_code","title","updated_at")
SELECT gen_random_uuid()::text, "staff_profiles"."organization_id", 'member', "school_actors"."user_id", "active_roles"."role", "staff_profiles"."status", "staff_profiles"."department", "staff_profiles"."employee_code", "staff_profiles"."title", now()
FROM "staff_profiles"
INNER JOIN "school_actors" ON "school_actors"."organization_id" = "staff_profiles"."organization_id" AND "school_actors"."id" = "staff_profiles"."actor_id"
LEFT JOIN LATERAL (
	SELECT "school_actor_roles"."role"
	FROM "school_actor_roles"
	WHERE "school_actor_roles"."organization_id" = "school_actors"."organization_id"
		AND "school_actor_roles"."actor_id" = "school_actors"."id"
		AND "school_actor_roles"."active" = true
	ORDER BY CASE "school_actor_roles"."role" WHEN 'owner' THEN 1 WHEN 'principal' THEN 2 ELSE 3 END
	LIMIT 1
) "active_roles" ON true
WHERE "school_actors"."user_id" IS NOT NULL
ON CONFLICT ("organization_id","user_id") DO UPDATE SET
	"school_role" = COALESCE(EXCLUDED."school_role", "member"."school_role"),
	"staff_status" = EXCLUDED."staff_status",
	"department" = EXCLUDED."department",
	"employee_code" = EXCLUDED."employee_code",
	"title" = EXCLUDED."title",
	"updated_at" = now();--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD COLUMN "member_id" text;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "marked_by_member_id" text;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "taken_by_member_id" text;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD COLUMN "teacher_member_id" text;--> statement-breakpoint
UPDATE "staff_assignments"
SET "member_id" = "member"."id"
FROM "staff_profiles"
INNER JOIN "school_actors" ON "school_actors"."organization_id" = "staff_profiles"."organization_id" AND "school_actors"."id" = "staff_profiles"."actor_id"
INNER JOIN "member" ON "member"."organization_id" = "staff_profiles"."organization_id" AND "member"."user_id" = "school_actors"."user_id"
WHERE "staff_assignments"."organization_id" = "staff_profiles"."organization_id"
	AND "staff_assignments"."staff_profile_id" = "staff_profiles"."id";--> statement-breakpoint
UPDATE "attendance_records"
SET "marked_by_member_id" = "member"."id"
FROM "school_actors"
INNER JOIN "member" ON "member"."organization_id" = "school_actors"."organization_id" AND "member"."user_id" = "school_actors"."user_id"
WHERE "attendance_records"."organization_id" = "school_actors"."organization_id"
	AND "attendance_records"."marked_by_actor_id" = "school_actors"."id";--> statement-breakpoint
UPDATE "attendance_sessions"
SET "taken_by_member_id" = "member"."id"
FROM "school_actors"
INNER JOIN "member" ON "member"."organization_id" = "school_actors"."organization_id" AND "member"."user_id" = "school_actors"."user_id"
WHERE "attendance_sessions"."organization_id" = "school_actors"."organization_id"
	AND "attendance_sessions"."taken_by_actor_id" = "school_actors"."id";--> statement-breakpoint
UPDATE "timetable_slots"
SET "teacher_member_id" = "member"."id"
FROM "school_actors"
INNER JOIN "member" ON "member"."organization_id" = "school_actors"."organization_id" AND "member"."user_id" = "school_actors"."user_id"
WHERE "timetable_slots"."organization_id" = "school_actors"."organization_id"
	AND "timetable_slots"."teacher_actor_id" = "school_actors"."id";--> statement-breakpoint
DELETE FROM "staff_assignments" WHERE "member_id" IS NULL;--> statement-breakpoint
ALTER TABLE "staff_assignments" ALTER COLUMN "member_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_assignments" DROP COLUMN "staff_profile_id";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP COLUMN "marked_by_actor_id";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP COLUMN "taken_by_actor_id";--> statement-breakpoint
ALTER TABLE "timetable_slots" DROP COLUMN "teacher_actor_id";--> statement-breakpoint
ALTER TABLE "guardians" DROP COLUMN "actor_id";--> statement-breakpoint
DROP TABLE "school_actor_roles";--> statement-breakpoint
DROP TABLE "school_actors";--> statement-breakpoint
DROP TABLE "staff_profiles";--> statement-breakpoint
DROP INDEX "staff_assignments_grade_scope_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "staff_assignments_grade_scope_uidx" ON "staff_assignments" ("organization_id","academic_year_id","member_id","role","grade_level_id") WHERE "active" = true AND "grade_level_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX "staff_assignments_section_scope_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "staff_assignments_section_scope_uidx" ON "staff_assignments" ("organization_id","academic_year_id","member_id","role","section_id") WHERE "active" = true AND "section_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX "staff_assignments_subject_scope_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "staff_assignments_subject_scope_uidx" ON "staff_assignments" ("organization_id","academic_year_id","member_id","role","subject_offering_id") WHERE "active" = true AND "subject_offering_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX "timetable_slots_teacher_idx";--> statement-breakpoint
CREATE INDEX "timetable_slots_teacher_idx" ON "timetable_slots" ("organization_id","teacher_member_id");--> statement-breakpoint
CREATE INDEX "invitation_school_access_idx" ON "invitation" ("organization_id","school_role","status");--> statement-breakpoint
CREATE INDEX "member_school_access_idx" ON "member" ("organization_id","school_role","staff_status");--> statement-breakpoint
CREATE UNIQUE INDEX "member_employee_code_uidx" ON "member" ("organization_id","employee_code") WHERE "employee_code" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_id_uidx" ON "member" ("organization_id","id");--> statement-breakpoint
CREATE INDEX "staff_assignments_member_idx" ON "staff_assignments" ("organization_id","member_id");--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_member_id_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_member_org_fk" FOREIGN KEY ("organization_id","member_id") REFERENCES "member"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_member_id_member_id_fkey" FOREIGN KEY ("marked_by_member_id") REFERENCES "member"("id");--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_member_org_fk" FOREIGN KEY ("organization_id","marked_by_member_id") REFERENCES "member"("organization_id","id");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_taken_by_member_id_member_id_fkey" FOREIGN KEY ("taken_by_member_id") REFERENCES "member"("id");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_taken_by_member_org_fk" FOREIGN KEY ("organization_id","taken_by_member_id") REFERENCES "member"("organization_id","id");--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_member_id_member_id_fkey" FOREIGN KEY ("teacher_member_id") REFERENCES "member"("id");--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_member_org_fk" FOREIGN KEY ("organization_id","teacher_member_id") REFERENCES "member"("organization_id","id");--> statement-breakpoint
DROP TYPE "school_actor_status";
