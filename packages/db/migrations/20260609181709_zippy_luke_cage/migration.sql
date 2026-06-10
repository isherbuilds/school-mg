CREATE TYPE "attendance_status" AS ENUM('present', 'absent');--> statement-breakpoint
CREATE TYPE "calendar_attendance_behavior" AS ENUM('attendance_not_expected', 'attendance_expected_with_label');--> statement-breakpoint
CREATE TYPE "calendar_event_type" AS ENUM('holiday', 'closure', 'field_trip', 'half_day', 'late_start');--> statement-breakpoint
CREATE TYPE "enrollment_status" AS ENUM('enrolled', 'completed', 'withdrawn', 'transferred');--> statement-breakpoint
CREATE TYPE "guardian_status" AS ENUM('active', 'inactive', 'blocked');--> statement-breakpoint
CREATE TYPE "school_access_role" AS ENUM('owner', 'principal', 'teacher');--> statement-breakpoint
CREATE TYPE "school_actor_status" AS ENUM('invited', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "school_shift" AS ENUM('morning', 'afternoon', 'full_day', 'custom');--> statement-breakpoint
CREATE TYPE "staff_assignment_role" AS ENUM('coordinator', 'homeroom_teacher', 'subject_teacher', 'substitute_teacher');--> statement-breakpoint
CREATE TYPE "staff_status" AS ENUM('active', 'on_leave', 'inactive');--> statement-breakpoint
CREATE TYPE "student_relationship_type" AS ENUM('mother', 'father', 'guardian', 'grandparent', 'sibling', 'other');--> statement-breakpoint
CREATE TYPE "student_status" AS ENUM('prospect', 'active', 'inactive', 'withdrawn', 'alumni');--> statement-breakpoint
CREATE TYPE "term_kind" AS ENUM('semester', 'trimester', 'quarter', 'custom');--> statement-breakpoint
CREATE TYPE "transport_ride_status" AS ENUM('active', 'inactive', 'paused');--> statement-breakpoint
CREATE TYPE "transport_route_window" AS ENUM('morning', 'afternoon', 'both', 'custom');--> statement-breakpoint
CREATE TYPE "weekday" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TABLE "invitation" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"inviter_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"logo" text,
	"metadata" text,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"actor_id" uuid,
	"address" jsonb,
	"email" text,
	"full_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"notes" text,
	"organization_id" text NOT NULL,
	"phone" text,
	"preferred_language" text,
	"secondary_phone" text,
	"status" "guardian_status" DEFAULT 'active'::"guardian_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_actor_roles" (
	"active" boolean DEFAULT true NOT NULL,
	"actor_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"role" "school_access_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_actors" (
	"email" text,
	"full_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"last_seen_at" timestamp,
	"organization_id" text NOT NULL,
	"phone" text,
	"preferences" jsonb,
	"status" "school_actor_status" DEFAULT 'invited'::"school_actor_status" NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"actor_id" uuid NOT NULL,
	"department" text,
	"employee_code" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"joined_on" date,
	"left_on" date,
	"metadata" jsonb,
	"organization_id" text NOT NULL,
	"status" "staff_status" DEFAULT 'active'::"staff_status" NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_date_order_chk" CHECK ("left_on" IS NULL OR "joined_on" IS NULL OR "joined_on" <= "left_on")
);
--> statement-breakpoint
CREATE TABLE "student_relationships" (
	"can_pickup" boolean DEFAULT false NOT NULL,
	"emergency_contact" boolean DEFAULT false NOT NULL,
	"guardian_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_billing_contact" boolean DEFAULT false NOT NULL,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"notes" text,
	"organization_id" text NOT NULL,
	"receives_academic_updates" boolean DEFAULT true NOT NULL,
	"related_student_id" uuid,
	"relationship" "student_relationship_type" NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_relationships_target_chk" CHECK (("guardian_id" IS NOT NULL AND "related_student_id" IS NULL) OR ("guardian_id" IS NULL AND "related_student_id" IS NOT NULL)),
	CONSTRAINT "student_relationships_not_self_chk" CHECK ("related_student_id" IS NULL OR "student_id" <> "related_student_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"admission_number" text NOT NULL,
	"date_of_birth" date,
	"full_name" text NOT NULL,
	"gender" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"joined_on" date,
	"left_on" date,
	"medical_notes" text,
	"metadata" jsonb,
	"organization_id" text NOT NULL,
	"preferred_name" text,
	"status" "student_status" DEFAULT 'active'::"student_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "students_date_order_chk" CHECK ("left_on" IS NULL OR "joined_on" IS NULL OR "joined_on" <= "left_on")
);
--> statement-breakpoint
CREATE TABLE "academic_terms" (
	"academic_year_id" uuid NOT NULL,
	"end_date" date NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" "term_kind" DEFAULT 'custom'::"term_kind" NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"start_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "academic_terms_date_order_chk" CHECK ("start_date" <= "end_date")
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"end_date" date NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_current" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"start_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "academic_years_date_order_chk" CHECK ("start_date" <= "end_date")
);
--> statement-breakpoint
CREATE TABLE "grade_levels" (
	"code" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"academic_year_id" uuid NOT NULL,
	"capacity" integer,
	"code" text NOT NULL,
	"grade_level_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"shift" "school_shift" DEFAULT 'full_day'::"school_shift" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_assignments" (
	"academic_year_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"end_date" date,
	"grade_level_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"role" "staff_assignment_role" NOT NULL,
	"section_id" uuid,
	"staff_profile_id" uuid NOT NULL,
	"start_date" date,
	"subject_offering_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_assignments_scope_chk" CHECK (num_nonnulls("grade_level_id", "section_id", "subject_offering_id") = 1),
	CONSTRAINT "staff_assignments_date_order_chk" CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "start_date" <= "end_date")
);
--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"academic_year_id" uuid NOT NULL,
	"end_date" date,
	"grade_level_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"roll_number" text,
	"section_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"status" "enrollment_status" DEFAULT 'enrolled'::"enrollment_status" NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_enrollments_date_order_chk" CHECK ("end_date" IS NULL OR "start_date" <= "end_date")
);
--> statement-breakpoint
CREATE TABLE "subject_offerings" (
	"academic_year_id" uuid NOT NULL,
	"code" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"section_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"code" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_core" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"short_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"academic_year_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"marked_at" timestamp DEFAULT now() NOT NULL,
	"marked_by_actor_id" uuid,
	"organization_id" text NOT NULL,
	"remark" text,
	"section_id" uuid NOT NULL,
	"session_id" uuid,
	"status" "attendance_status" DEFAULT 'present'::"attendance_status" NOT NULL,
	CONSTRAINT "attendance_records_pk" PRIMARY KEY("session_id","enrollment_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"academic_year_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"calendar_event_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"locked_at" timestamp,
	"notes" text,
	"organization_id" text NOT NULL,
	"section_id" uuid NOT NULL,
	"taken_by_actor_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"academic_year_id" uuid NOT NULL,
	"attendance_behavior" "calendar_attendance_behavior" DEFAULT 'attendance_not_expected'::"calendar_attendance_behavior" NOT NULL,
	"description" text,
	"end_date" date NOT NULL,
	"event_type" "calendar_event_type" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"start_date" date NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_date_order_chk" CHECK ("start_date" <= "end_date")
);
--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"academic_year_id" uuid NOT NULL,
	"end_minute" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"room_label" text,
	"section_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"subject_offering_id" uuid NOT NULL,
	"teacher_actor_id" uuid,
	"weekday" "weekday" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "timetable_slots_time_order_chk" CHECK ("start_minute" < "end_minute"),
	CONSTRAINT "timetable_slots_time_bounds_chk" CHECK ("start_minute" >= 0 AND "end_minute" <= 1440)
);
--> statement-breakpoint
CREATE TABLE "transport_riders" (
	"active_from" date NOT NULL,
	"active_to" date,
	"afternoon_enabled" boolean DEFAULT true NOT NULL,
	"dropoff_stop_id" uuid NOT NULL,
	"emergency_guardian_name" text,
	"emergency_guardian_phone" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"morning_enabled" boolean DEFAULT true NOT NULL,
	"organization_id" text NOT NULL,
	"pickup_stop_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"status" "transport_ride_status" DEFAULT 'active'::"transport_ride_status" NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transport_riders_date_order_chk" CHECK ("active_to" IS NULL OR "active_from" <= "active_to"),
	CONSTRAINT "transport_riders_window_chk" CHECK ("morning_enabled" = TRUE OR "afternoon_enabled" = TRUE)
);
--> statement-breakpoint
CREATE TABLE "transport_route_stops" (
	"distance_from_start_km" numeric(8,2),
	"dropoff_minute" integer,
	"pickup_minute" integer,
	"organization_id" text NOT NULL,
	"route_id" uuid,
	"stop_id" uuid,
	"stop_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transport_route_stops_pk" PRIMARY KEY("route_id","stop_id"),
	CONSTRAINT "transport_route_stops_order_positive_chk" CHECK ("stop_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "transport_routes" (
	"active" boolean DEFAULT true NOT NULL,
	"code" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"notes" text,
	"organization_id" text NOT NULL,
	"window" "transport_route_window" DEFAULT 'both'::"transport_route_window" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_stops" (
	"active" boolean DEFAULT true NOT NULL,
	"address_line_1" text,
	"address_line_2" text,
	"code" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"latitude" numeric(10,7),
	"longitude" numeric(10,7),
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_organization_id" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_team_id" text;--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" ("email");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uidx" ON "member" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "guardians_actor_idx" ON "guardians" ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "guardians_organization_idx" ON "guardians" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_org_id_uidx" ON "guardians" ("organization_id","id");--> statement-breakpoint
CREATE INDEX "school_actor_roles_actor_active_idx" ON "school_actor_roles" ("organization_id","actor_id","active");--> statement-breakpoint
CREATE INDEX "school_actor_roles_organization_role_idx" ON "school_actor_roles" ("organization_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "school_actor_roles_actor_role_uidx" ON "school_actor_roles" ("organization_id","actor_id","role");--> statement-breakpoint
CREATE INDEX "school_actors_organization_idx" ON "school_actors" ("organization_id");--> statement-breakpoint
CREATE INDEX "school_actors_user_idx" ON "school_actors" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_actors_email_uidx" ON "school_actors" ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "school_actors_org_id_uidx" ON "school_actors" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_actors_user_uidx" ON "school_actors" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "staff_profiles_organization_idx" ON "staff_profiles" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_profiles_actor_uidx" ON "staff_profiles" ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_profiles_employee_code_uidx" ON "staff_profiles" ("organization_id","employee_code");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_profiles_org_id_uidx" ON "staff_profiles" ("organization_id","id");--> statement-breakpoint
CREATE INDEX "student_relationships_guardian_idx" ON "student_relationships" ("organization_id","guardian_id");--> statement-breakpoint
CREATE INDEX "student_relationships_related_student_idx" ON "student_relationships" ("organization_id","related_student_id");--> statement-breakpoint
CREATE INDEX "student_relationships_student_idx" ON "student_relationships" ("organization_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_relationships_guardian_uidx" ON "student_relationships" ("organization_id","student_id","guardian_id","relationship") WHERE "guardian_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "student_relationships_student_uidx" ON "student_relationships" ("organization_id","student_id","related_student_id","relationship") WHERE "related_student_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "students_organization_idx" ON "students" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_admission_number_uidx" ON "students" ("organization_id","admission_number");--> statement-breakpoint
CREATE UNIQUE INDEX "students_org_id_uidx" ON "students" ("organization_id","id");--> statement-breakpoint
CREATE INDEX "academic_terms_year_idx" ON "academic_terms" ("organization_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_terms_name_uidx" ON "academic_terms" ("organization_id","academic_year_id","name");--> statement-breakpoint
CREATE INDEX "academic_years_organization_idx" ON "academic_years" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_current_uidx" ON "academic_years" ("organization_id") WHERE "is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_name_uidx" ON "academic_years" ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_org_id_uidx" ON "academic_years" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_code_uidx" ON "grade_levels" ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_org_id_uidx" ON "grade_levels" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_name_uidx" ON "grade_levels" ("organization_id","name");--> statement-breakpoint
CREATE INDEX "sections_grade_idx" ON "sections" ("organization_id","grade_level_id");--> statement-breakpoint
CREATE INDEX "sections_year_idx" ON "sections" ("organization_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_attendance_scope_uidx" ON "sections" ("organization_id","id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_code_uidx" ON "sections" ("organization_id","academic_year_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_org_id_uidx" ON "sections" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_org_tuple_uidx" ON "sections" ("organization_id","id","academic_year_id","grade_level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_name_uidx" ON "sections" ("organization_id","academic_year_id","grade_level_id","name");--> statement-breakpoint
CREATE INDEX "staff_assignments_grade_idx" ON "staff_assignments" ("organization_id","grade_level_id");--> statement-breakpoint
CREATE INDEX "staff_assignments_section_idx" ON "staff_assignments" ("organization_id","section_id");--> statement-breakpoint
CREATE INDEX "staff_assignments_staff_profile_idx" ON "staff_assignments" ("organization_id","staff_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_assignments_grade_scope_uidx" ON "staff_assignments" ("organization_id","academic_year_id","staff_profile_id","role","grade_level_id") WHERE "active" = true AND "grade_level_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_assignments_section_scope_uidx" ON "staff_assignments" ("organization_id","academic_year_id","staff_profile_id","role","section_id") WHERE "active" = true AND "section_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_assignments_subject_scope_uidx" ON "staff_assignments" ("organization_id","academic_year_id","staff_profile_id","role","subject_offering_id") WHERE "active" = true AND "subject_offering_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "student_enrollments_section_idx" ON "student_enrollments" ("organization_id","section_id");--> statement-breakpoint
CREATE INDEX "student_enrollments_student_idx" ON "student_enrollments" ("organization_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_enrollments_attendance_scope_uidx" ON "student_enrollments" ("organization_id","section_id","academic_year_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_enrollments_open_uidx" ON "student_enrollments" ("organization_id","student_id") WHERE "end_date" IS NULL AND "status" = 'enrolled';--> statement-breakpoint
CREATE UNIQUE INDEX "student_enrollments_org_id_uidx" ON "student_enrollments" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_enrollments_roll_uidx" ON "student_enrollments" ("organization_id","section_id","roll_number");--> statement-breakpoint
CREATE INDEX "subject_offerings_section_idx" ON "subject_offerings" ("organization_id","section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_offerings_assignment_scope_uidx" ON "subject_offerings" ("organization_id","academic_year_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_offerings_org_id_uidx" ON "subject_offerings" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_offerings_timetable_scope_uidx" ON "subject_offerings" ("organization_id","section_id","academic_year_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_offerings_unique_uidx" ON "subject_offerings" ("organization_id","academic_year_id","section_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_code_uidx" ON "subjects" ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_org_id_uidx" ON "subjects" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_name_uidx" ON "subjects" ("organization_id","name");--> statement-breakpoint
CREATE INDEX "attendance_records_enrollment_idx" ON "attendance_records" ("organization_id","enrollment_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_section_date_idx" ON "attendance_sessions" ("organization_id","section_id","attendance_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sessions_record_scope_uidx" ON "attendance_sessions" ("organization_id","section_id","academic_year_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sessions_section_date_uidx" ON "attendance_sessions" ("organization_id","section_id","attendance_date");--> statement-breakpoint
CREATE INDEX "calendar_events_organization_start_idx" ON "calendar_events" ("organization_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_org_id_uidx" ON "calendar_events" ("organization_id","id");--> statement-breakpoint
CREATE INDEX "timetable_slots_section_idx" ON "timetable_slots" ("organization_id","section_id");--> statement-breakpoint
CREATE INDEX "timetable_slots_teacher_idx" ON "timetable_slots" ("organization_id","teacher_actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timetable_slots_section_slot_uidx" ON "timetable_slots" ("organization_id","section_id","weekday","slot_index");--> statement-breakpoint
CREATE INDEX "transport_riders_route_idx" ON "transport_riders" ("organization_id","route_id");--> statement-breakpoint
CREATE INDEX "transport_riders_status_idx" ON "transport_riders" ("organization_id","status");--> statement-breakpoint
CREATE INDEX "transport_riders_student_idx" ON "transport_riders" ("organization_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_riders_student_route_uidx" ON "transport_riders" ("organization_id","student_id","route_id","active_from");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_route_stops_order_uidx" ON "transport_route_stops" ("organization_id","route_id","stop_order");--> statement-breakpoint
CREATE INDEX "transport_routes_organization_idx" ON "transport_routes" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_routes_code_uidx" ON "transport_routes" ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_routes_org_id_uidx" ON "transport_routes" ("organization_id","id");--> statement-breakpoint
CREATE INDEX "transport_stops_organization_idx" ON "transport_stops" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_stops_code_uidx" ON "transport_stops" ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_stops_org_id_uidx" ON "transport_stops" ("organization_id","id");--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_actor_id_school_actors_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "school_actors"("id");--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_actor_org_fk" FOREIGN KEY ("organization_id","actor_id") REFERENCES "school_actors"("organization_id","id");--> statement-breakpoint
ALTER TABLE "school_actor_roles" ADD CONSTRAINT "school_actor_roles_actor_id_school_actors_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "school_actors"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_actor_roles" ADD CONSTRAINT "school_actor_roles_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_actor_roles" ADD CONSTRAINT "school_actor_roles_actor_org_fk" FOREIGN KEY ("organization_id","actor_id") REFERENCES "school_actors"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_actors" ADD CONSTRAINT "school_actors_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_actors" ADD CONSTRAINT "school_actors_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_actor_id_school_actors_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "school_actors"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_actor_org_fk" FOREIGN KEY ("organization_id","actor_id") REFERENCES "school_actors"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_relationships" ADD CONSTRAINT "student_relationships_guardian_id_guardians_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_relationships" ADD CONSTRAINT "student_relationships_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_relationships" ADD CONSTRAINT "student_relationships_related_student_id_students_id_fkey" FOREIGN KEY ("related_student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_relationships" ADD CONSTRAINT "student_relationships_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_relationships" ADD CONSTRAINT "student_relationships_student_org_fk" FOREIGN KEY ("organization_id","student_id") REFERENCES "students"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_relationships" ADD CONSTRAINT "student_relationships_guardian_org_fk" FOREIGN KEY ("organization_id","guardian_id") REFERENCES "guardians"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_relationships" ADD CONSTRAINT "student_relationships_related_student_org_fk" FOREIGN KEY ("organization_id","related_student_id") REFERENCES "students"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_grade_level_id_grade_levels_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "grade_levels"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_grade_org_fk" FOREIGN KEY ("organization_id","grade_level_id") REFERENCES "grade_levels"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_grade_level_id_grade_levels_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "grade_levels"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_section_id_sections_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_profile_id_staff_profiles_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_subject_offering_id_subject_offerings_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_profile_org_fk" FOREIGN KEY ("organization_id","staff_profile_id") REFERENCES "staff_profiles"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_grade_org_fk" FOREIGN KEY ("organization_id","grade_level_id") REFERENCES "grade_levels"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_section_scope_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id") REFERENCES "sections"("organization_id","id","academic_year_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_subject_offering_scope_fk" FOREIGN KEY ("organization_id","academic_year_id","subject_offering_id") REFERENCES "subject_offerings"("organization_id","academic_year_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_grade_level_id_grade_levels_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "grade_levels"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_section_id_sections_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_section_tuple_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id","grade_level_id") REFERENCES "sections"("organization_id","id","academic_year_id","grade_level_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_org_fk" FOREIGN KEY ("organization_id","student_id") REFERENCES "students"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_grade_org_fk" FOREIGN KEY ("organization_id","grade_level_id") REFERENCES "grade_levels"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_section_id_sections_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_subject_id_subjects_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_section_scope_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id") REFERENCES "sections"("organization_id","id","academic_year_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_subject_org_fk" FOREIGN KEY ("organization_id","subject_id") REFERENCES "subjects"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollment_id_student_enrollments_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_actor_id_school_actors_id_fkey" FOREIGN KEY ("marked_by_actor_id") REFERENCES "school_actors"("id");--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_attendance_sessions_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_actor_org_fk" FOREIGN KEY ("organization_id","marked_by_actor_id") REFERENCES "school_actors"("organization_id","id");--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_scope_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id","session_id") REFERENCES "attendance_sessions"("organization_id","section_id","academic_year_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollment_scope_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id","enrollment_id") REFERENCES "student_enrollments"("organization_id","section_id","academic_year_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_calendar_event_id_calendar_events_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_section_id_sections_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_taken_by_actor_id_school_actors_id_fkey" FOREIGN KEY ("taken_by_actor_id") REFERENCES "school_actors"("id");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_calendar_event_org_fk" FOREIGN KEY ("organization_id","calendar_event_id") REFERENCES "calendar_events"("organization_id","id");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_taken_by_actor_org_fk" FOREIGN KEY ("organization_id","taken_by_actor_id") REFERENCES "school_actors"("organization_id","id");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_section_scope_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id") REFERENCES "sections"("organization_id","id","academic_year_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_academic_year_id_academic_years_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_section_id_sections_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_offering_id_subject_offerings_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_actor_id_school_actors_id_fkey" FOREIGN KEY ("teacher_actor_id") REFERENCES "school_actors"("id");--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_year_org_fk" FOREIGN KEY ("organization_id","academic_year_id") REFERENCES "academic_years"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_section_scope_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id") REFERENCES "sections"("organization_id","id","academic_year_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_offering_scope_fk" FOREIGN KEY ("organization_id","section_id","academic_year_id","subject_offering_id") REFERENCES "subject_offerings"("organization_id","section_id","academic_year_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_actor_org_fk" FOREIGN KEY ("organization_id","teacher_actor_id") REFERENCES "school_actors"("organization_id","id");--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_dropoff_stop_id_transport_stops_id_fkey" FOREIGN KEY ("dropoff_stop_id") REFERENCES "transport_stops"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_pickup_stop_id_transport_stops_id_fkey" FOREIGN KEY ("pickup_stop_id") REFERENCES "transport_stops"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_route_id_transport_routes_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_student_org_fk" FOREIGN KEY ("organization_id","student_id") REFERENCES "students"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_route_org_fk" FOREIGN KEY ("organization_id","route_id") REFERENCES "transport_routes"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_pickup_stop_org_fk" FOREIGN KEY ("organization_id","pickup_stop_id") REFERENCES "transport_stops"("organization_id","id");--> statement-breakpoint
ALTER TABLE "transport_riders" ADD CONSTRAINT "transport_riders_dropoff_stop_org_fk" FOREIGN KEY ("organization_id","dropoff_stop_id") REFERENCES "transport_stops"("organization_id","id");--> statement-breakpoint
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_route_id_transport_routes_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_stop_id_transport_stops_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "transport_stops"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_route_org_fk" FOREIGN KEY ("organization_id","route_id") REFERENCES "transport_routes"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_stop_org_fk" FOREIGN KEY ("organization_id","stop_id") REFERENCES "transport_stops"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_stops" ADD CONSTRAINT "transport_stops_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;