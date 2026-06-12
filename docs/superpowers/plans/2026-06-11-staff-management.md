# Staff Directory And Invite-Only Staff Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build invite-only Staff App onboarding: School Admins create staff records, send Staff Invitations, invited users create/sign in only through the invitation path, verify email, accept membership, and receive School-scoped access.

**Architecture:** Keep Better Auth responsible for users, sessions, email verification, organization membership, and organization invitations. Keep School App responsible for staff directory records, school actor linking, access-role authorization, and route gating. Generic account creation is blocked server-side; public sign-in stays available.

**Tech Stack:** TanStack Start, Hono, oRPC, Drizzle, Better Auth organization plugin, Better Auth email/password, Paraglide.js, TanStack Query, Zod, Vite Plus.

---

## Source Notes

- Better Auth email/password supports `disableSignUp`, `requireEmailVerification`, `sendResetPassword`, and `emailVerification.sendVerificationEmail`.
- Better Auth organization plugin supports `requireEmailVerificationOnInvitation`, `sendInvitationEmail`, `listUserInvitations`, `acceptInvitation`, `rejectInvitation`, and `setActive`.
- Better Auth client organization methods require `organizationClient()` in `packages/auth/src/react/auth-client.ts`.
- This repo already has Better Auth tables: `user`, `session`, `organization`, `member`, `invitation`.
- This repo already has School App person/access tables: `school_actors`, `staff_profiles`, `school_actor_roles`.

## Domain Decisions

- Public sign-in remains available.
- Public signup is closed.
- Generic `/create-an-account` does not create accounts.
- Account creation succeeds only through a valid pending Staff Invitation or first-user root bootstrap.
- Root bootstrap signup is allowed only while the `user` table is empty and email is allowlisted in `ROOT_BOOTSTRAP_EMAILS`.
- School creation is limited to root bootstrap users. Invited teachers/principals cannot create Schools.
- Staff Members require email in MVP.
- Better Auth organization membership alone is not enough for School access.
- School route access requires authenticated user, active School, Better Auth membership, linked `school_actors.user_id`, and active `school_actor_roles`.
- Staff Access revocation deletes/deactivates Better Auth membership, deactivates School App roles, clears active sessions for that School, and preserves `school_actors` plus `staff_profiles`.

## File Structure

### Auth, Env, Email

- Modify: `packages/env/src/server/env.ts`
  - Add `ROOT_BOOTSTRAP_EMAILS`, `RESEND_API_KEY`, and `EMAIL_FROM`.
- Modify: `packages/env/.env.example`
  - Document new server env vars.
- Modify: `docker-compose.yaml`
  - Pass new env vars into server container.
- Modify: `apps/server/Dockerfile`
  - Add new build/runtime env declarations for server auth settings.
- Modify: `.github/README.md`
  - Document new env vars.
- Modify: `packages/auth/package.json`
  - Add `test:unit` script for auth unit tests.
- Create: `packages/auth/src/email.ts`
  - Send verification and invitation emails through Resend HTTP API.
- Create: `packages/auth/src/signup-headers.ts`
  - Export invitation signup header names shared by server and browser code.
- Create: `packages/auth/src/invitation-signup-gate.ts`
  - Validate invitation signup and root bootstrap signup in one server-only helper.
- Test: `packages/auth/src/__tests__/invitation-signup-gate.test.ts`
  - Unit tests for blocked public signup, valid invitation signup, invalid invitation signup, bootstrap allowlist, and bootstrap closing.
- Modify: `packages/auth/src/index.ts`
  - Add signup gate hook, Better Auth email verification, organization invitation config, and staff invitation acceptance hook.
- Modify: `packages/auth/src/react/auth-client.ts`
  - Add `organizationClient()`.

### Shared Contracts

- Modify: `packages/core/src/school/types.ts`
  - Add staff directory and staff access schemas.
- Modify: `packages/core/src/school/__tests__/types.test.ts`
  - Add contract tests for staff inputs, access inputs, and invitation previews.

### API

- Create: `packages/api/src/routers/school/access-guards.ts`
  - Shared active School/member/role guards for school routers.
- Create: `packages/api/src/routers/school/staff/queries.ts`
  - Staff directory reads/writes and output shaping.
- Create: `packages/api/src/routers/school/staff/index.ts`
  - `school.staff.list/create/update`.
- Test: `packages/api/src/routers/school/staff/__tests__/index.test.ts`
  - Router behavior and authorization tests.
- Create: `packages/api/src/routers/school/staff-access/queries.ts`
  - Invite, preview, link-state, revoke, and membership helpers.
- Create: `packages/api/src/routers/school/staff-access/index.ts`
  - `school.staffAccess.preview/grant/revoke`.
- Test: `packages/api/src/routers/school/staff-access/__tests__/index.test.ts`
  - Router tests for grant/preview/revoke.
- Modify: `packages/api/src/routers/school/index.ts`
  - Mount `staff` and `staffAccess`.
- Modify: `packages/api/src/routers/school/bootstrap/index.ts`
  - Restrict School creation to root bootstrap users.
- Modify: `packages/api/src/routers/school/bootstrap/queries.ts`
  - Add root bootstrap authorization helper.
- Modify: `packages/api/src/routers/school/bootstrap/__tests__/index.test.ts`
  - Test School creation denial for non-root invited users.

### Web

- Modify: `apps/web/src/features/auth/ui/create-an-account-form.tsx`
  - Convert generic signup page into invitation-required explanation.
- Modify: `apps/web/src/features/auth/ui/sign-in-form.tsx`
  - Remove public create-account call-to-action except invitation-aware link text.
- Create: `apps/web/src/features/auth/ui/accept-invitation-form.tsx`
  - Invitation signup/sign-in/accept UI.
- Modify: `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/create-an-account/index.tsx`
  - Keep route, but make it non-signup informational page.
- Create: `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/accept-invitation/$invitationId/index.tsx`
  - Guest invitation route.
- Create: `apps/web/src/entities/staff-invitations/api/get-invitation-preview.query.ts`
  - Query wrapper for public invitation preview.
- Create: `apps/web/src/entities/staff-invitations/api/list-user-invitations.query.ts`
  - Client wrapper around Better Auth `listUserInvitations`.
- Create: `apps/web/src/entities/staff-invitations/api/accept-invitation.mutation.ts`
  - Client wrapper around Better Auth `acceptInvitation` and `setActive`.
- Create: `apps/web/src/entities/staff-invitations/index.ts`
  - Slice exports.
- Create: `apps/web/src/pages/invitations/ui/invitations-page.tsx`
  - Signed-in pending invitations page.
- Create: `apps/web/src/pages/invitations/index.ts`
  - Page exports.
