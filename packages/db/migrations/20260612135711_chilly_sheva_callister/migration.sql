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
DROP TABLE "school_actor_roles";--> statement-breakpoint
DROP TABLE "school_actors";--> statement-breakpoint
DROP TABLE "staff_profiles";--> statement-breakpoint
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
ALTER TABLE "staff_assignments" ADD COLUMN "member_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "marked_by_member_id" text;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "taken_by_member_id" text;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD COLUMN "teacher_member_id" text;--> statement-breakpoint
ALTER TABLE "staff_assignments" DROP COLUMN "staff_profile_id";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP COLUMN "marked_by_actor_id";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP COLUMN "taken_by_actor_id";--> statement-breakpoint
ALTER TABLE "timetable_slots" DROP COLUMN "teacher_actor_id";--> statement-breakpoint
ALTER TABLE "guardians" DROP COLUMN "actor_id";--> statement-breakpoint
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
