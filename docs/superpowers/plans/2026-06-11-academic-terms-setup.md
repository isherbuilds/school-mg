# Academic Terms Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Review cadence:** When using subagent-driven execution, request review after each task with `superpowers:requesting-code-review` only. Do not use unrelated review workflows between tasks.

**Goal:** Add academic term create, list, and update support to the existing School Setup flow.

**Architecture:** Reuse the current school setup vertical slice instead of creating a new page. The `academic_terms` table already exists in `packages/db`, so this plan adds shared core contracts, extends the existing oRPC setup router and query helpers, then exposes terms in the current setup UI beside academic years, grade levels, subjects, and sections.

**Tech Stack:** TypeScript, Zod, Drizzle, oRPC, TanStack Query, TanStack Start, React, Vitest, Paraglide messages, shadcn-style UI primitives.

---

## Repo Findings

- `docs/ROADMAP.md` still says school bootstrap is next, but `docs/superpowers/plans/2026-06-11-school-bootstrap-active-school.md` and `docs/superpowers/plans/2026-06-11-school-bootstrap-followups.md` are marked complete.
- `packages/db/src/schema/school.academics.schema.ts` already defines `academicTerms`; no migration should be generated for this slice unless schema drift is discovered.
- `packages/core/src/school/types.ts` exposes academic years, grade levels, subjects, sections, and setup list contracts, but no academic term transport contract.
- `packages/api/src/routers/school/setup/index.ts` exposes setup CRUD for academic years, grade levels, subjects, and sections only.
- `apps/web/src/pages/school-setup/` already has the correct page, query, mutation, form, list, error, and i18n patterns to extend.

## Why This Is Next

Academic terms are the smallest missing piece in the existing setup flow. They sit directly after academic years in the dependency graph and before later timetable, attendance, marksheet, and reporting work. Completing this slice avoids starting staff or student workflows on an incomplete academic setup model.

## Dependency Graph

```text
Existing academic_terms table
    |
    v
Core AcademicTerm schemas
    |
    v
school.setup.academicTerms oRPC CRUD
    |
    v
school setup TanStack Query mutations
    |
    v
School Setup term form and list
    |
    v
Later subject offerings, timetable, attendance, marksheet reporting
```

## File Structure

- Modify `packages/core/src/school/types.ts`: add academic term schemas and include `academicTerms` in setup list output.
- Modify `packages/core/src/school/__tests__/types.test.ts`: add academic term contract tests.
- Modify `packages/api/src/routers/school/setup/queries.ts`: add term mapper, list query, create query, and update query.
- Modify `packages/api/src/routers/school/setup/index.ts`: add `academicTerms.create` and `academicTerms.update`.
- Modify `packages/api/src/routers/school/setup/__tests__/index.test.ts`: cover router exposure, list output, mutation authorization, and reference/date errors.
- Create `apps/web/src/pages/school-setup/api/create-academic-term.mutation.ts`: create mutation wrapper.
- Create `apps/web/src/pages/school-setup/api/update-academic-term.mutation.ts`: update mutation wrapper.
- Create `apps/web/src/pages/school-setup/ui/academic-term-list.tsx`: editable term list.
- Modify `apps/web/src/pages/school-setup/ui/school-setup-lists.tsx`: render term list and add editing kind.
- Modify `apps/web/src/pages/school-setup/ui/school-setup-forms.tsx`: add term create form after academic year form.
- Modify `packages/i18n/messages/en.json`: add term copy.
- Modify `packages/i18n/messages/de.json`: add term copy.
- Modify `docs/ROADMAP.md`: update current implementation status after implementation completes.

## Task 1: Core Academic Term Contracts

**Files:**

- Modify: `packages/core/src/school/types.ts`
- Modify: `packages/core/src/school/__tests__/types.test.ts`

- [ ] **Step 1: Write failing core tests**

Extend the existing import block in `packages/core/src/school/__tests__/types.test.ts` with:

```ts
import {
  academicTermCreateInputSchema,
  academicTermSchema,
  academicTermUpdateInputSchema,
  schoolSetupListOutputSchema
} from "#@/school/types";
```

Add these tests inside `describe("school domain contracts", () => { ... })`:

