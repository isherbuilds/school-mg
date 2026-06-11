# School Bootstrap And Active School Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user create one or more schools from the Staff App, become the School Admin for each created school, and land in school setup with an active school selected.

**Architecture:** Keep school creation behind a School App oRPC procedure. The procedure creates the Better Auth organization record, membership, current session active organization, school actor, and owner access role in one transaction. The frontend uses slice-local TanStack Query wrappers and redirects no-active-school users to a create-school page instead of showing the existing generic setup error.

**Tech Stack:** TanStack Start, TanStack Router, TanStack Query, oRPC, Drizzle, Better Auth schema tables, Zod, Vitest, React, shadcn-style UI primitives.

**Implementation status, 2026-06-11:** Completed through subagent-driven implementation and controller review. Shipped core contracts, school bootstrap oRPC router, web create/select-school slice, generated route tree, active-school redirect from school setup, shared form helpers, and i18n copy. Verification passed:

- `pnpm --filter @tsu-stack/core test:unit -- school`
- `pnpm --filter @tsu-stack/api test:unit -- school`
- `pnpm --filter @tsu-stack/web check`

---

## File Structure

- Modify `packages/core/src/school/types.ts`: add school summary, school bootstrap input/output, and list output schemas.
- Modify `packages/core/src/school/__tests__/types.test.ts`: validate bootstrap defaults and input trimming.
- Create `packages/api/src/routers/school/bootstrap/index.ts`: expose `create`, `list`, and `select` oRPC procedures.
- Create `packages/api/src/routers/school/bootstrap/queries.ts`: transaction helpers and transport mapping.
- Create `packages/api/src/routers/school/bootstrap/__tests__/index.test.ts`: router-level tests with mocked query helpers.
- Modify `packages/api/src/routers/school/index.ts`: mount `bootstrap`.
- Create `apps/web/src/pages/school-bootstrap/api/*.ts`: query and mutation wrappers.
- Create `apps/web/src/pages/school-bootstrap/ui/school-bootstrap-page.tsx`: create-school form and optional existing-school list.
- Create `apps/web/src/pages/school-bootstrap/index.ts`: slice barrel.
- Create `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/schools/new/index.tsx`: route for school creation.
- Modify `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/school-setup/index.tsx`: redirect no-active-school users to `/schools/new`.
- Modify `apps/web/src/features/navbar/config/nav-links.config.ts`: keep `School setup` link; do not add a new persistent nav item yet.
- Modify `packages/i18n/messages/en.json` and `packages/i18n/messages/de.json`: add create-school copy keys used by the page.

## Task 1: Core School Bootstrap Contracts

**Files:**

- Modify: `packages/core/src/school/types.ts`
- Modify: `packages/core/src/school/__tests__/types.test.ts`

- [ ] **Step 1: Write failing contract tests**

Add these imports in `packages/core/src/school/__tests__/types.test.ts`:

```ts
import {
  schoolBootstrapCreateInputSchema,
  schoolBootstrapCreateOutputSchema,
  schoolSummarySchema
} from "#@/school/types";
```

Add these tests inside `describe("school domain contracts", () => { ... })`:

```ts
it("trims school bootstrap input and defaults slug when omitted", () => {
  expect(
    schoolBootstrapCreateInputSchema.parse({
      name: "  Spring Valley School  "
    })
  ).toEqual({
    name: "Spring Valley School"
  });

  expect(
    schoolBootstrapCreateInputSchema.parse({
      name: "Spring Valley School",
      slug: "  spring-valley  "
    })
  ).toEqual({
    name: "Spring Valley School",
    slug: "spring-valley"
  });
});

it("keeps school bootstrap output focused on active school selection", () => {
  const school = {
    createdAt: "2026-06-11T00:00:00.000Z",
    id: "org-1",
    name: "Spring Valley School",
    role: "owner",
    slug: "spring-valley"
  };

  expect(schoolSummarySchema.parse(school)).toEqual(school);
  expect(
    schoolBootstrapCreateOutputSchema.parse({
      activeSchool: school
    })
  ).toEqual({
    activeSchool: school
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
```

Expected: FAIL because the new schemas are not exported.

- [ ] **Step 3: Add contracts**

Add these schemas and types near `schoolIdInputSchema` in `packages/core/src/school/types.ts`:

