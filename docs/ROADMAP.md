# Roadmap

Status legend: planned, active, done.

## Preparatory Setup

Status: done.

Goal: make the new repo safe for phased migration from `school-manager-monorepo`.

- [x] Define glossary in `CONTEXT.md`.
- [x] Record ADR for access roles and assignment roles.
- [x] Record ADR for daily attendance and calendar exceptions.
- [x] Record ADR for local fees before accounting integration.
- [x] Record ADR for School App, transport, and Edernal Books boundaries.
- [x] Record ADR for school bootstrap through a School App procedure.
- [x] Record ADR for external APIs, MCP, channel identity, and agent auth boundaries.
- [x] Add MVP schema modules and active migration entrypoint.
- [x] Generate first academic MVP migration.

## MVP: Staff Academic Operations

Status: active.

Goal: principal can set up the school, create students and guardians, assign teachers, publish a manual timetable, and teachers can mark daily section attendance.

Scope:

- Auth organization baseline, exposed to users as school creation.
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
- Basic transport assignment only: stops, routes, route stops, and student riders.

Current implementation status:

- Done: MVP schema modules, phase-owned migration, shared school contracts, school creation bootstrap with active-school selection, school switcher, and school setup CRUD for academic years, academic terms, grade levels, sections, and subjects.
- Next: staff management for principals and teachers.
- Then: student and guardian records, enrollment history, subject offerings, staff assignments, timetable, attendance, and basic transport assignment.

Exit criteria:

- Signed-in user creates a school and becomes its School Admin.
- Principal creates academic structure.
- Principal creates student with guardian relationships and enrollment.
- Principal assigns teacher to section or subject offering.
- Teacher sees assigned timetable/roster.
- Teacher marks daily attendance with present default and absent exceptions.
- Student profile shows basic transport route assignment when configured, without transport expenses or operations.

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
- Scoped API credentials, idempotency keys, webhook delivery records, and external accounting references.

## Later: Parent Portal

Status: planned.

Goal: guardian-facing visibility into attendance, homework, announcements, fees, and acknowledgements.

Parent portal waits until staff-side data is reliable.

## Later: Full Transport Operations

Status: planned.

Goal: expand basic transport assignment into operational transport management, while keeping accounting truth in Edernal Books.

Likely scope:

- Vehicles.
- Drivers and attendants.
- Daily runs.
- Incidents.
- GPS/provider hooks.
- Maintenance and compliance.
- Fuel, maintenance, toll, advance, and route/run expense capture.
- API and webhook integration with Edernal Books for posted accounting documents.

## Later: Integration Platform

Status: planned.

Goal: add stable external APIs, webhooks, SDKs, MCP access, channel identity links, and agent tool execution once core operational data and permissions are stable.

Likely scope:

- Versioned external APIs.
- Scoped API keys or bearer tokens for server-to-server integrations.
- Webhook subscriptions, delivery logs, retries, and idempotency.
- Generated TypeScript SDK when public contracts stabilize.
- Hosted MCP endpoint using delegated OAuth where clients support it.
- Installable MCP/server tooling for local clients where needed.
- Platform identity linking for WhatsApp, Telegram, Slack, or similar channels.
- Audit logs for external API, MCP, webhook, and agent tool activity.

## Later: Communication, Chat, AI, And MCP

Status: planned.

Goal: add communication and assistant workflows on top of the Integration Platform once core operational data and permissions are stable.

Likely scope:

- Announcements and leave requests.
- Notifications.
- Chat or class streams where moderated.
- AI assistant with human review.
- MCP/tool access through scoped Integration Platform credentials.
- WhatsApp or channel bots through explicit platform identity links.

Non-goals:

- Student social network.
- Open student DMs.
- Generic student chatbot.