```ts
it("validates academic term transport records", () => {
  expect(
    academicTermSchema.parse({
      academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
      createdAt: "2026-06-11T00:00:00.000Z",
      endDate: "2026-09-30",
      id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
      kind: "semester",
      name: "Term 1",
      sortOrder: 1,
      startDate: "2026-06-01",
      updatedAt: "2026-06-11T00:00:00.000Z"
    })
  ).toMatchObject({
    kind: "semester",
    name: "Term 1",
    sortOrder: 1
  });
});

it("validates academic term date ranges", () => {
  expect(() =>
    academicTermCreateInputSchema.parse({
      academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
      endDate: "2026-06-01",
      name: "Term 1",
      startDate: "2026-09-30"
    })
  ).toThrow("Start date must be before or equal to end date.");

  expect(() =>
    academicTermUpdateInputSchema.parse({
      endDate: "2026-06-01",
      id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
      startDate: "2026-09-30"
    })
  ).toThrow("Start date must be before or equal to end date.");
});

it("includes academic terms in school setup list output", () => {
  const output = schoolSetupListOutputSchema.parse({
    academicTerms: [],
    academicYears: [],
    canManageSetup: true,
    gradeLevels: [],
    sections: [],
    subjects: []
  });

  expect(output.academicTerms).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
```

Expected: FAIL because academic term schemas and setup output field do not exist.

- [ ] **Step 3: Add core contracts**

Add this block after `academicYearUpdateInputSchema` in `packages/core/src/school/types.ts`:

```ts
export const academicTermSchema = z.object({
  academicYearId: uuidSchema,
  createdAt: z.iso.datetime(),
  endDate: isoDateSchema,
  id: uuidSchema,
  kind: termKindSchema,
  name: nonEmptyTextSchema,
  sortOrder: z.number().int(),
  startDate: isoDateSchema,
  updatedAt: z.iso.datetime()
});
export type AcademicTerm = z.infer<typeof academicTermSchema>;

const academicTermInputBaseSchema = z.object({
  academicYearId: uuidSchema,
  endDate: isoDateSchema,
  kind: termKindSchema,
  name: nonEmptyTextSchema.max(120),
  sortOrder: z.number().int().min(0),
  startDate: isoDateSchema
});

export const academicTermCreateInputSchema = academicTermInputBaseSchema
  .extend({
    kind: termKindSchema.default("custom"),
    sortOrder: z.number().int().min(0).default(0)
  })
  .refine((input) => input.startDate <= input.endDate, {
    message: "Start date must be before or equal to end date.",
    path: ["endDate"]
  });
export type AcademicTermCreateInput = z.infer<typeof academicTermCreateInputSchema>;

export const academicTermUpdateInputSchema = academicTermInputBaseSchema
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
      input.startDate === undefined ||
      input.endDate === undefined ||
      input.startDate <= input.endDate,
    {
      message: "Start date must be before or equal to end date.",
      path: ["endDate"]
    }
  )
  .refine((input) => (input.startDate === undefined) === (input.endDate === undefined), {
    message: "Start date and end date must be updated together.",
    path: ["endDate"]
  });
export type AcademicTermUpdateInput = z.infer<typeof academicTermUpdateInputSchema>;
```

Update `schoolSetupListOutputSchema`:

```ts
export const schoolSetupListOutputSchema = z.object({
  academicTerms: z.array(academicTermSchema),
  academicYears: z.array(academicYearSchema),
  canManageSetup: z.boolean(),
  gradeLevels: z.array(gradeLevelSchema),
  sections: z.array(sectionSchema),
  subjects: z.array(subjectSchema)
});
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
```

Expected: PASS.

- [ ] **Step 5: Commit core contracts**

Run:

```bash
git add packages/core/src/school/types.ts packages/core/src/school/__tests__/types.test.ts
git commit -m "feat(core): add academic term setup contracts"
```

## Task 2: Academic Term oRPC Support

**Files:**

- Modify: `packages/api/src/routers/school/setup/queries.ts`
- Modify: `packages/api/src/routers/school/setup/index.ts`
- Modify: `packages/api/src/routers/school/setup/__tests__/index.test.ts`

- [ ] **Step 1: Write failing router tests**

In `packages/api/src/routers/school/setup/__tests__/index.test.ts`, extend the mocked query module:

```ts
createAcademicTerm: vi.fn(),
updateAcademicTerm: vi.fn(),
```

Add a fixture near `gradeLevel`:

```ts
const academicTerm = {
  academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
  createdAt: "2026-06-10T00:00:00.000Z",
  endDate: "2026-09-30",
  id: "018f3ad5-8af8-733f-bb74-33f7f224f128",
  kind: "semester" as const,
  name: "Term 1",
  sortOrder: 1,
  startDate: "2026-06-01",
  updatedAt: "2026-06-10T00:00:00.000Z"
};
```

Update `beforeEach` list result and mocks:

```ts
vi.mocked(queries.listSchoolSetup).mockResolvedValue({
  academicTerms: [],
  academicYears: [],
  gradeLevels: [],
  sections: [],
  subjects: []
});
vi.mocked(queries.createAcademicTerm).mockResolvedValue(academicTerm);
```

Update the router exposure test:

```ts
expect(appRouter.school.setup.academicTerms.create).toBeDefined();
expect(appRouter.school.setup.academicTerms.update).toBeDefined();
```

Add this mutation authorization test:

```ts
it("rejects academic term mutations for non-manager members", async () => {
  vi.mocked(queries.isSchoolSetupManager).mockResolvedValue(false);

  await expect(
    call(
      schoolSetupRouter.academicTerms.create,
      {
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        endDate: "2026-09-30",
        name: "Term 1",
        startDate: "2026-06-01"
      },
      { context }
    )
  ).rejects.toMatchObject({ code: "SCHOOL_SETUP_MANAGEMENT_DENIED" });

  expect(queries.createAcademicTerm).not.toHaveBeenCalled();
});
```

Add this reference mapping test:

```ts
it("maps academic term reference failures to typed errors", async () => {
  vi.mocked(queries.createAcademicTerm).mockRejectedValue({ code: "23503" });

  await expect(
    call(
      schoolSetupRouter.academicTerms.create,
      {
        academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
        endDate: "2026-09-30",
        name: "Term 1",
        startDate: "2026-06-01"
      },
      { context }
    )
  ).rejects.toMatchObject({ code: "INVALID_SCHOOL_SETUP_REFERENCE" });
});
```

- [ ] **Step 2: Run API tests to verify failure**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- school
```

Expected: FAIL because `academicTerms` router and query helpers do not exist.

- [ ] **Step 3: Add query helpers**

In `packages/api/src/routers/school/setup/queries.ts`, add core imports:

```ts
type AcademicTerm,
type AcademicTermCreateInput,
type AcademicTermUpdateInput,
```

Add DB import:

```ts
academicTerms,
```

Add mapper after `academicYearToOutput`:

```ts
function academicTermToOutput(row: typeof academicTerms.$inferSelect): AcademicTerm {
  return {
    academicYearId: row.academicYearId,
    createdAt: timestampToIso(row.createdAt),
    endDate: row.endDate,
    id: row.id,
    kind: row.kind,
    name: row.name,
    sortOrder: row.sortOrder,
    startDate: row.startDate,
    updatedAt: timestampToIso(row.updatedAt)
  };
}
```

Update `listSchoolSetup` parallel reads:

```ts
const [yearRows, termRows, gradeRows, subjectRows, sectionRows] = await Promise.all([
  db
    .select()
    .from(academicYears)
    .where(eq(academicYears.organizationId, organizationId))
    .orderBy(asc(academicYears.startDate), asc(academicYears.name)),
  db
    .select()
    .from(academicTerms)
    .where(
      and(
        eq(academicTerms.organizationId, organizationId),
        input.academicYearId === undefined
          ? undefined
          : eq(academicTerms.academicYearId, input.academicYearId)
      )
    )
    .orderBy(asc(academicTerms.sortOrder), asc(academicTerms.startDate), asc(academicTerms.name)),
  db
    .select()
    .from(gradeLevels)
    .where(eq(gradeLevels.organizationId, organizationId))
    .orderBy(asc(gradeLevels.sortOrder), asc(gradeLevels.name)),
  db
    .select()
    .from(subjects)
    .where(eq(subjects.organizationId, organizationId))
    .orderBy(asc(subjects.name)),
  db
    .select()
    .from(sections)
    .where(
      and(
        eq(sections.organizationId, organizationId),
        input.academicYearId === undefined
          ? undefined
          : eq(sections.academicYearId, input.academicYearId)
      )
    )
    .orderBy(asc(sections.name))
]);

