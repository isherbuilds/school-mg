# Roadmap

Status legend: planned, active, done.

## Preparatory Setup

Status: done.

Goal: make the new repo safe for phased migration from `school-manager-monorepo`.

- [x] Define glossary in `CONTEXT.md`.
- [x] Record ADR for access roles and assignment roles.
- [x] Record ADR for daily attendance and calendar exceptions.
- [x] Record ADR for local fees before accounting integration.
- [x] Add MVP schema modules and active migration entrypoint.
- [x] Generate first academic MVP migration.

## MVP: Staff Academic Operations

Status: active.

Goal: principal can set up the school, create students and guardians, assign teachers, publish a manual timetable, and teachers can mark daily section attendance.

Scope:

- Auth organization baseline.
- Access roles: owner, principal, teacher.
- Assignment roles: coordinator, homeroom teacher, subject teacher, substitute teacher.
- School setup API contracts and protected oRPC router for academic years, grade levels, sections, and subjects.
- Staff actors and profiles.
- Grade levels, sections, subjects, academic years, and terms.
- Students, guardians, and student relationships.
- Enrollment history.
- Subject offerings.
- Manual timetable.
- Calendar exceptions.
- Daily section attendance.
- Basic transport assignment: stops, routes, route stops, and student riders.

Exit criteria:

- Principal creates academic structure.
- Principal creates student with guardian relationships and enrollment.
- Principal assigns teacher to section or subject offering.
- Teacher sees assigned timetable/roster.
- Teacher marks daily attendance with present default and absent exceptions.
- Student profile shows basic transport route assignment when configured.

## Near Post-MVP: Marksheet

Status: planned.

Goal: create academic result documents after attendance and academic structure are stable.

Likely scope:

- Grading scales.
- Assessments.
- Assessment results.
- Report-card draft/review/publish flow.
- Printable marksheet generator.

## Near Post-MVP: Local Fees

Status: planned.

Goal: support school-owned fee planning, charges, receipts, and balances without requiring Edernal Books uptime.

Likely scope:

- Billing parties.
- Billing-party student ownership.
- Fee plans and fee plan versions.
- Fee charges.
- Receipts and allocations.
- Balance snapshots.
- Admission/enrollment access if fee workflows require it.

## Later: Edernal Books Integration

Status: planned.

Goal: sync stable local fee records to Edernal Books for official accounting documents and ledger truth.

Likely scope:

- Accounting connection settings.
- Party mapping.
- Charge-to-invoice sync.
- Receipt sync.
- Status/activity read models.
- Replay-safe sync runs.

## Later: Parent Portal

Status: planned.

Goal: guardian-facing visibility into attendance, homework, announcements, fees, and acknowledgements.

Parent portal waits until staff-side data is reliable.

## Later: Full Transport Operations

Status: planned.

Goal: expand basic transport assignment into operational transport management.

Likely scope:

- Vehicles.
- Drivers and attendants.
- Daily runs.
- Incidents.
- GPS/provider hooks.
- Maintenance and compliance.

## Later: Communication, Chat, AI, And MCP

Status: planned.

Goal: add communication and assistant workflows once core operational data and permissions are stable.

Likely scope:

- Announcements and leave requests.
- Notifications.
- Chat or class streams where moderated.
- AI assistant with human review.
- MCP/tool access with auditability.

Non-goals:

- Student social network.
- Open student DMs.
- Generic student chatbot.