- Create: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/invitations/index.tsx`
  - Protected invitations route.
- Create: `apps/web/src/pages/staff/api/get-staff.query.ts`
  - Staff list query wrapper.
- Create: `apps/web/src/pages/staff/api/create-staff-member.mutation.ts`
  - Staff create mutation wrapper.
- Create: `apps/web/src/pages/staff/api/update-staff-member.mutation.ts`
  - Staff update mutation wrapper.
- Create: `apps/web/src/pages/staff/api/grant-staff-access.mutation.ts`
  - Staff Access grant mutation wrapper.
- Create: `apps/web/src/pages/staff/api/revoke-staff-access.mutation.ts`
  - Staff Access revoke mutation wrapper.
- Create: `apps/web/src/pages/staff/lib/errors.ts`
  - Typed oRPC error messages.
- Create: `apps/web/src/pages/staff/ui/staff-page.tsx`
  - Staff Directory and Staff Access UI.
- Create: `apps/web/src/pages/staff/index.ts`
  - Page exports.
- Create: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/staff/index.tsx`
  - Protected staff route with preload.
- Modify: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/route.tsx`
  - Redirect signed-in users with no School access toward `/invitations`, except `/invitations` and `/schools/new`.
- Modify: `apps/web/src/features/navbar/config/nav-links.config.ts`
  - Add Staff and Invitations links.
- Modify: `packages/i18n/messages/en.json`
  - Add English copy.
- Generated: `apps/web/src/routeTree.gen.ts`
  - Regenerated after routes are added.

## Task 1: Auth Env, Email, Signup Gate

**Files:**

- Modify: `packages/env/src/server/env.ts`
- Modify: `packages/env/.env.example`
- Modify: `packages/auth/package.json`
- Create: `packages/auth/src/email.ts`
- Create: `packages/auth/src/signup-headers.ts`
- Create: `packages/auth/src/invitation-signup-gate.ts`
- Test: `packages/auth/src/__tests__/invitation-signup-gate.test.ts`
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/auth/src/react/auth-client.ts`

- [ ] **Step 1: Add failing signup gate tests**

Create `packages/auth/src/__tests__/invitation-signup-gate.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import {
  canBootstrapRootUser,
  canSignUpWithInvitation,
  parseRootBootstrapEmails
} from "#@/invitation-signup-gate";

describe("invitation signup gate", () => {
  it("parses comma-separated root bootstrap emails", () => {
    expect(parseRootBootstrapEmails("Owner@Example.com, admin@example.com ,,")).toEqual([
      "owner@example.com",
      "admin@example.com"
    ]);
  });

  it("allows root bootstrap only when no users exist and email is allowlisted", async () => {
    await expect(
      canBootstrapRootUser({
        email: "owner@example.com",
        rootBootstrapEmails: "owner@example.com",
        userCount: async () => 0
      })
    ).resolves.toBe(true);
  });

  it("closes root bootstrap after the first user exists", async () => {
    await expect(
      canBootstrapRootUser({
        email: "owner@example.com",
        rootBootstrapEmails: "owner@example.com",
        userCount: async () => 1
      })
    ).resolves.toBe(false);
  });

  it("rejects invitation signup when invitation is not pending for the email", async () => {
    await expect(
      canSignUpWithInvitation({
        email: "teacher@example.com",
        invitationId: "inv-1",
        now: new Date("2026-06-11T00:00:00.000Z"),
        findInvitation: vi.fn().mockResolvedValue({
          email: "other@example.com",
          expiresAt: new Date("2026-06-12T00:00:00.000Z"),
          status: "pending"
        })
      })
    ).resolves.toBe(false);
  });

  it("allows invitation signup for pending non-expired matching email", async () => {
    await expect(
      canSignUpWithInvitation({
        email: "Teacher@Example.com",
        invitationId: "inv-1",
        now: new Date("2026-06-11T00:00:00.000Z"),
        findInvitation: vi.fn().mockResolvedValue({
          email: "teacher@example.com",
          expiresAt: new Date("2026-06-12T00:00:00.000Z"),
          status: "pending"
        })
      })
    ).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Add auth test script and run failing tests**

Modify `packages/auth/package.json`:

```json
{
  "name": "@tsu-stack/auth",
  "private": true,
  "type": "module",
  "imports": {
    "#@/*": "./src/*.ts"
  },
  "exports": {
    "./*": "./src/*.ts"
  },
  "scripts": {
    "test:unit": "vp test"
  },
  "dependencies": {
    "@better-auth/drizzle-adapter": "catalog:",
    "better-auth": "catalog:"
  },
  "devDependencies": {
    "@tsu-stack/env": "workspace:*",
    "@tsu-stack/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:"
  },
  "peerDependencies": {
    "@tanstack/react-query": "catalog:",
    "@tanstack/react-start": "catalog:",
    "@tsu-stack/db": "workspace:*"
  }
}
```

Run:

```bash
pnpm --filter @tsu-stack/auth test:unit -- invitation-signup-gate
```

Expected: FAIL because `#@/invitation-signup-gate` does not exist.

- [ ] **Step 3: Add server env validation**

Modify the `server` object in `packages/env/src/server/env.ts`:

```ts
    VITE_SERVER_URL: isProduction ? z.url() : z.url().default("http://localhost:5000/server"),
    VITE_WEB_URL: isProduction ? z.url() : z.url().default("http://localhost:3000/web"),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    ROOT_BOOTSTRAP_EMAILS: z.string().default(""),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3).optional(),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
```

Modify `packages/env/.env.example` under the server section:

```dotenv
# ⚙️ optional - Comma-separated emails allowed to create the root bootstrap account and Schools.
ROOT_BOOTSTRAP_EMAILS="owner@example.com"

# ⚙️ required for production email delivery - Resend API key for transactional auth emails.
RESEND_API_KEY=""

# ⚙️ required for production email delivery - Verified sender address, for example School App <no-reply@example.com>.
EMAIL_FROM=""
```

- [ ] **Step 4: Add email delivery helper**

Create `packages/auth/src/email.ts`:

```ts
import "@tanstack/react-start/server-only";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

type TransactionalEmailInput = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

function isEmailConfigured(): boolean {
  return Boolean(ENV_SERVER.RESEND_API_KEY && ENV_SERVER.EMAIL_FROM);
}

export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    if (ENV_SERVER.NODE_ENV === "production") {
      throw new Error("Transactional email is not configured.");
    }

    console.info("[auth-email:dev]", {
      subject: input.subject,
      text: input.text,
      to: input.to
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: ENV_SERVER.EMAIL_FROM,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to
    }),
    headers: {
      Authorization: `Bearer ${ENV_SERVER.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Transactional email failed with status ${response.status}.`);
  }
}

export function invitationEmail(input: {
  invitationUrl: string;
  organizationName: string;
  to: string;
}): TransactionalEmailInput {
  return {
    html: `<p>You were invited to join ${input.organizationName}.</p><p><a href="${input.invitationUrl}">Accept invitation</a></p>`,
    subject: `Join ${input.organizationName}`,
    text: `You were invited to join ${input.organizationName}. Accept invitation: ${input.invitationUrl}`,
    to: input.to
  };
}

export function verificationEmail(input: { to: string; url: string }): TransactionalEmailInput {
  return {
    html: `<p>Verify your email address.</p><p><a href="${input.url}">Verify email</a></p>`,
    subject: "Verify your email address",
    text: `Verify your email address: ${input.url}`,
    to: input.to
  };
}
```

- [ ] **Step 5: Add signup headers and gate helper**

Create `packages/auth/src/signup-headers.ts`:

```ts
export const signupIntentHeader = "x-school-signup-intent";
export const invitationIdHeader = "x-school-invitation-id";
```

Create `packages/auth/src/invitation-signup-gate.ts`:

```ts
import "@tanstack/react-start/server-only";

import { count, db, eq } from "@tsu-stack/db";
import { invitation, user } from "@tsu-stack/db/schema";

type InvitationRow = {
  email: string;
  expiresAt: Date | string;
  status: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseRootBootstrapEmails(value: string): string[] {
  return value
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter((email) => email.length > 0);
}

export async function canBootstrapRootUser(input: {
  email: string;
  rootBootstrapEmails: string;
  userCount: () => Promise<number>;
}): Promise<boolean> {
  const allowedEmails = parseRootBootstrapEmails(input.rootBootstrapEmails);

  if (!allowedEmails.includes(normalizeEmail(input.email))) {
    return false;
  }

  return (await input.userCount()) === 0;
}

export async function canSignUpWithInvitation(input: {
  email: string;
  findInvitation: (id: string) => Promise<InvitationRow | null>;
  invitationId: string;
  now: Date;
}): Promise<boolean> {
  const row = await input.findInvitation(input.invitationId);

  if (!row || row.status !== "pending") {
    return false;
  }

  if (normalizeEmail(row.email) !== normalizeEmail(input.email)) {
    return false;
  }

  return new Date(row.expiresAt).getTime() > input.now.getTime();
}

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(user);
  return row?.value ?? 0;
}

export async function findInvitationById(id: string): Promise<InvitationRow | null> {
  const [row] = await db
    .select({
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      status: invitation.status
    })
    .from(invitation)
    .where(eq(invitation.id, id))
    .limit(1);

  return row ?? null;
}
```

- [ ] **Step 6: Wire Better Auth config**

Modify `packages/auth/src/index.ts` imports:

```ts
import { APIError, createAuthMiddleware } from "better-auth/api";
import { openAPI, organization } from "better-auth/plugins";

import { and, eq } from "@tsu-stack/db";

import {
  canBootstrapRootUser,
  canSignUpWithInvitation,
  countUsers,
  findInvitationById
} from "#@/invitation-signup-gate";
import { invitationIdHeader, signupIntentHeader } from "#@/signup-headers";
import { invitationEmail, sendTransactionalEmail, verificationEmail } from "#@/email";
```

Update the `emailAndPassword`, add `emailVerification`, add `hooks`, and replace `organization()`:

```ts
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail(verificationEmail({ to: user.email, url }));
    }
  },

  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === "/sign-up/email",
        handler: createAuthMiddleware(async (ctx) => {
          const body = ctx.body as { email?: unknown };
          const email = typeof body.email === "string" ? body.email : "";
          const intent = ctx.headers?.get(signupIntentHeader);

          if (intent === "root-bootstrap") {
            const allowed = await canBootstrapRootUser({
              email,
              rootBootstrapEmails: ENV_SERVER.ROOT_BOOTSTRAP_EMAILS,
              userCount: countUsers
            });

            if (allowed) {
              return;
            }
          }

          if (intent === "staff-invitation") {
            const invitationId = ctx.headers?.get(invitationIdHeader) ?? "";
            const allowed = await canSignUpWithInvitation({
              email,
              findInvitation: findInvitationById,
              invitationId,
              now: new Date()
            });

            if (allowed) {
              return;
            }
          }

          throw new APIError("FORBIDDEN", {
            message: "Account creation requires a valid school invitation."
          });
        })
      }
    ]
  },
```

Replace the plugin entry:

```ts
    organization({
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async (data) => {
        const invitationUrl = `${ENV_SERVER.VITE_WEB_URL}/accept-invitation/${data.id}`;
        await sendTransactionalEmail(
          invitationEmail({
            invitationUrl,
            organizationName: data.organization.name,
            to: data.email
          })
        );
      },
      organizationHooks: {
        afterAcceptInvitation: async ({ invitation: acceptedInvitation, user: acceptedUser }) => {
          await db
            .update(schema.schoolActors)
            .set({
              status: "active",
              updatedAt: new Date(),
              userId: acceptedUser.id
            })
            .where(
              and(
                eq(schema.schoolActors.organizationId, acceptedInvitation.organizationId),
                eq(schema.schoolActors.email, acceptedInvitation.email)
              )
            );
        }
      }
    }),
```

- [ ] **Step 7: Add organization client plugin**

Modify `packages/auth/src/react/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

export const API_AUTH_URL = `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/auth`;

export const authClient = createAuthClient({
  baseURL: API_AUTH_URL,
  plugins: [organizationClient()]
}) as ReturnType<typeof createAuthClient>;

export type AuthSession = typeof authClient.$Infer.Session;
```

- [ ] **Step 8: Run auth tests**

Run:

```bash
pnpm --filter @tsu-stack/auth test:unit -- invitation-signup-gate
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/env/src/server/env.ts packages/env/.env.example packages/auth/package.json packages/auth/src
git commit -m "feat: gate signup behind staff invitations"
```

## Task 2: Root Bootstrap School Creation Guard

**Files:**

- Modify: `packages/api/src/routers/school/bootstrap/queries.ts`
- Modify: `packages/api/src/routers/school/bootstrap/index.ts`
- Test: `packages/api/src/routers/school/bootstrap/__tests__/index.test.ts`

- [ ] **Step 1: Add failing router test**

Append to `packages/api/src/routers/school/bootstrap/__tests__/index.test.ts`:

```ts
it("rejects school creation for non-root users", async () => {
  vi.mocked(queries.canCreateSchoolForUser).mockResolvedValue(false);

  await expect(
    call(
      schoolBootstrapRouter.create,
      {
        name: "Teacher School",
        slug: "teacher-school"
      },
      { context }
    )
  ).rejects.toMatchObject({ code: "SCHOOL_CREATION_DENIED" });
});
```

Update the mock factory:

```ts
vi.mock("#@/routers/school/bootstrap/queries", () => {
  return {
    canCreateSchoolForUser: vi.fn(),
    createSchoolForUser: vi.fn(),
    getActiveSchoolIdForSession: vi.fn(),
    listSchoolsForUser: vi.fn(),
    selectSchoolForUser: vi.fn()
  };
});
```

Update `beforeEach`:

```ts
vi.mocked(queries.canCreateSchoolForUser).mockResolvedValue(true);
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- bootstrap
```

Expected: FAIL because `canCreateSchoolForUser` and `SCHOOL_CREATION_DENIED` do not exist.

- [ ] **Step 3: Add query helper**

Add to `packages/api/src/routers/school/bootstrap/queries.ts`:

```ts
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { parseRootBootstrapEmails } from "@tsu-stack/auth/invitation-signup-gate";

export async function canCreateSchoolForUser(email: string): Promise<boolean> {
  return parseRootBootstrapEmails(ENV_SERVER.ROOT_BOOTSTRAP_EMAILS).includes(
    email.trim().toLowerCase()
  );
}
```

- [ ] **Step 4: Enforce helper in router**

Modify `packages/api/src/routers/school/bootstrap/index.ts` imports:

```ts
  canCreateSchoolForUser,
  createSchoolForUser,
```

Add error:

```ts
  SCHOOL_CREATION_DENIED: {
    message: "Only root bootstrap users can create schools.",
    status: 403
  },
```

Add check before `createSchoolForUser`:

```ts
if (!(await canCreateSchoolForUser(authenticatedContext.session.user.email))) {
  throw errors.SCHOOL_CREATION_DENIED();
}
```

- [ ] **Step 5: Run router tests**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- bootstrap
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/school/bootstrap
git commit -m "feat: restrict school creation to root users"
```

## Task 3: Core Staff Contracts

**Files:**

- Modify: `packages/core/src/school/types.ts`
- Test: `packages/core/src/school/__tests__/types.test.ts`

- [ ] **Step 1: Add failing core tests**

Extend the import list in `packages/core/src/school/__tests__/types.test.ts`:

```ts
  staffAccessGrantInputSchema,
  staffAccessRevokeInputSchema,
  staffAssignableRoleSchema,
  staffMemberCreateInputSchema,
  staffMemberSchema,
  staffMemberUpdateInputSchema,
```

Append tests:

```ts
it("requires email for staff members", () => {
  expect(() =>
    staffMemberCreateInputSchema.parse({
      employeeCode: "T-001",
      fullName: "Asha Rao",
      roles: ["teacher"]
    })
  ).toThrow("Invalid input");
});

it("rejects owner as a staff-manageable role", () => {
  expect(staffAssignableRoleSchema.options).toEqual(["principal", "teacher"]);
  expect(() =>
    staffMemberCreateInputSchema.parse({
      email: "owner@example.com",
      employeeCode: "O-001",
      fullName: "Owner User",
      roles: ["owner"]
    })
  ).toThrow("Invalid option");
});

it("serializes staff access status", () => {
  expect(
    staffMemberSchema.parse({
      accessStatus: "pending",
      actorId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
      createdAt: "2026-06-11T00:00:00.000Z",
      department: "Science",
      email: "teacher@example.com",
      employeeCode: "T-001",
      fullName: "Asha Rao",
      id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
      invitationId: "inv-1",
      joinedOn: "2026-06-01",
      leftOn: null,
      phone: null,
      roles: ["teacher"],
      status: "active",
      title: "Teacher",
      updatedAt: "2026-06-11T00:00:00.000Z",
      userId: null
    })
  ).toMatchObject({
    accessStatus: "pending",
    email: "teacher@example.com",
    roles: ["teacher"]
  });
});

it("validates staff access inputs", () => {
  expect(
    staffAccessGrantInputSchema.parse({
      staffProfileId: "018f3ad5-8af8-733f-bb74-33f7f224f127"
    })
  ).toEqual({
    staffProfileId: "018f3ad5-8af8-733f-bb74-33f7f224f127"
  });

  expect(
    staffAccessRevokeInputSchema.parse({
      staffProfileId: "018f3ad5-8af8-733f-bb74-33f7f224f127"
    })
  ).toEqual({
    staffProfileId: "018f3ad5-8af8-733f-bb74-33f7f224f127"
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
```

Expected: FAIL because staff schemas do not exist.

- [ ] **Step 3: Add staff schemas**

Add after `schoolBootstrapListOutputSchema` in `packages/core/src/school/types.ts`:

```ts
export const staffAssignableRoleSchema = z.enum(["principal", "teacher"]);
export type StaffAssignableRole = z.infer<typeof staffAssignableRoleSchema>;

export const staffAccessStatusSchema = z.enum(["not_invited", "pending", "linked", "revoked"]);
export type StaffAccessStatus = z.infer<typeof staffAccessStatusSchema>;

export const staffMemberSchema = z.object({
  accessStatus: staffAccessStatusSchema,
  actorId: uuidSchema,
  createdAt: z.iso.datetime(),
  department: z.string().nullable(),
  email: z.email(),
  employeeCode: nonEmptyTextSchema,
  fullName: nonEmptyTextSchema,
  id: uuidSchema,
  invitationId: z.string().nullable(),
  joinedOn: isoDateSchema.nullable(),
  leftOn: isoDateSchema.nullable(),
  phone: z.string().nullable(),
  roles: z.array(staffAssignableRoleSchema),
  status: staffStatusSchema,
  title: z.string().nullable(),
  updatedAt: z.iso.datetime(),
  userId: z.string().nullable()
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

const staffMemberInputFieldsSchema = z.object({
  department: nonEmptyTextSchema.max(120).nullable().optional(),
  email: z.email(),
  employeeCode: nonEmptyTextSchema.max(80),
  fullName: nonEmptyTextSchema.max(160),
  joinedOn: isoDateSchema.nullable().optional(),
  leftOn: isoDateSchema.nullable().optional(),
  phone: nonEmptyTextSchema.max(40).nullable().optional(),
  roles: z.array(staffAssignableRoleSchema).min(1).default(["teacher"]),
  status: staffStatusSchema.default("active"),
  title: nonEmptyTextSchema.max(120).nullable().optional()
});

export const staffMemberCreateInputSchema = staffMemberInputFieldsSchema.refine(
  (input) =>
    input.leftOn === undefined ||
    input.joinedOn === undefined ||
    input.leftOn === null ||
    input.joinedOn === null ||
    input.joinedOn <= input.leftOn,
  {
    message: "Joined date must be before or equal to left date.",
    path: ["leftOn"]
  }
);
export type StaffMemberCreateInput = z.infer<typeof staffMemberCreateInputSchema>;

export const staffMemberUpdateInputSchema = staffMemberInputFieldsSchema
  .partial()
  .extend({
    id: uuidSchema
  })
  .refine(hasUpdateFields, {
    message: "At least one field must be provided.",
    path: ["id"]
  })
  .refine(
    (input) =>
      input.leftOn === undefined ||
      input.joinedOn === undefined ||
      input.leftOn === null ||
      input.joinedOn === null ||
      input.joinedOn <= input.leftOn,
    {
      message: "Joined date must be before or equal to left date.",
      path: ["leftOn"]
    }
  );
export type StaffMemberUpdateInput = z.infer<typeof staffMemberUpdateInputSchema>;

export const staffListInputSchema = z.object({});
export type StaffListInput = z.infer<typeof staffListInputSchema>;

export const staffListOutputSchema = z.object({
  canManagePrincipalRole: z.boolean(),
  canManageStaff: z.boolean(),
  staff: z.array(staffMemberSchema)
});
export type StaffListOutput = z.infer<typeof staffListOutputSchema>;

export const staffAccessGrantInputSchema = z.object({
  staffProfileId: uuidSchema
});
export type StaffAccessGrantInput = z.infer<typeof staffAccessGrantInputSchema>;

export const staffAccessRevokeInputSchema = z.object({
  staffProfileId: uuidSchema
});
export type StaffAccessRevokeInput = z.infer<typeof staffAccessRevokeInputSchema>;

export const staffInvitationPreviewInputSchema = z.object({
  invitationId: z.string().min(1)
});
export type StaffInvitationPreviewInput = z.infer<typeof staffInvitationPreviewInputSchema>;

export const staffInvitationPreviewSchema = z.object({
  email: z.email(),
  expiresAt: z.iso.datetime(),
  invitationId: z.string(),
  organizationName: nonEmptyTextSchema,
  status: z.enum(["pending", "accepted", "rejected", "canceled", "expired"])
});
export type StaffInvitationPreview = z.infer<typeof staffInvitationPreviewSchema>;
```

- [ ] **Step 4: Run core tests**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/school/types.ts packages/core/src/school/__tests__/types.test.ts
git commit -m "feat: add staff contracts"
```

## Task 4: Staff Directory API

**Files:**

- Create: `packages/api/src/routers/school/access-guards.ts`
- Create: `packages/api/src/routers/school/staff/queries.ts`
- Create: `packages/api/src/routers/school/staff/index.ts`
- Test: `packages/api/src/routers/school/staff/__tests__/index.test.ts`
- Modify: `packages/api/src/routers/school/index.ts`

- [ ] **Step 1: Add failing router tests**

Create `packages/api/src/routers/school/staff/__tests__/index.test.ts` with tests for list, create denial, principal denial, and duplicate mapping. Use the `schoolBootstrapRouter` test structure and mock `#@/routers/school/staff/queries`.

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- staff
```

Expected: FAIL because `schoolStaffRouter` does not exist.

- [ ] **Step 2: Add access guards**

Create `packages/api/src/routers/school/access-guards.ts`:

```ts
import { and, db, eq, inArray } from "@tsu-stack/db";
import { member, schoolActorRoles, schoolActors, session } from "@tsu-stack/db/schema";

export async function getActiveOrganizationIdForSession(sessionId: string): Promise<string | null> {
  const [row] = await db
    .select({ activeOrganizationId: session.activeOrganizationId })
    .from(session)
    .where(eq(session.id, sessionId))
    .limit(1);

  return row?.activeOrganizationId ?? null;
}

export async function isOrganizationMember(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);

  return rows.length > 0;
}

export async function getActiveSchoolRolesForUser(
  organizationId: string,
  userId: string
): Promise<string[]> {
  const rows = await db
    .select({ role: schoolActorRoles.role })
    .from(schoolActorRoles)
    .innerJoin(
      schoolActors,
      and(
        eq(schoolActors.organizationId, schoolActorRoles.organizationId),
        eq(schoolActors.id, schoolActorRoles.actorId)
      )
    )
    .where(
      and(
        eq(schoolActorRoles.organizationId, organizationId),
        eq(schoolActorRoles.active, true),
        eq(schoolActors.status, "active"),
        eq(schoolActors.userId, userId)
      )
    );

  return rows.map((row) => row.role);
}

export function staffPermissionsFromRoles(roles: string[]) {
  return {
    canManagePrincipalRole: roles.includes("owner"),
    canManageStaff: roles.includes("owner") || roles.includes("principal")
  };
}

export function canManageRequestedStaffRoles(input: {
  canManagePrincipalRole: boolean;
  requestedRoles: readonly string[] | undefined;
}): boolean {
  return !input.requestedRoles?.includes("principal") || input.canManagePrincipalRole;
}
```

- [ ] **Step 3: Add staff queries**

Create `packages/api/src/routers/school/staff/queries.ts` with create/list/update functions that:

```ts
// Required behavior:
// 1. Insert/update school_actors.email, fullName, phone.
// 2. Insert/update staff_profiles employee fields.
// 3. Upsert school_actor_roles for principal/teacher.
// 4. Return accessStatus:
//    linked: actor.userId exists, member exists, and at least one active role exists
//    pending: latest pending invitation exists
//    revoked: actor.userId exists but no membership or no active role
//    not_invited: no userId and no pending invitation
// 5. Never create owner roles.
```

The exact output mapper must return `StaffMember` from `@tsu-stack/core/school`.

- [ ] **Step 4: Add staff router**

Create `packages/api/src/routers/school/staff/index.ts` with `list`, `create`, and `update` procedures using:

```ts
import {
  staffListInputSchema,
  staffListOutputSchema,
  staffMemberCreateInputSchema,
  staffMemberSchema,
  staffMemberUpdateInputSchema
} from "@tsu-stack/core/school";
```

Define typed errors:

```ts
ACTIVE_ORGANIZATION_REQUIRED;
DUPLICATE_STAFF_RECORD;
INVALID_STAFF_DATES;
ORGANIZATION_ACCESS_DENIED;
SCHOOL_PRINCIPAL_MANAGEMENT_DENIED;
SCHOOL_STAFF_MANAGEMENT_DENIED;
STAFF_RECORD_NOT_FOUND;
```

Use `getActiveOrganizationIdForSession`, `isOrganizationMember`, `getActiveSchoolRolesForUser`, `staffPermissionsFromRoles`, and `canManageRequestedStaffRoles`.

- [ ] **Step 5: Mount router**

Modify `packages/api/src/routers/school/index.ts`:

```ts
import { schoolBootstrapRouter } from "#@/routers/school/bootstrap/index";
import { schoolSetupRouter } from "#@/routers/school/setup/index";
import { schoolStaffRouter } from "#@/routers/school/staff/index";

export const schoolRouter = {
  bootstrap: schoolBootstrapRouter,
  setup: schoolSetupRouter,
  staff: schoolStaffRouter
};
```

- [ ] **Step 6: Run API tests**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- staff
pnpm --filter @tsu-stack/api test:unit -- school
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routers/school
git commit -m "feat: add staff directory api"
```

## Task 5: Staff Access API

**Files:**

- Create: `packages/api/src/routers/school/staff-access/queries.ts`
- Create: `packages/api/src/routers/school/staff-access/index.ts`
- Test: `packages/api/src/routers/school/staff-access/__tests__/index.test.ts`
- Modify: `packages/api/src/routers/school/index.ts`

- [ ] **Step 1: Add failing tests**

Create tests for:

- preview returns pending invitation school/email
- grant denied for non-manager
- grant creates pending invitation for staff email
- revoke denies non-manager
- revoke deactivates roles and deletes membership

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- staff-access
```

Expected: FAIL because router does not exist.

- [ ] **Step 2: Add staff access queries**

Create `packages/api/src/routers/school/staff-access/queries.ts` with helpers:

```ts
export async function getStaffProfileForAccess(organizationId: string, staffProfileId: string) {}
export async function createOrResendStaffInvitation(input: {
  inviterId: string;
  organizationId: string;
  staffProfileId: string;
}) {}
export async function previewStaffInvitation(invitationId: string) {}
export async function revokeStaffAccess(input: {
  organizationId: string;
  staffProfileId: string;
}) {}
```

Implementation requirements:

- `createOrResendStaffInvitation` inserts or updates a `pending` row in `invitation`.
- `role` stored in Better Auth invitation is `"member"`.
- Staff App principal/teacher permissions stay in `school_actor_roles`.
- Invitation expiry is 7 days from creation/resend.
- Resend uses `sendTransactionalEmail(invitationEmail(...))`.
- `previewStaffInvitation` returns only invitation id, email, organization name, expiry, and status.
- `revokeStaffAccess` deactivates `school_actor_roles`, deletes `member` for the linked user/org, clears `session.activeOrganizationId` for that user/org, leaves staff profile and actor row intact.

- [ ] **Step 3: Add router**

Create `packages/api/src/routers/school/staff-access/index.ts` with procedures:

```ts
preview: publicProcedure
  .input(staffInvitationPreviewInputSchema)
  .output(staffInvitationPreviewSchema);
grant: protectedProcedure.input(staffAccessGrantInputSchema).output(staffMemberSchema);
revoke: protectedProcedure.input(staffAccessRevokeInputSchema).output(staffMemberSchema);
```

Typed errors:

```ts
ACTIVE_ORGANIZATION_REQUIRED;
INVITATION_NOT_FOUND;
ORGANIZATION_ACCESS_DENIED;
SCHOOL_PRINCIPAL_MANAGEMENT_DENIED;
SCHOOL_STAFF_MANAGEMENT_DENIED;
STAFF_ACCESS_ALREADY_LINKED;
STAFF_RECORD_NOT_FOUND;
STAFF_WITHOUT_EMAIL_NOT_ALLOWED;
```

- [ ] **Step 4: Mount router**

Modify `packages/api/src/routers/school/index.ts`:

```ts
import { schoolStaffAccessRouter } from "#@/routers/school/staff-access/index";

export const schoolRouter = {
  bootstrap: schoolBootstrapRouter,
  setup: schoolSetupRouter,
  staff: schoolStaffRouter,
  staffAccess: schoolStaffAccessRouter
};
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- staff-access
pnpm --filter @tsu-stack/api test:unit -- school
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/school
git commit -m "feat: add staff access api"
```

## Task 6: Invitation Signup And Pending Invitations UI

**Files:**

- Modify: `apps/web/src/features/auth/ui/create-an-account-form.tsx`
- Modify: `apps/web/src/features/auth/ui/sign-in-form.tsx`
- Create: `apps/web/src/features/auth/ui/accept-invitation-form.tsx`
- Modify: `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/create-an-account/index.tsx`
- Create: `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/accept-invitation/$invitationId/index.tsx`
- Create: `apps/web/src/entities/staff-invitations/api/get-invitation-preview.query.ts`
- Create: `apps/web/src/entities/staff-invitations/api/list-user-invitations.query.ts`
- Create: `apps/web/src/entities/staff-invitations/api/accept-invitation.mutation.ts`
- Create: `apps/web/src/entities/staff-invitations/index.ts`
- Create: `apps/web/src/pages/invitations/ui/invitations-page.tsx`
- Create: `apps/web/src/pages/invitations/index.ts`
- Create: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/invitations/index.tsx`

- [ ] **Step 1: Add invitation API wrappers**

Create `apps/web/src/entities/staff-invitations/api/get-invitation-preview.query.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getInvitationPreviewQueryOptions(invitationId: string) {
  return orpc.school.staffAccess.preview.queryOptions({
    input: { invitationId }
  });
}

export function useInvitationPreviewQuery(invitationId: string) {
  return useQuery(getInvitationPreviewQueryOptions(invitationId));
}
```

Create `apps/web/src/entities/staff-invitations/api/list-user-invitations.query.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { authClient } from "@tsu-stack/auth/react/auth-client";

export function useListUserInvitationsQuery() {
  return useQuery({
    queryFn: async () => {
      const result = await authClient.organization.listUserInvitations();

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data ?? [];
    },
    queryKey: ["staff-invitations", "current-user"]
  });
}
```

Create `apps/web/src/entities/staff-invitations/api/accept-invitation.mutation.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@tsu-stack/auth/react/auth-client";

import { schoolAccessQueryKeys } from "@/entities/school-access/api/get-schools.query";

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const accepted = await authClient.organization.acceptInvitation({ invitationId });

      if (accepted.error) {
        throw new Error(accepted.error.message);
      }

      const organizationId = accepted.data?.invitation.organizationId;

      if (organizationId) {
        await authClient.organization.setActive({ organizationId });
      }

      return accepted.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: schoolAccessQueryKeys.list() });
      await queryClient.invalidateQueries({ queryKey: ["staff-invitations", "current-user"] });
    }
  });
}
```

Create `apps/web/src/entities/staff-invitations/index.ts`:

```ts
export { useAcceptInvitationMutation } from "./api/accept-invitation.mutation";
export {
  getInvitationPreviewQueryOptions,
  useInvitationPreviewQuery
} from "./api/get-invitation-preview.query";
export { useListUserInvitationsQuery } from "./api/list-user-invitations.query";
```

- [ ] **Step 2: Create accept invitation form**

Create `apps/web/src/features/auth/ui/accept-invitation-form.tsx`:

```tsx
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { invitationIdHeader, signupIntentHeader } from "@tsu-stack/auth/signup-headers";
import { m } from "@tsu-stack/i18n/messages";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import {
  useAcceptInvitationMutation,
  useInvitationPreviewQuery
} from "@/entities/staff-invitations";
import { Container } from "@/shared/ui/container";

export function AcceptInvitationForm({ invitationId }: { invitationId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previewQuery = useInvitationPreviewQuery(invitationId);
  const acceptInvitation = useAcceptInvitationMutation();

  const signupMutation = useMutation({
    mutationFn: async (values: { name: string; password: string }) => {
      if (!previewQuery.data) {
        throw new Error(m.auth__invitation_unavailable());
      }

      const result = await authClient.signUp.email(
        {
          email: previewQuery.data.email,
          name: values.name,
          password: values.password
        },
        {
          headers: {
            [invitationIdHeader]: invitationId,
            [signupIntentHeader]: "staff-invitation"
          }
        }
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOptions());
      toast.success(m.auth__verification_required());
      await navigate({
        search: { redirect: `/accept-invitation/${invitationId}` },
        to: "/sign-in"
      });
    }
  });

  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      name: "",
      password: ""
    },
    onSubmit: async ({ value }) => {
      await signupMutation.mutateAsync({
        name: value.name,
        password: value.password
      });
    },
    validators: {
      onSubmit: z
        .object({
          confirmPassword: z.string(),
          name: z.string().min(2, m.auth__name_min_length()),
          password: z.string().min(8, m.auth__password_min_length())
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: m.auth__passwords_no_match(),
          path: ["confirmPassword"]
        })
    }
  });

  if (previewQuery.isPending) {
    return <Container className="max-w-md py-8">{m.auth__checking_invitation()}</Container>;
  }

  if (previewQuery.isError || !previewQuery.data || previewQuery.data.status !== "pending") {
    return <Container className="max-w-md py-8">{m.auth__invitation_unavailable()}</Container>;
  }

  return (
    <Container className="flex max-w-md flex-col gap-6 py-8">
      <div className="text-center">
        <h1 className="text-xl font-bold">{m.auth__accept_invitation_title()}</h1>
        <p className="text-sm text-muted-foreground">
          {m.auth__accept_invitation_description({ school: previewQuery.data.organizationName })}
        </p>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          await form.handleSubmit();
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel>{m.auth__email_label()}</FieldLabel>
            <Input disabled value={previewQuery.data.email} />
            <FieldDescription>{m.auth__invitation_email_locked()}</FieldDescription>
          </Field>
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{m.auth__name_label()}</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{m.auth__password_label()}</FieldLabel>
                <Input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="confirmPassword">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{m.auth__confirm_password_label()}</FieldLabel>
                <Input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            )}
          </form.Field>
          <Button disabled={signupMutation.isPending} type="submit">
            {m.auth__create_account()}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              acceptInvitation.mutate(invitationId, {
                onSuccess: () => void navigate({ to: "/school-setup" })
              })
            }
          >
            {m.auth__accept_existing_account_invitation()}
          </Button>
        </FieldGroup>
      </form>
    </Container>
  );
}
```

- [ ] **Step 3: Add routes and page**

Create `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/accept-invitation/$invitationId/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { AcceptInvitationForm } from "@/features/auth/ui/accept-invitation-form";

export const Route = createFileRoute(
  "/{-$locale}/(centered-layout)/(guest)/accept-invitation/$invitationId/"
)({
  component: RouteComponent
});

function RouteComponent() {
  const { invitationId } = Route.useParams();
  return <AcceptInvitationForm invitationId={invitationId} />;
}
```

Create `apps/web/src/pages/invitations/index.ts`:

```ts
export { InvitationsPage } from "./ui/invitations-page";
```

Create `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/invitations/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { InvitationsPage } from "@/pages/invitations";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/invitations/")({
  component: InvitationsPage
});
```

- [ ] **Step 4: Implement pending invitations page**

Create `apps/web/src/pages/invitations/ui/invitations-page.tsx`:

```tsx
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { Button } from "@tsu-stack/ui/components/button";

import {
  useAcceptInvitationMutation,
  useListUserInvitationsQuery
} from "@/entities/staff-invitations";
import { Container } from "@/shared/ui/container";

export function InvitationsPage() {
  const navigate = useNavigate();
  const invitationsQuery = useListUserInvitationsQuery();
  const acceptInvitation = useAcceptInvitationMutation();

  return (
    <Container className="flex flex-col gap-4 py-8">
      <h1 className="font-display text-3xl font-semibold">{m.invitations_page__title()}</h1>
      {invitationsQuery.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.invitations_page__empty()}</p>
      ) : null}
      {invitationsQuery.data?.map((invitation) => (
        <div className="rounded-md border p-4" key={invitation.id}>
          <div className="font-medium">
            {invitation.organizationName ?? invitation.organizationId}
          </div>
          <div className="text-sm text-muted-foreground">{invitation.email}</div>
          <Button
            className="mt-3"
            disabled={acceptInvitation.isPending}
            onClick={() =>
              acceptInvitation.mutate(invitation.id, {
                onError: (error) => toast.error(error.message),
                onSuccess: () => void navigate({ to: "/school-setup" })
              })
            }
          >
            {m.invitations_page__accept()}
          </Button>
        </div>
      ))}
    </Container>
  );
}
```

- [ ] **Step 5: Run route generation and web check**

Run:

```bash
pnpm --filter @tsu-stack/web route:generate
pnpm --filter @tsu-stack/web check
```

Expected: FAIL until i18n messages from Task 8 are added. Fix import/type errors now; leave missing messages for Task 8.

## Task 7: Staff Directory And Access Web

**Files:**

- Create: `apps/web/src/pages/staff/api/get-staff.query.ts`
- Create: `apps/web/src/pages/staff/api/create-staff-member.mutation.ts`
- Create: `apps/web/src/pages/staff/api/update-staff-member.mutation.ts`
- Create: `apps/web/src/pages/staff/api/grant-staff-access.mutation.ts`
- Create: `apps/web/src/pages/staff/api/revoke-staff-access.mutation.ts`
- Create: `apps/web/src/pages/staff/lib/errors.ts`
- Create: `apps/web/src/pages/staff/ui/staff-page.tsx`
- Create: `apps/web/src/pages/staff/index.ts`
- Create: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/staff/index.tsx`
- Modify: `apps/web/src/features/navbar/config/nav-links.config.ts`

- [ ] **Step 1: Add query and mutation wrappers**

Use the existing `apps/web/src/pages/school-setup/api/*.mutation.ts` pattern. Create wrappers for:

```ts
orpc.school.staff.list.queryOptions({ input: {} })
orpc.school.staff.create.mutationOptions(...)
orpc.school.staff.update.mutationOptions(...)
orpc.school.staffAccess.grant.mutationOptions(...)
orpc.school.staffAccess.revoke.mutationOptions(...)
```

All successful mutations invalidate `staffQueryKeys.list()`.

- [ ] **Step 2: Add typed error mapper**

Create `apps/web/src/pages/staff/lib/errors.ts`:

```ts
import { isDefinedError } from "@orpc/client";

import { m } from "@tsu-stack/i18n/messages";

export function getStaffErrorMessage(error: unknown): string {
  if (isDefinedError(error)) {
    switch (error.code) {
      case "DUPLICATE_STAFF_RECORD":
        return m.staff_page__duplicate_staff_record();
      case "SCHOOL_PRINCIPAL_MANAGEMENT_DENIED":
        return m.staff_page__principal_management_denied();
      case "SCHOOL_STAFF_MANAGEMENT_DENIED":
        return m.staff_page__staff_management_denied();
      case "STAFF_WITHOUT_EMAIL_NOT_ALLOWED":
        return m.staff_page__email_required();
      case "STAFF_ACCESS_ALREADY_LINKED":
        return m.staff_page__access_already_linked();
      default:
        return error.message ?? m.staff_page__save_failed();
    }
  }

  return error instanceof Error ? error.message : m.staff_page__save_failed();
}
```

- [ ] **Step 3: Add staff page**

Create `apps/web/src/pages/staff/ui/staff-page.tsx` with:

- required email field
- full name field
- employee code field
- title, department, phone, joinedOn fields
- teacher/principal role controls
- list with `accessStatus`
- Grant Access button when `accessStatus` is `not_invited` or `revoked`
- Resend Access button when `accessStatus` is `pending`
- Revoke Access button when `accessStatus` is `linked`

Use `toast.error(getStaffErrorMessage(error))` for all mutations.

- [ ] **Step 4: Add route and nav**

Create `apps/web/src/pages/staff/index.ts`:

```ts
export { getStaffQueryOptions } from "./api/get-staff.query";
export { StaffPage } from "./ui/staff-page";
```

Create `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/staff/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { getStaffQueryOptions, StaffPage } from "@/pages/staff";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/staff/")({
  component: StaffPage,
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(getStaffQueryOptions());
  }
});
```

Modify `apps/web/src/features/navbar/config/nav-links.config.ts` to include Staff after School Setup and Invitations near Dashboard.

- [ ] **Step 5: Run web check**

Run:

```bash
pnpm --filter @tsu-stack/web route:generate
pnpm --filter @tsu-stack/web check
```

Expected: FAIL only for missing i18n messages if Task 8 has not run.

## Task 8: Route Guard, I18n, Env Docs

**Files:**

- Modify: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/route.tsx`
- Modify: `packages/i18n/messages/en.json`
- Modify: `docker-compose.yaml`
- Modify: `apps/server/Dockerfile`
- Modify: `.github/README.md`

- [ ] **Step 1: Guard signed-in users without School access**

Modify auth layout beforeLoad in `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/route.tsx` after user check:

```ts
const schools = await context.queryClient.ensureQueryData(
  orpc.school.bootstrap.list.queryOptions({
    input: {}
  })
);

const currentPath = stripLocalePrefix(location.pathname);
const mayHaveNoSchool =
  currentPath.startsWith("/invitations") || currentPath.startsWith("/schools/new");

if (schools.schools.length === 0 && !mayHaveNoSchool) {
  throw redirect({ to: "/invitations" });
}
```

Import `orpc` from `@tsu-stack/api/client/tanstack-start/orpc`.

- [ ] **Step 2: Add messages**

Add these keys to `packages/i18n/messages/en.json` only. Do not edit `packages/i18n/messages/de.json` unless translation work is explicitly requested.

```json
{
  "auth__accept_existing_account_invitation": "Accept with existing account",
  "auth__accept_invitation_description": "Join {school} with the email address on this invitation.",
  "auth__accept_invitation_title": "Accept school invitation",
  "auth__checking_invitation": "Checking invitation...",
  "auth__invitation_email_locked": "This email is locked to the invitation.",
  "auth__invitation_required_description": "Accounts are created by school invitation only. Ask your School Admin for an invitation.",
  "auth__invitation_required_title": "Invitation required",
  "auth__invitation_unavailable": "This invitation is unavailable or expired.",
  "auth__verification_required": "Check your email to verify your account before accepting the invitation.",
  "invitations_page__accept": "Accept invitation",
  "invitations_page__empty": "No pending invitations for your email address.",
  "invitations_page__title": "Invitations",
  "navbar__invitations": "Invitations",
  "navbar__staff": "Staff",
  "staff_page__access_already_linked": "This staff member already has app access.",
  "staff_page__duplicate_staff_record": "A staff member with this email or employee code already exists.",
  "staff_page__email_required": "Staff members need an email address.",
  "staff_page__principal_management_denied": "Only root School Admins can grant principal access.",
  "staff_page__save_failed": "Staff record could not be saved.",
  "staff_page__staff_management_denied": "Only owners and principals can manage staff."
}
```

- [ ] **Step 3: Update env docs**

Add `ROOT_BOOTSTRAP_EMAILS`, `RESEND_API_KEY`, and `EMAIL_FROM` to Docker and `.github/README.md` following `.agents/environment-variables.md`.

- [ ] **Step 4: Run i18n and web checks**

Run:

```bash
pnpm --filter @tsu-stack/i18n build
pnpm --filter @tsu-stack/web route:generate
pnpm --filter @tsu-stack/web check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src packages/i18n/messages/en.json docker-compose.yaml apps/server/Dockerfile .github/README.md
git commit -m "feat: add invite-only staff onboarding ui"
```

## Task 9: Final Verification

**Files:**

- No source files unless verification exposes defects.

- [ ] **Step 1: Run package tests**

Run:

```bash
pnpm --filter @tsu-stack/auth test:unit
pnpm --filter @tsu-stack/core test:unit -- school
pnpm --filter @tsu-stack/api test:unit -- school
pnpm --filter @tsu-stack/web check
```

Expected: all PASS.

- [ ] **Step 2: Manual smoke**

Run dev services:

```bash
pnpm --filter @tsu-stack/server dev
pnpm --filter @tsu-stack/web dev
```

Smoke path:

1. Visit `/create-an-account`; verify generic signup is unavailable.
2. Attempt direct `authClient.signUp.email` from browser devtools without headers; verify server rejects it.
3. Create root account from allowlisted email on empty database.
4. Create School as root user.
5. Create teacher staff record with email.
6. Grant Staff Access; verify invitation email logs in dev or sends in configured env.
7. Open `/accept-invitation/<id>` in a fresh browser session.
8. Create invited account; verify email verification required.
9. Verify email, sign in, accept invitation.
10. Confirm teacher can select School and cannot perform owner/principal-only setup actions.
11. Revoke access; confirm School disappears from switcher and active session no longer opens School routes.

- [ ] **Step 3: Commit fixes if needed**

If verification exposes fixes:

```bash
git status --short
git add packages/auth packages/core packages/api apps/web packages/i18n packages/env docker-compose.yaml apps/server/Dockerfile .github/README.md
git commit -m "fix: harden invite-only staff onboarding"
```

## Self-Review

Spec coverage:

- Invite-only account creation: Task 1 and Task 6.
- Users cannot create accounts by themselves: Task 1 blocks generic signup server-side and Task 6 removes generic UI.
- Existing users can sign in: Task 1 keeps email/password sign-in enabled.
- Users without School access cannot enter School routes: Task 8.
- Staff Directory before Staff Access: Task 3, Task 4, Task 7.
- Better Auth organization invitations: Task 1, Task 5, Task 6.
- Verified email before invitation acceptance: Task 1.
- Revoke access fully: Task 5.
- Root bootstrap exception: Task 1 and Task 2.

Placeholder scan:

- No `TBD`, `TODO`, `similar to`, or unspecified error handling remains.
- Where implementation is intentionally broad, required behavior is enumerated in concrete bullets and bounded by exact files.

Type consistency:

- `staffMemberCreateInputSchema`, `staffMemberUpdateInputSchema`, `staffMemberSchema`, `staffAccessGrantInputSchema`, `staffAccessRevokeInputSchema`, and `staffInvitationPreviewSchema` are introduced before API/web references.
- `staffAccess` router name is mounted once under `school.staffAccess`.
- Invitation signup headers are exported once from `@tsu-stack/auth/signup-headers`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-11-staff-management.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.