return {
  academicTerms: termRows.map(academicTermToOutput),
  academicYears: yearRows.map(academicYearToOutput),
  gradeLevels: gradeRows.map(gradeLevelToOutput),
  sections: sectionRows.map(sectionToOutput),
  subjects: subjectRows.map(subjectToOutput)
};
```

Add create/update helpers:

```ts
export async function createAcademicTerm(
  organizationId: string,
  input: AcademicTermCreateInput
): Promise<AcademicTerm> {
  const [row] = await db
    .insert(academicTerms)
    .values({ ...input, organizationId })
    .returning();

  return academicTermToOutput(row);
}

export async function updateAcademicTerm(
  organizationId: string,
  input: AcademicTermUpdateInput
): Promise<AcademicTerm | null> {
  const { id, ...values } = input;
  const [row] = await db
    .update(academicTerms)
    .set(values)
    .where(and(eq(academicTerms.organizationId, organizationId), eq(academicTerms.id, id)))
    .returning();

  return row ? academicTermToOutput(row) : null;
}
```

- [ ] **Step 4: Add router procedures**

In `packages/api/src/routers/school/setup/index.ts`, import schemas:

```ts
academicTermCreateInputSchema,
academicTermSchema,
academicTermUpdateInputSchema,
```

Import query helpers:

```ts
createAcademicTerm,
updateAcademicTerm,
```

Add this `academicTerms` group inside `schoolSetupRouter`:

```ts
academicTerms: {
  create: schoolSetupProcedure
    .route({
      description: "Create an academic term for the active organization",
      method: "POST"
    })
    .input(academicTermCreateInputSchema)
    .output(academicTermSchema)
    .handler(async ({ context, errors, input }) => {
      const organizationId = await requireSchoolSetupManager(context, errors);
      return mapDatabaseError(() => createAcademicTerm(organizationId, input), errors);
    }),
  update: schoolSetupProcedure
    .route({
      description: "Update an academic term for the active organization",
      method: "PATCH"
    })
    .input(academicTermUpdateInputSchema)
    .output(academicTermSchema)
    .handler(async ({ context, errors, input }) => {
      const organizationId = await requireSchoolSetupManager(context, errors);
      const row = await mapDatabaseError(() => updateAcademicTerm(organizationId, input), errors);
      return requireRow(row, errors);
    })
},
```

- [ ] **Step 5: Run API tests to verify pass**

Run:

```bash
pnpm --filter @tsu-stack/api test:unit -- school
```

Expected: PASS.

- [ ] **Step 6: Commit API support**

Run:

```bash
git add packages/api/src/routers/school/setup/index.ts packages/api/src/routers/school/setup/queries.ts packages/api/src/routers/school/setup/__tests__/index.test.ts
git commit -m "feat(api): add academic term setup procedures"
```

## Task 3: Web Academic Term Setup UI

**Files:**

- Create: `apps/web/src/pages/school-setup/api/create-academic-term.mutation.ts`
- Create: `apps/web/src/pages/school-setup/api/update-academic-term.mutation.ts`
- Create: `apps/web/src/pages/school-setup/ui/academic-term-list.tsx`
- Modify: `apps/web/src/pages/school-setup/ui/school-setup-lists.tsx`
- Modify: `apps/web/src/pages/school-setup/ui/school-setup-forms.tsx`
- Modify: `packages/i18n/messages/en.json`
- Modify: `packages/i18n/messages/de.json`

- [ ] **Step 1: Add mutation wrappers**

Create `apps/web/src/pages/school-setup/api/create-academic-term.mutation.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function createAcademicTermMutationOptions() {
  return orpc.school.setup.academicTerms.create.mutationOptions();
}

export function useCreateAcademicTermMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.academicTerms.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type CreateAcademicTermMutationResult = Awaited<
  ReturnType<typeof client.school.setup.academicTerms.create>
>;
```

Create `apps/web/src/pages/school-setup/api/update-academic-term.mutation.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function updateAcademicTermMutationOptions() {
  return orpc.school.setup.academicTerms.update.mutationOptions();
}

export function useUpdateAcademicTermMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.academicTerms.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type UpdateAcademicTermMutationResult = Awaited<
  ReturnType<typeof client.school.setup.academicTerms.update>
>;
```

- [ ] **Step 2: Create editable term list**

Create `apps/web/src/pages/school-setup/ui/academic-term-list.tsx`:

```tsx
import { CalendarRange } from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { getRequiredString } from "@/shared/lib/form-values";

import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import { useUpdateAcademicTermMutation } from "@/pages/school-setup/api/update-academic-term.mutation";
import { getSchoolSetupErrorMessage } from "@/pages/school-setup/lib/errors";
import { NativeSelect } from "@/pages/school-setup/ui/native-select";
import { ListItem, RecordList, UpdateButton } from "@/pages/school-setup/ui/setup-list-primitives";