```ts
const schoolSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");

export const schoolBootstrapCreateInputSchema = z.object({
  name: nonEmptyTextSchema.max(160),
  slug: schoolSlugSchema.optional()
});
export type SchoolBootstrapCreateInput = z.infer<typeof schoolBootstrapCreateInputSchema>;

export const schoolSelectInputSchema = z.object({
  id: z.string().trim().min(1)
});
export type SchoolSelectInput = z.infer<typeof schoolSelectInputSchema>;

export const schoolSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.string().min(1),
  name: nonEmptyTextSchema,
  role: schoolAccessRoleSchema,
  slug: nonEmptyTextSchema
});
export type SchoolSummary = z.infer<typeof schoolSummarySchema>;

export const schoolBootstrapCreateOutputSchema = z.object({
  activeSchool: schoolSummarySchema
});
export type SchoolBootstrapCreateOutput = z.infer<typeof schoolBootstrapCreateOutputSchema>;

export const schoolBootstrapListOutputSchema = z.object({
  activeSchoolId: z.string().min(1).nullable(),
  schools: z.array(schoolSummarySchema)
});
export type SchoolBootstrapListOutput = z.infer<typeof schoolBootstrapListOutputSchema>;
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
```

Expected: PASS.

## Task 2: School Bootstrap oRPC Router

**Files:**

- Create: `packages/api/src/routers/school/bootstrap/index.ts`
- Create: `packages/api/src/routers/school/bootstrap/queries.ts`
- Create: `packages/api/src/routers/school/bootstrap/__tests__/index.test.ts`
- Modify: `packages/api/src/routers/school/index.ts`

- [ ] **Step 1: Write router tests**

Create `packages/api/src/routers/school/bootstrap/__tests__/index.test.ts` with tests that mock `queries.ts` and assert:

```ts
import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type OrpcContext } from "#@/lib/context/types";
import { schoolBootstrapRouter } from "#@/routers/school/bootstrap/index";
import * as queries from "#@/routers/school/bootstrap/queries";

vi.mock("#@/routers/school/bootstrap/queries", () => ({
  createSchoolForUser: vi.fn(),
  listSchoolsForUser: vi.fn(),
  selectSchoolForUser: vi.fn()
}));

const context = {
  session: {
    session: {
      id: "session-1",
      activeOrganizationId: null
    },
    user: {
      email: "owner@example.com",
      id: "user-1",
      name: "Owner User"
    }
  }
} as unknown as OrpcContext;

const activeSchool = {
  createdAt: "2026-06-11T00:00:00.000Z",
  id: "org-1",
  name: "Spring Valley School",
  role: "owner" as const,
  slug: "spring-valley"
};

describe("school bootstrap router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queries.createSchoolForUser).mockResolvedValue({
      activeSchool
    });
    vi.mocked(queries.listSchoolsForUser).mockResolvedValue({
      activeSchoolId: null,
      schools: [activeSchool]
    });
    vi.mocked(queries.selectSchoolForUser).mockResolvedValue(activeSchool);
  });

  it("creates a school for the signed-in user", async () => {
    await expect(
      call(
        schoolBootstrapRouter.create,
        {
          name: "Spring Valley School"
        },
        { context }
      )
    ).resolves.toEqual({ activeSchool });

    expect(queries.createSchoolForUser).toHaveBeenCalledWith({
      email: "owner@example.com",
      name: "Spring Valley School",
      sessionId: "session-1",
      slug: undefined,
      userId: "user-1",
      userName: "Owner User"
    });
  });

  it("lists schools for the signed-in user", async () => {
    await expect(call(schoolBootstrapRouter.list, {}, { context })).resolves.toEqual({
      activeSchoolId: null,
      schools: [activeSchool]
    });
  });

  it("selects a school only through the signed-in user", async () => {
    await expect(call(schoolBootstrapRouter.select, { id: "org-1" }, { context })).resolves.toEqual(
      { activeSchool }
    );

    expect(queries.selectSchoolForUser).toHaveBeenCalledWith({
      organizationId: "org-1",
      sessionId: "session-1",
      userId: "user-1"
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- school/bootstrap
```

Expected: FAIL because the router files do not exist.

- [ ] **Step 3: Implement bootstrap router**

Create `packages/api/src/routers/school/bootstrap/index.ts`:

```ts
import {
  schoolBootstrapCreateInputSchema,
  schoolBootstrapCreateOutputSchema,
  schoolBootstrapListOutputSchema,
  schoolSelectInputSchema
} from "@tsu-stack/core/school";

import { type OrpcContext } from "#@/lib/context/types";
import { protectedProcedure } from "#@/lib/procedures/factory";

import { createSchoolForUser, listSchoolsForUser, selectSchoolForUser } from "./queries";

const schoolBootstrapProcedure = protectedProcedure.errors({
  DUPLICATE_SCHOOL_SLUG: {
    message: "A school with this URL slug already exists.",
    status: 409
  },
  SCHOOL_ACCESS_DENIED: {
    message: "You do not have access to this school.",
    status: 403
  },
  SCHOOL_NOT_FOUND: {
    message: "School not found.",
    status: 404
  }
});

type AuthenticatedContext = OrpcContext & {
  session: NonNullable<OrpcContext["session"]>;
};

type SchoolBootstrapErrors = Parameters<
  Parameters<typeof schoolBootstrapProcedure.handler>[0]
>[0]["errors"];

function hasDatabaseCode(error: unknown, code: string): boolean {
  let current = error;

  while (typeof current === "object" && current !== null) {
    if ("code" in current && current.code === code) {
      return true;
    }

    if ("cause" in current) {
      current = current.cause;
    } else {
      break;
    }
  }

  return false;
}

async function mapBootstrapError<T>(action: () => Promise<T>, errors: SchoolBootstrapErrors) {
  try {
    return await action();
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      throw errors.DUPLICATE_SCHOOL_SLUG();
    }

    throw error;
  }
}

export const schoolBootstrapRouter = {
  create: schoolBootstrapProcedure
    .route({
      description: "Create a school and make the signed-in user its School Admin",
      method: "POST"
    })
    .input(schoolBootstrapCreateInputSchema)
    .output(schoolBootstrapCreateOutputSchema)
    .handler(async ({ context, errors, input }) => {
      const authenticatedContext = context as AuthenticatedContext;

      return mapBootstrapError(
        () =>
          createSchoolForUser({
            email: authenticatedContext.session.user.email,
            name: input.name,
            sessionId: authenticatedContext.session.session.id,
            slug: input.slug,
            userId: authenticatedContext.session.user.id,
            userName: authenticatedContext.session.user.name
          }),
        errors
      );
    }),
  list: schoolBootstrapProcedure
    .route({
      description: "List schools available to the signed-in user",
      method: "GET"
    })
    .input(z.object({}))
    .output(schoolBootstrapListOutputSchema)
    .handler(async ({ context }) => {
      const authenticatedContext = context as AuthenticatedContext;
      return listSchoolsForUser({
        activeOrganizationId: authenticatedContext.session.session.activeOrganizationId ?? null,
        userId: authenticatedContext.session.user.id
      });
    }),
  select: schoolBootstrapProcedure
    .route({
      description: "Select the active school for the signed-in user",
      method: "POST"
    })
    .input(schoolSelectInputSchema)
    .output(schoolBootstrapCreateOutputSchema)
    .handler(async ({ context, errors, input }) => {
      const authenticatedContext = context as AuthenticatedContext;
      const activeSchool = await selectSchoolForUser({
        organizationId: input.id,
        sessionId: authenticatedContext.session.session.id,
        userId: authenticatedContext.session.user.id
      });

      if (!activeSchool) {
        throw errors.SCHOOL_ACCESS_DENIED();
      }

      return { activeSchool };
    })
};
```

If TypeScript reports `session.session.id` is not available on `AuthSession`, use `context.session.session.token` in tests and queries to update the current session by token instead. Do not update all sessions for a user.

- [ ] **Step 4: Implement query helpers**

Create `packages/api/src/routers/school/bootstrap/queries.ts` with:

