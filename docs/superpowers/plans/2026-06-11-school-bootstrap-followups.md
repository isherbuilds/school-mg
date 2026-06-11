# School Bootstrap Follow-Ups Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to execute this plan. Keep scope limited to items 1-3 from the current next-step list. Items 4-7 are explicitly out of scope for this branch.

**Goal:** Validate the school bootstrap flow manually, add an authenticated school switcher, and polish bootstrap UX without starting the integration/API-key/webhook/accounting/transport/MCP work yet.

**Branch:** `feature/school-bootstrap-followups`

**Scope:**

- Item 1: Manual authenticated smoke test.
- Item 2: Add school switcher in authenticated shell.
- Item 3: Improve bootstrap UX for duplicate slug handling, generated slug preview, and clearer create/select states.

**Out of scope:**

- API keys, bearer auth, webhook/outbox model, audit logs.
- Accounting sync contract with `edernal-books`.
- Transport app slice.
- MCP or agent boundary.

---

## Task 1: Manual Authenticated Smoke Test

**Files:**

- No required source edits unless smoke test exposes a bug.

Steps:

- [x] Ensure branch is not `main`.
- [x] Ensure local database is running.
- [x] Ensure generated DB schema is applied.
- [x] Start the app locally.
- [x] Create or sign in with a throwaway test user.
- [x] Visit `/schools/new`.
- [x] Create first school and confirm redirect to `/school-setup`.
- [x] Return to `/schools/new`, create a second school, and confirm it becomes active.
- [x] Confirm `/school-setup` works for the active school.
- [x] Record any blocker or bug in this plan.

Notes:

- Manual API smoke found stale active-school reads when Better Auth session cookies contained cached `activeOrganizationId`; fixed by reading the active organization from the database `session` row by session id.
- Manual duplicate-slug smoke found wrapped Postgres unique violations returning 500; fixed by recursively checking wrapped database error causes and returning typed 409 errors.
- Browser smoke confirmed `/web/schools/new` renders for an authenticated user with the school switcher, multiple-school helper copy, active-school state, and create-school form.

Verification:

```bash
pnpm --filter @tsu-stack/web check
```

## Task 2: Authenticated School Switcher

**Files:**

- Create: `apps/web/src/features/navbar/ui/school-switcher.tsx`
- Modify: `apps/web/src/features/navbar/ui/navbar.tsx`
- Modify: `apps/web/src/features/navbar/ui/mobile-nav.tsx`
- Modify: `packages/i18n/messages/en.json`
- Modify: `packages/i18n/messages/de.json`

Steps:

- [x] Add `SchoolSwitcher` that reads `school.bootstrap.list` and uses `school.bootstrap.select`.
- [x] Show current school name in desktop navbar for authenticated users.
- [x] Put accessible school options in a dropdown menu with active state.
- [x] Include a `Create school` action linking to `/schools/new`.
- [x] Add a compact mobile placement in `MobileNavAuth`.
- [x] Invalidate school bootstrap and school setup queries after switching.
- [x] Keep switcher hidden for unauthenticated users and non-fatal when list fails.

Verification:

```bash
pnpm --filter @tsu-stack/web check
```

## Task 3: Bootstrap UX Polish

**Files:**

- Modify: `apps/web/src/pages/school-bootstrap/ui/school-bootstrap-page.tsx`
- Modify: `apps/web/src/pages/school-bootstrap/api/create-school.mutation.ts`
- Modify: `apps/web/src/pages/school-bootstrap/api/select-school.mutation.ts`
- Modify: `apps/web/src/shared/lib/form-values.ts`
- Modify: `packages/i18n/messages/en.json`
- Modify: `packages/i18n/messages/de.json`

Steps:

- [x] Add client-side generated slug preview from school name when slug is blank.
- [x] Make duplicate slug errors show a school-specific message.
- [x] Disable only the selected school row while switching.
- [x] Make the active school row non-clickable and visually stable.
- [x] Add concise helper text explaining that users can create multiple schools.
- [x] Preserve existing school setup form behavior after shared helper movement.

Verification:

```bash
pnpm --filter @tsu-stack/web check
pnpm --filter @tsu-stack/api test:unit -- school
pnpm --filter @tsu-stack/core test:unit -- school
```

## Completion

When all tasks pass, use `superpowers:finishing-a-development-branch`.