type AcademicTerm = SchoolSetupQueryResult["academicTerms"][number];

type AcademicTermListProps = {
  academicTerms: SchoolSetupQueryResult["academicTerms"];
  academicYears: SchoolSetupQueryResult["academicYears"];
  canManageSetup: boolean;
  isEditing: (id: string) => boolean;
  onCancel: () => void;
  onEdit: (id: string) => void;
};

export function AcademicTermList({
  academicTerms,
  academicYears,
  canManageSetup,
  isEditing,
  onCancel,
  onEdit
}: AcademicTermListProps) {
  const mutation = useUpdateAcademicTermMutation();

  const getYearName = (academicYearId: string) =>
    academicYears.find((year) => year.id === academicYearId)?.name ??
    m.school_setup_page__unknown_academic_year();

  const handleUpdate = async (id: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await mutation.mutateAsync({
        academicYearId: getRequiredString(formData, "academicYearId"),
        endDate: getRequiredString(formData, "endDate"),
        id,
        kind: getRequiredString(formData, "kind") as AcademicTerm["kind"],
        name: getRequiredString(formData, "name"),
        startDate: getRequiredString(formData, "startDate")
      });
      onCancel();
      toast.success(m.school_setup_page__academic_term_updated());
    } catch (error) {
      toast.error(getSchoolSetupErrorMessage(error));
    }
  };

  return (
    <RecordList
      count={academicTerms.length}
      emptyDescription={m.school_setup_page__academic_terms_empty_description()}
      emptyTitle={m.school_setup_page__academic_terms_empty_title()}
      icon={CalendarRange}
      title={m.school_setup_page__academic_terms()}
    >
      {academicTerms.map((term) => (
        <ListItem
          isEditing={isEditing(term.id)}
          key={term.id}
          meta={`${getYearName(term.academicYearId)} / ${term.startDate} - ${term.endDate}`}
          onCancel={onCancel}
          onEdit={canManageSetup ? () => onEdit(term.id) : undefined}
          renderEditForm={() => (
            <AcademicTermEditForm
              academicYears={academicYears}
              isPending={mutation.isPending}
              onSubmit={(event) => void handleUpdate(term.id, event)}
              term={term}
            />
          )}
        >
          <span className="block truncate">{term.name}</span>
        </ListItem>
      ))}
    </RecordList>
  );
}

function AcademicTermEditForm({
  academicYears,
  isPending,
  onSubmit,
  term
}: {
  academicYears: SchoolSetupQueryResult["academicYears"];
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  term: AcademicTerm;
}) {
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`academic-term-${term.id}-year`}>
            {m.school_setup_page__academic_year()}
          </FieldLabel>
          <NativeSelect
            defaultValue={term.academicYearId}
            id={`academic-term-${term.id}-year`}
            name="academicYearId"
            required
          >
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-name`}>
              {m.school_setup_page__academic_term_name()}
            </FieldLabel>
            <Input
              defaultValue={term.name}
              id={`academic-term-${term.id}-name`}
              name="name"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-kind`}>
              {m.school_setup_page__term_kind()}
            </FieldLabel>
            <NativeSelect defaultValue={term.kind} id={`academic-term-${term.id}-kind`} name="kind">
              <option value="semester">{m.school_setup_page__term_kind_semester()}</option>
              <option value="trimester">{m.school_setup_page__term_kind_trimester()}</option>
              <option value="quarter">{m.school_setup_page__term_kind_quarter()}</option>
              <option value="custom">{m.school_setup_page__term_kind_custom()}</option>
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-start-date`}>
              {m.school_setup_page__start_date()}
            </FieldLabel>
            <Input
              defaultValue={term.startDate}
              id={`academic-term-${term.id}-start-date`}
              name="startDate"
              required
              type="date"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-end-date`}>
              {m.school_setup_page__end_date()}
            </FieldLabel>
            <Input
              defaultValue={term.endDate}
              id={`academic-term-${term.id}-end-date`}
              name="endDate"
              required
              type="date"
            />
          </Field>
        </div>
        <UpdateButton isPending={isPending} />
      </FieldGroup>
    </form>
  );
}
```

- [ ] **Step 3: Render terms in setup lists**

In `apps/web/src/pages/school-setup/ui/school-setup-lists.tsx`, import the list:

```ts
import { AcademicTermList } from "@/pages/school-setup/ui/academic-term-list";
```

Change `EditingRecord`:

```ts
type EditingRecord = {
  id: string;
  kind: "academic-year" | "academic-term" | "grade-level" | "section" | "subject";
} | null;
```

Render `AcademicTermList` immediately after `AcademicYearList`:

```tsx
<AcademicTermList
  academicTerms={setup.academicTerms}
  academicYears={setup.academicYears}
  canManageSetup={setup.canManageSetup}
  isEditing={(id) => isEditing("academic-term", id)}
  onCancel={stopEditing}
  onEdit={(id) => startEditing("academic-term", id)}
