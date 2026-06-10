# School App MVP Design

Date: 2026-06-09

## Problem Statement

Build the first useful School App migration around staff-side school operations: academic setup, people records, scoped permissions, manual timetable, daily attendance, and basic transport assignment. Defer finance, Edernal Books integration, AI, MCP, chat, communication, marksheet generation, and full transport operations until the foundation is stable.

## Recommended Direction

Use phase-owned migrations and a roadmap-first documentation model. `packages/db/src/schema/` may be domain-oriented, but the active migration entrypoint should import only the current phase tables. Future modules are named in docs and ADRs so the model remains extensible without creating unused tables too early.

The MVP focuses on the Staff App for owners, principals, and teachers. Principal-owned setup creates grade levels, sections, subjects, students, guardians, relationships, enrollments, staff assignments, timetable slots, calendar exceptions, attendance sessions, and basic transport assignments. Teachers work through scoped assignments such as homeroom teacher, subject teacher, coordinator, or substitute teacher.

## Scope

### MVP

- Auth organization baseline from Better Auth.
- Staff actors and staff profiles.
- Access roles: owner, principal, teacher.
- Assignment roles: coordinator, homeroom teacher, subject teacher, substitute teacher.
- Students, guardians, and student relationships.
- Academic years, terms, grade levels, sections, subjects, enrollments, and subject offerings.
- Manual timetable slots.
- Calendar exceptions: holiday, closure, field trip, half day, late start.
- Daily section attendance with present and absent statuses.
- Basic transport assignment: stops, routes, route stops, and student rider assignments.

### Deferred

- Marksheet generator and report cards.
- Local fees.
- Edernal Books accounting integration.
- Parent portal.
- Communication, chat, notifications, and AI/MCP.
- Full transport operations: vehicles, crew, daily runs, GPS, incidents, maintenance, and compliance.

## Data Model

### People

- `school_actors`: staff identity inside an organization, optionally linked to a Better Auth user.
- `staff_profiles`: employee metadata and status, not permissions.
- `students`: stable learner records with lifecycle status.
- `guardians`: family/contact records.
- `student_relationships`: student-to-guardian or immediate-family links, with relationship type and contact flags.

### Academics

- `academic_years` and `academic_terms`.
- `grade_levels`.
- `sections`: academic-year and grade-level cohort.
- `subjects`.
- `student_enrollments`: time-bounded placement in academic year, grade level, and section.
- `subject_offerings`: subject taught to a section during an academic year.

### Permissions

- Access roles are organization-level.
- Assignment roles are scoped to grade levels, sections, or subject offerings.
- Relationship, section, student, and date scope checks belong in services, not in role names.

### Scheduling And Attendance

- `calendar_events`: attendance expectation and day-label exceptions.
- `timetable_slots`: manual weekly schedule slots.
- `attendance_sessions`: one daily section session.
- `attendance_records`: one student row per session, defaulted to present in the UI.

### Transport Assignment

- `transport_stops`, `transport_routes`, `transport_route_stops`, and `transport_riders`.
- This is not full transport operations.

## Access Rules

- `owner`: organization/bootstrap administration and principal management.
- `principal`: school-wide MVP operations, including student CRUD, academic setup, staff assignment, timetable, and attendance override.
- `teacher`: assigned roster/timetable visibility and scoped attendance.
- `coordinator`: scoped assignment for managing defined grade levels or sections.
- `homeroom_teacher`: scoped assignment for daily attendance in an assigned section.
- `subject_teacher`: scoped assignment for subject offering workflows.
- `substitute_teacher`: temporary scoped teaching access.

Student creation and editing are principal-owned in MVP. Enrollment access or accountant-driven admission workflows are deferred until the local fees/admission slice.

## Roadmap

### Preparatory Setup

- Maintain `CONTEXT.md` as glossary only.
- Keep ADRs for hard-to-reverse scope and semantic decisions.
- Add architecture, roadmap, and schema docs before implementation.
- Adopt phase-owned migrations.

### MVP

- Academic setup CRUD.
- Staff, teacher, and principal permissions.
- Students, guardians, relationships, and enrollment history.
- Manual timetable.
- Daily attendance.
- Basic transport assignment.

### Near Post-MVP

- Marksheet generator.
- Local fees: fee plans, billing parties, charges, receipts, and balances.
- Admission/enrollment access if needed.

### Later

- Edernal Books integration.
- Parent portal.
- Full transport operations.
- Communication, chat, and notifications.
- AI/MCP assistants.

## Key Assumptions

- Staff App creates the first usable value faster than parent portal or finance integration.
- Student CRUD without guardian/family relationships is not useful enough.
- Daily attendance is enough for MVP; period attendance can wait.
- Calendar exceptions should suppress or annotate attendance expectations, not generate absences.
- Edernal Books integration should wait until local fee semantics stabilize.

## Not Doing

- No schema-first import of every old school-manager table.
- No communication/platform/assistant tables in MVP migration.
- No finance tables in the first academic MVP migration.
- No timetable solver.
- No period attendance.
- No full transport operations.

## Verification Plan

Documentation phase:

- Self-review spec and docs for placeholders, contradictions, ambiguity, and scope creep.
- Ask user to review written docs before implementation planning.

Implementation phase:

- Generate migrations after schema edits.
- Check `DATABASE_URL` points to localhost before applying migrations.
- Run validation only at user-approved checkpoints, following `.agents/workflow.md`.