```ts
import {
  type SchoolBootstrapCreateOutput,
  type SchoolBootstrapListOutput,
  type SchoolSummary
} from "@tsu-stack/core/school";
import { and, asc, db, eq } from "@tsu-stack/db";
import {
  member,
  organization,
  schoolActorRoles,
  schoolActors,
  session
} from "@tsu-stack/db/schema";

function timestampToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function slugifySchoolName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

function organizationToSchoolSummary(row: {
  createdAt: Date | string;
  id: string;
  name: string;
  role: "owner" | "principal" | "teacher";
  slug: string;
}): SchoolSummary {
  return {
    createdAt: timestampToIso(row.createdAt),
    id: row.id,
    name: row.name,
    role: row.role,
    slug: row.slug
  };
}

export async function createSchoolForUser(input: {
  email: string;
  name: string;
  sessionId: string;
  slug?: string | undefined;
  userId: string;
  userName: string;
}): Promise<SchoolBootstrapCreateOutput> {
  const slug = input.slug ?? slugifySchoolName(input.name);

  const activeSchool = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organization)
      .values({
        id: crypto.randomUUID(),
        name: input.name,
        slug
      })
      .returning();

    await tx.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: org.id,
      role: "owner",
      userId: input.userId
    });

    const [actor] = await tx
      .insert(schoolActors)
      .values({
        email: input.email,
        fullName: input.userName || input.email,
        organizationId: org.id,
        status: "active",
        userId: input.userId
      })
      .returning();

    await tx.insert(schoolActorRoles).values({
      actorId: actor.id,
      id: crypto.randomUUID(),
      organizationId: org.id,
      role: "owner"
    });

    await tx
      .update(session)
      .set({ activeOrganizationId: org.id })
      .where(eq(session.id, input.sessionId));

    return organizationToSchoolSummary({
      createdAt: org.createdAt,
      id: org.id,
      name: org.name,
      role: "owner",
      slug: org.slug
    });
  });

  return { activeSchool };
}

// Define role priority: owner > principal > teacher
const rolePriority = { owner: 1, principal: 2, teacher: 3 };
export async function listSchoolsForUser(input: {
  activeOrganizationId: string | null;
  userId: string;
}): Promise<SchoolBootstrapListOutput> {
  const rows = await db
    .select({
      createdAt: organization.createdAt,
      id: organization.id,
      name: organization.name,
      role: schoolActorRoles.role,
      slug: organization.slug
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .innerJoin(
      schoolActors,
      and(eq(schoolActors.organizationId, organization.id), eq(schoolActors.userId, input.userId))
    )
    .innerJoin(
      schoolActorRoles,
      and(
        eq(schoolActorRoles.organizationId, organization.id),
        eq(schoolActorRoles.actorId, schoolActors.id),
        eq(schoolActorRoles.active, true)
      )
    )
    .where(eq(member.userId, input.userId))
    .orderBy(asc(organization.name));
  // Deduplicate schools and keep highest priority role
  const schoolMap = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    const existing = schoolMap.get(row.id);
    if (!existing || rolePriority[row.role] < rolePriority[existing.role]) {
      schoolMap.set(row.id, row);
    }
  }
  return {
    activeSchoolId: input.activeOrganizationId,
    schools: Array.from(schoolMap.values()).map(organizationToSchoolSummary)
  };
}

export async function selectSchoolForUser(input: {
  organizationId: string;
  sessionId: string;
  userId: string;
}): Promise<SchoolSummary | null> {
  const [school] = (
    await listSchoolsForUser({
      activeOrganizationId: input.organizationId,
      userId: input.userId
    })
  ).schools.filter((row) => row.id === input.organizationId);

  if (!school) {
    return null;
  }

  await db
    .update(session)
    .set({ activeOrganizationId: input.organizationId })
    .where(eq(session.id, input.sessionId));

  return school;
}
```

- [ ] **Step 5: Mount router**

Update `packages/api/src/routers/school/index.ts`:

```ts
import { schoolBootstrapRouter } from "#@/routers/school/bootstrap/index";
import { schoolSetupRouter } from "#@/routers/school/setup/index";

export const schoolRouter = {
  bootstrap: schoolBootstrapRouter,
  setup: schoolSetupRouter
};
```

- [ ] **Step 6: Run API tests**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- school
```

Expected: PASS.

## Task 3: Web Create-School Slice

**Files:**

- Create: `apps/web/src/pages/school-bootstrap/api/get-schools.query.ts`
- Create: `apps/web/src/pages/school-bootstrap/api/create-school.mutation.ts`
- Create: `apps/web/src/pages/school-bootstrap/api/select-school.mutation.ts`
- Create: `apps/web/src/pages/school-bootstrap/ui/school-bootstrap-page.tsx`
- Create: `apps/web/src/pages/school-bootstrap/index.ts`
- Create: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/schools/new/index.tsx`
- Modify: `packages/i18n/messages/en.json`
- Modify: `packages/i18n/messages/de.json`

- [ ] **Step 1: Add slice API wrappers**

`get-schools.query.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export const schoolBootstrapQueryKeys = {
  list() {
    return orpc.school.bootstrap.list.key({ input: {} });
  }
};

export function getSchoolsQueryOptions() {
  return orpc.school.bootstrap.list.queryOptions({
    input: {}
  });
}

export function useGetSchoolsQuery() {
  return useQuery(getSchoolsQueryOptions());
}

export type SchoolsQueryResult = Awaited<ReturnType<typeof client.school.bootstrap.list>>;
```