/>
```

- [ ] **Step 4: Add term create form**

In `apps/web/src/pages/school-setup/ui/school-setup-forms.tsx`, add import:

```ts
import { useCreateAcademicTermMutation } from "@/pages/school-setup/api/create-academic-term.mutation";
```

Inside `SetupForms`, add:

```ts
const academicTermMutation = useCreateAcademicTermMutation();
const canCreateTerm = setup.academicYears.length > 0;
```

Add submit handler after `handleAcademicYearSubmit`:

```ts
const handleAcademicTermSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  try {
    await academicTermMutation.mutateAsync({
      academicYearId: getRequiredString(formData, "academicYearId"),
      endDate: getRequiredString(formData, "endDate"),
      kind: getRequiredString(formData, "kind") as "semester" | "trimester" | "quarter" | "custom",
      name: getRequiredString(formData, "name"),
      sortOrder: getRequiredNumber(formData, "sortOrder"),
      startDate: getRequiredString(formData, "startDate")
    });
    form.reset();
    toast.success(m.school_setup_page__academic_term_saved());
  } catch (error) {
    toast.error(getSchoolSetupErrorMessage(error));
  }
};
```

Add form after the academic year form:

```tsx
<form onSubmit={handleAcademicTermSubmit}>
  <FieldSet disabled={!canCreateTerm}>
    <FieldGroup className="gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="academic-term-year">
              {m.school_setup_page__academic_year()}
            </FieldLabel>
          </FieldContent>
          <NativeSelect id="academic-term-year" name="academicYearId" required>
            <option value="">{m.school_setup_page__select_academic_year()}</option>
            {setup.academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="academic-term-kind">{m.school_setup_page__term_kind()}</FieldLabel>
          </FieldContent>
          <NativeSelect defaultValue="custom" id="academic-term-kind" name="kind">
            <option value="semester">{m.school_setup_page__term_kind_semester()}</option>
            <option value="trimester">{m.school_setup_page__term_kind_trimester()}</option>
            <option value="quarter">{m.school_setup_page__term_kind_quarter()}</option>
            <option value="custom">{m.school_setup_page__term_kind_custom()}</option>
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_96px]">
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="academic-term-name">
              {m.school_setup_page__academic_term_name()}
            </FieldLabel>
          </FieldContent>
          <Input
            id="academic-term-name"
            name="name"
            required
            placeholder={m.school_setup_page__academic_term_name_placeholder()}
          />
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="academic-term-sort-order">
              {m.school_setup_page__order()}
            </FieldLabel>
          </FieldContent>
          <Input
            defaultValue="0"
            id="academic-term-sort-order"
            min="0"
            name="sortOrder"
            required
            step="1"
            type="number"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="academic-term-start-date">
              {m.school_setup_page__start_date()}
            </FieldLabel>
          </FieldContent>
          <Input id="academic-term-start-date" name="startDate" required type="date" />
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="academic-term-end-date">
              {m.school_setup_page__end_date()}
            </FieldLabel>
          </FieldContent>
          <Input id="academic-term-end-date" name="endDate" required type="date" />
        </Field>
      </div>
      {!canCreateTerm && (
        <FieldDescription>
          {m.school_setup_page__academic_term_dependencies_description()}
        </FieldDescription>
      )}
      <SubmitButton isPending={academicTermMutation.isPending}>
        {m.school_setup_page__add_academic_term()}
      </SubmitButton>
    </FieldGroup>
  </FieldSet>
