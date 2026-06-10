# Schema

This document describes the implemented School App MVP data model. Source of truth lives in `packages/db/src/schema/`; current migration is `packages/db/migrations/20260609181709_zippy_luke_cage/migration.sql`.

## Conventions

- Tenant-owned domain tables carry `organization_id`.
- Required tenant-owned references use organization-scoped foreign keys where cross-tenant mixing would corrupt data.
- Optional links that still affect tenant safety are scoped and protected instead of nullable `SET NULL` cleanup.
- Tenant list paths use `organization_id`-leading indexes.
- Table names use explicit domain language.
- Student history is modeled through enrollment rows, not destructive student edits.
- Access roles are organization-level.
- Assignment roles are scoped to exactly one grade level, section, or subject offering.
- Calendar exceptions do not create absences.
- Money and accounting semantics wait for the local fees phase.

## MVP Tables

Implemented in this phase:

- Better Auth organization baseline: `organization`, `member`, `invitation`, plus active organization/team session fields.
- School people, academics, scheduling, attendance, and basic transport assignment tables.
- Shared enum contracts in `packages/core/src/school/`.

Not implemented in this phase:

- Finance/fees, marksheets, communication, AI/MCP, parent portal, and full transport operations.

### Auth And Organization

Better Auth tables remain in the auth schema:

- `user`
- `session`
- `account`
- `verification`
- `organization`
- `member`
- `invitation`

### People

`school_actors`

- Staff identity inside an organization.
- Optionally linked to a Better Auth user.
- Used for principals, teachers, and future staff actors.

`staff_profiles`

- Employee metadata and status.
- Does not define permissions.

`students`

- Stable learner record.
- Lifecycle status includes room for `prospect`, `active`, `inactive`, `withdrawn`, and `alumni`.
- MVP UI primarily uses `active` and `inactive`.

`guardians`

- Contact and family records.
- Future parent portal access can link guardian to a user account.

`student_relationships`

- Links students to guardians or immediate family contacts.
- Carries `organization_id` and enforces tenant-safe student, guardian, and related-student links.
- Relationship examples: mother, father, guardian, grandparent, sibling, other.
- Stores contact flags such as primary contact, emergency contact, pickup allowed, and academic updates.

### Academics

`academic_years`

- School year boundaries and current-year marker.

`academic_terms`

- Term boundaries within an academic year.

`grade_levels`

- Academic levels such as Nursery, Class 1, Class 10.

`sections`

- Cohorts within a grade level and academic year.
- Example: Class 5 A.

`subjects`

- Reusable subject catalog.

`student_enrollments`

- Time-bounded placement of a student in academic year, grade level, and section.
- Section moves create new/closed enrollment episodes.

`subject_offerings`

- Subject taught to a section during an academic year.

### Permissions

`school_actor_roles`

- Stores access roles: `owner`, `principal`, `teacher`.

`staff_assignments`

- Stores assignment roles: `coordinator`, `homeroom_teacher`, `subject_teacher`, `substitute_teacher`.
- Stores one staff profile reference; the actor is derived through `staff_profiles`.
- Scope must point to exactly one grade level, section, or subject offering.
- Active duplicate assignments are blocked with partial unique indexes per scope type.

### Scheduling

`calendar_events`

- Holidays, closures, field trips, half days, and late starts.
- Controls whether attendance is expected or how the day is labelled.

`timetable_slots`

- Manual weekly schedule.
- Points to section, subject offering, assigned teacher, weekday, and time/period fields.

### Attendance

`attendance_sessions`

- One daily attendance session for a section.
- Not created for days where attendance is not expected.

`attendance_records`

- One row per enrolled student in a session.
- Carries organization, academic year, and section scope columns so the database enforces that session and enrollment match.
- MVP statuses: `present`, `absent`.
- UI defaults rows to `present`.

### Transport Assignment

`transport_stops`

- Pickup/drop points.

`transport_routes`

- Route definitions.

`transport_route_stops`

- Ordered stops per route.
- Carries `organization_id` and enforces tenant-safe route and stop links.

`transport_riders`

- Student route/stop assignment for pickup and drop visibility.

## Deferred Tables

Deferred until marksheet phase:

- grading scales
- assessments
- assessment results
- report cards
- report-card comments

Deferred until local fees phase:

- billing parties
- fee plans
- fee plan versions
- fee charges
- receipts
- receipt allocations
- balance snapshots

Deferred until Edernal Books integration:

- finance connections
- provider references
- sync runs
- webhook inbox

Deferred until full transport operations:

- vehicles
- crew
- daily runs
- run events
- incidents
- maintenance records
- compliance documents

Deferred until communication/AI phases:

- conversations
- messages
- notifications
- assistant threads
- assistant runs
- assistant artifacts