`create-school.mutation.ts`:

```ts
import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { getSchoolSetupQueryOptions } from "@/pages/school-setup/api/get-school-setup.query";
import { schoolBootstrapQueryKeys } from "@/pages/school-bootstrap/api/get-schools.query";

export function useCreateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.bootstrap.create.mutationOptions({
      onError: (error) => {
        if (isDefinedError(error) && error.code === "DUPLICATE_SCHOOL_SLUG") {
          toast.error(error.message ?? "A school with this URL slug already exists.");
          return;
        }

        toast.error(error instanceof Error ? error.message : "Failed to create school.");
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: schoolBootstrapQueryKeys.list() }),
          queryClient.invalidateQueries({ queryKey: getSchoolSetupQueryOptions().queryKey })
        ]);
      }
    })
  );
}

export type CreateSchoolMutationResult = Awaited<ReturnType<typeof client.school.bootstrap.create>>;
```

`select-school.mutation.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { getSchoolSetupQueryOptions } from "@/pages/school-setup/api/get-school-setup.query";
import { schoolBootstrapQueryKeys } from "@/pages/school-bootstrap/api/get-schools.query";

export function useSelectSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.bootstrap.select.mutationOptions({
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to select school.");
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: schoolBootstrapQueryKeys.list() }),
          queryClient.invalidateQueries({ queryKey: getSchoolSetupQueryOptions().queryKey })
        ]);
      }
    })
  );
}

export type SelectSchoolMutationResult = Awaited<ReturnType<typeof client.school.bootstrap.select>>;
```

- [ ] **Step 2: Add create-school page**

Create `school-bootstrap-page.tsx` with a controlled form for `name` and optional `slug`. On successful create or select, navigate to `/school-setup`.

Use `useGetSchoolsQuery`, `useCreateSchoolMutation`, `useSelectSchoolMutation`, `useNavigate`, `Button`, `Input`, `Label`, `Container`, and `Spinner`. Keep the UI plain and operational: title, create form, optional list of existing schools with Select buttons.

- [ ] **Step 3: Add route and barrel**

`apps/web/src/pages/school-bootstrap/index.ts`:

```ts
export { getSchoolsQueryOptions } from "./api/get-schools.query";
export { SchoolBootstrapPage } from "./ui/school-bootstrap-page";
```

`apps/web/src/routes/{-$locale}/(root-layout)/(auth)/schools/new/index.tsx`:

```ts
import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { SchoolBootstrapPage, getSchoolsQueryOptions } from "@/pages/school-bootstrap";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/schools/new/")({
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSchoolsQueryOptions()).catch(() => undefined);
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/schools/new",
        locale: params.locale
      },
      robots: {
        follow: false,
        index: false
      },
      title: "Create School"
    }),
  component: SchoolBootstrapPage
});
```

- [ ] **Step 4: Add i18n keys**

Add English keys for create-school title, description, labels, buttons, empty existing schools text, and errors. Add German values as clear English fallback text if no translation is available yet.

- [ ] **Step 5: Run web typecheck**

Run:

```bash
pnpm --filter @tsu-stack/web typecheck
```

Expected: PASS.

## Task 4: Active School Route Integration

**Files:**

- Modify: `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/school-setup/index.tsx`
- Modify: `apps/web/src/pages/school-setup/ui/school-setup-page.tsx`

- [ ] **Step 1: Redirect no-active-school setup route**

Modify the school setup route `beforeLoad`: if `getSchoolSetupQueryOptions()` fails with defined oRPC error code `ACTIVE_ORGANIZATION_REQUIRED`, throw `redirect({ to: "/schools/new" })`. Keep other failures swallowed as they are today so the page can render the retry state.

- [ ] **Step 2: Update generic error copy only if needed**

If the create-school redirect handles the no-active-school case, keep `SchoolSetupError` as generic retry. Do not add a second create-school call-to-action there.

- [ ] **Step 3: Run API and web checks**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- school
pnpm --filter @tsu-stack/core test:unit -- school
pnpm --filter @tsu-stack/web typecheck
```

Expected: PASS.

## Review Checklist

- A signed-in user with no active school can create a school.
- Creating a school produces organization, member, school actor, owner access role, and active organization session update.
- First user may create multiple schools.
- `School Admin` remains product language; `owner` remains code permission role.
- School setup still uses existing owner/principal manager checks.
- No external API, MCP, WhatsApp, or Integration Platform code is added in this milestone.