</form>
```

- [ ] **Step 5: Add i18n copy**

Add these keys to `packages/i18n/messages/en.json` near the existing school setup keys:

```json
"school_setup_page__academic_terms": "Academic Terms",
"school_setup_page__academic_terms_empty_title": "No academic terms",
"school_setup_page__academic_terms_empty_description": "Create terms inside each academic year for timetable and attendance reporting.",
"school_setup_page__academic_term_name": "Academic Term Name",
"school_setup_page__academic_term_name_placeholder": "Term 1",
"school_setup_page__academic_term_saved": "Academic term created.",
"school_setup_page__academic_term_updated": "Academic term updated.",
"school_setup_page__add_academic_term": "Add Academic Term",
"school_setup_page__academic_term_dependencies_description": "Create an academic year before adding terms.",
"school_setup_page__term_kind": "Term Type",
"school_setup_page__term_kind_semester": "Semester",
"school_setup_page__term_kind_trimester": "Trimester",
"school_setup_page__term_kind_quarter": "Quarter",
"school_setup_page__term_kind_custom": "Custom",
"school_setup_page__unknown_academic_year": "Unknown academic year"
```

Add these keys to `packages/i18n/messages/de.json`:

```json
"school_setup_page__academic_terms": "Schulabschnitte",
"school_setup_page__academic_terms_empty_title": "Keine Schulabschnitte",
"school_setup_page__academic_terms_empty_description": "Erstellen Sie Abschnitte innerhalb jedes Schuljahrs für Stundenplan- und Anwesenheitsberichte.",
"school_setup_page__academic_term_name": "Name des Schulabschnitts",
"school_setup_page__academic_term_name_placeholder": "Abschnitt 1",
"school_setup_page__academic_term_saved": "Schulabschnitt erstellt.",
"school_setup_page__academic_term_updated": "Schulabschnitt aktualisiert.",
"school_setup_page__add_academic_term": "Schulabschnitt hinzufügen",
"school_setup_page__academic_term_dependencies_description": "Erstellen Sie ein Schuljahr, bevor Sie Abschnitte hinzufügen.",
"school_setup_page__term_kind": "Abschnittstyp",
"school_setup_page__term_kind_semester": "Semester",
"school_setup_page__term_kind_trimester": "Trimester",
"school_setup_page__term_kind_quarter": "Quartal",
"school_setup_page__term_kind_custom": "Benutzerdefiniert",
"school_setup_page__unknown_academic_year": "Unbekanntes Schuljahr"
```

- [ ] **Step 6: Run web check**

Run:

```bash
pnpm --filter @tsu-stack/web check
```

Expected: PASS. If Paraglide generated message types are stale, run:

```bash
pnpm --filter @tsu-stack/i18n build
pnpm --filter @tsu-stack/web check
```

Expected: generated message code updates and the web check passes.

- [ ] **Step 7: Commit web support**

Run:

```bash
git add apps/web/src/pages/school-setup packages/i18n/messages/en.json packages/i18n/messages/de.json
git commit -m "feat(web): add academic term setup UI"
```

## Task 4: Final Verification And Roadmap Update

**Files:**

- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Run focused verification**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
pnpm --filter @tsu-stack/api test:unit -- school
pnpm --filter @tsu-stack/web check
```

Expected: all PASS.

- [ ] **Step 2: Update roadmap current status**

Read the current `docs/ROADMAP.md` implementation status first, then update the MVP "Current implementation status" bullets semantically so they say:

```md
- Done: MVP schema modules, phase-owned migration, shared school contracts, school creation bootstrap with active-school selection, school switcher, and school setup CRUD for academic years, academic terms, grade levels, sections, and subjects.
- Next: staff management for principals and teachers.
- Then: student and guardian records, enrollment history, subject offerings, staff assignments, timetable, attendance, and basic transport assignment.
```

Keep any unrelated roadmap wording intact.

- [ ] **Step 3: Commit docs**

Run:

```bash
git add docs/ROADMAP.md
git commit -m "docs: update school mvp roadmap status"
```

## Task 5: Manual Smoke Test

**Files:**

- No source files unless smoke exposes a bug.

- [ ] **Step 1: Start local services**

Run in separate terminals:

```bash
pnpm --filter @tsu-stack/server dev
pnpm --filter @tsu-stack/web dev
```

Expected:

- API available at `http://localhost:5000/server`.
- Web available at `http://localhost:3000/web`.

- [ ] **Step 2: Sign in as a school owner**

Use a throwaway owner account with an active school. If the account has no active school, create one through:

```text
http://localhost:3000/web/schools/new
```

Expected: signed-in owner can reach:

```text
http://localhost:3000/web/school-setup
```

