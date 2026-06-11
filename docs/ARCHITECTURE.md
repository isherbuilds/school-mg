# Architecture

School App is a staff-first school operations system. The first release focuses on academic setup, people records, scoped permissions, timetable, attendance, and basic transport assignment.

## Product Shape

The product is intentionally phased:

- Staff App first.
- Local fees after academic operations stabilize.
- Edernal Books integration after local fee semantics stabilize.
- Parent portal, full transport operations, communication, chat, notifications, external APIs, AI, and MCP later.

In product language, a user creates a school. The implementation may use Better Auth organization records for tenancy and membership, but organization is integration language rather than the preferred Staff App term. School creation goes through a School App bootstrap procedure so the underlying organization, active school selection, school actor, and owner access role are established as one domain workflow.

## Workspace Shape

The new repo uses the existing `tsu-stack` structure:

```text
apps/
  web/              Staff App surface for the MVP
  server/           Server runtime shell

packages/
  db/               Drizzle schema, migrations, database access
  core/             Shared domain contracts and pure logic
  api/              oRPC contracts and server procedures
  auth/             Better Auth integration and access model
  ui/               Shared UI primitives
  i18n/             Paraglide messages and locale runtime
  logger/           Logging integration
  seo/              SEO helpers
```

## Dependency Rules

- `packages/db` owns persistence schema and does not import application code.
- `packages/core` owns shared domain contracts that cross API and frontend boundaries.
- `packages/api` exposes typed oRPC contracts and procedures.
- `apps/web` consumes `packages/api`, `packages/core`, `packages/auth`, and `packages/ui`.
- Future Edernal Books integration crosses through explicit API/service contracts, webhooks, idempotent events, and external references, not direct table sharing.
- Future external APIs, MCP tools, channel bots, and agents cross through an Integration Platform layer with scoped credentials, school scoping, and audit records.

## Migration Strategy

Use phase-owned migrations. Schema modules may stay domain-oriented for developer experience, but the active migration entrypoint imports only tables owned by current and completed phases.

The MVP migration includes only:

- auth/org baseline
- staff actors and profiles
- student, guardian, and relationship records
- academic setup
- staff assignments
- timetable
- calendar exceptions
- daily attendance
- basic transport assignment

Future modules are documented in the roadmap but not migrated until their phase begins.

## Authorization Model

School App separates organization-level access roles from contextual assignment roles.

Access roles:

- `owner`
- `principal`
- `teacher`

Assignment roles:

- `coordinator`
- `homeroom_teacher`
- `subject_teacher`
- `substitute_teacher`

Access roles control broad app access and mutation surfaces. Assignment roles scope what a staff member can do for specific grade levels, sections, or subject offerings.

## Data Ownership

School App owns:

- students, guardians, relationships
- academic years, terms, grade levels, sections, subjects
- enrollment history
- staff assignments and timetable
- attendance and calendar exceptions
- basic transport assignment
- local fees when that phase begins

Future Transport App owns:

- vehicles, drivers, attendants, and crew
- operational routes and daily runs
- incidents, GPS/provider hooks, maintenance, expenses, and compliance

Edernal Books owns:

- official accounting documents
- ledger truth
- invoices, bills, receipts, payments, vendors, and parties
- accounting reports
- external accounting integrations

School App and future Transport App may record operational facts and accounting-ready intent, but Edernal Books posts accounting documents and returns accounting document IDs, status, and ledger outcomes. School App will connect to Edernal Books only after local fee semantics are stable.

## Integration Platform

The Integration Platform is a later shared capability for public APIs, generated SDKs, webhooks, MCP tools, channel bots, and agent tool execution.

Credential lanes:

- Staff App sessions for human browser workflows.
- Scoped API keys or bearer tokens for server-to-server external APIs.
- OAuth grants for hosted MCP and third-party connectors that act on behalf of a staff user within a selected school.
- Platform identity links for WhatsApp, Telegram, Slack, or similar channels.

Integration calls must resolve a school, user or service principal, scope, and audit context before touching school data. Public APIs expose versioned contracts and stable resource IDs. They do not expose Drizzle tables or internal oRPC procedures directly.

Agents and MCP tools use typed procedures behind the same authorization checks as the app. High-impact actions require explicit product approval flows rather than silent tool execution.

## Data Integrity

Tenant safety is a database invariant, not only an application convention. Tenant-owned domain tables carry `organization_id`, required cross-table links use organization-scoped foreign keys where mismatches would corrupt records, and hot list indexes lead with `organization_id`.

Staff assignments store the staff profile only; actor identity is reached through the profile. Attendance records carry the same organization, academic year, and section scope as their session and enrollment so a record cannot mix roster data from another section or year.