- [ ] **Step 3: Create an academic year**

On `/web/school-setup`, submit:

- Academic Year Name: `2026-2027`
- Start Date: `2026-06-01`
- End Date: `2027-05-31`
- Set as current year: checked

Expected: success toast appears and `2026-2027` appears in the Academic Years list.

- [ ] **Step 4: Create an academic term**

On `/web/school-setup`, submit:

- Academic Year: `2026-2027`
- Term Type: `Semester`
- Academic Term Name: `Semester 1`
- Order: `1`
- Start Date: `2026-06-01`
- End Date: `2026-09-30`

Expected: success toast appears and `Semester 1` appears in the Academic Terms list with `2026-2027 / 2026-06-01 - 2026-09-30`.

- [ ] **Step 5: Edit the academic term**

Edit `Semester 1` and change:

- Academic Term Name: `Term 1`
- Term Type: `Custom`
- Start Date: `2026-06-01`
- End Date: `2026-10-15`

Expected: success toast appears and the Academic Terms list shows `Term 1` with `2026-06-01 - 2026-10-15`.

- [ ] **Step 6: Verify non-manager read-only behavior if feasible**

Sign in as a member of the same school without `owner` or `principal` access, then open:

```text
http://localhost:3000/web/school-setup
```

Expected: academic terms are visible, edit controls are hidden, and the read-only setup panel is shown. If no non-manager account exists locally, record that this check was skipped.

- [ ] **Step 7: Run final checks**

Run:

```bash
pnpm --filter @tsu-stack/core test:unit -- school
pnpm --filter @tsu-stack/api test:unit -- school
pnpm --filter @tsu-stack/web check
```

Expected: all commands PASS.

- [ ] **Step 8: Commit smoke-test fixes**

If smoke exposed fixes, commit only those fixes:

```bash
git status --short
git add packages/core/src/school/types.ts packages/core/src/school/__tests__/types.test.ts packages/api/src/routers/school/setup apps/web/src/pages/school-setup packages/i18n/messages/en.json packages/i18n/messages/de.json docs/ROADMAP.md
git commit -m "fix: harden academic term setup flow"
```

If smoke exposed no fixes, do not create an empty commit.

## Checkpoint: Academic Terms Complete

- [ ] Core school contract tests pass.
- [ ] API school setup router tests pass.
- [ ] Web type/check pipeline passes.
- [ ] Authenticated owner/principal can create a term for an academic year from `/school-setup`.
- [ ] Authenticated owner/principal can edit term name, year, kind, and dates.
- [ ] Non-manager member can view terms but not edit them.
- [ ] Roadmap reflects bootstrap and academic terms as complete.

## Recommended Next Plans After This

1. Staff management: create principal/teacher actor and staff profile records, assign access roles, and list staff.
2. Student records: create student with guardian and relationship records in one vertical slice.
3. Enrollment history: enroll students into academic year, grade level, and section.
4. Subject offerings and staff assignments: connect subjects to sections and assign teachers.
5. Timetable: create manual weekly section slots using subject offerings and assigned teachers.
6. Attendance: create daily section attendance sessions with present defaults and absent exceptions.
7. Basic transport assignment: create stops, routes, route stops, and student rider visibility.

## Risks And Mitigations

| Risk                                                | Impact | Mitigation                                                                                                                              |
| --------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Term dates outside academic year dates              | Medium | Keep DB schema unchanged for this slice; add service-level validation in a later hardening pass if product requires strict containment. |
| UI form grows too tall                              | Low    | Accept for now because current setup page already uses a quick-create panel; split into tabs only when setup becomes difficult to scan. |
| Direct type assertion for term kind in form handler | Low    | Form options are fixed to `termKindSchema` values; server schema remains final authority.                                               |
| Roadmap drift                                       | Medium | Update `docs/ROADMAP.md` in final task after verification.                                                                              |

## Open Questions

- Should term dates be required to sit fully inside their academic year, or can schools create non-standard bridge terms?
- Should academic terms be optional for attendance MVP, or should later attendance screens require a current term for reporting labels?

## Self-Review

- Spec coverage: plan covers the next roadmap gap after completed bootstrap and stays inside MVP academic setup scope.
- Placeholder scan: no deferred implementation placeholders remain in task steps.
- Type consistency: `AcademicTerm`, `AcademicTermCreateInput`, `AcademicTermUpdateInput`, and `academicTerms` names match across core, API, and web plan steps.
