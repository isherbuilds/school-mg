import {
  type AcademicTerm,
  type AcademicTermCreateInput,
  type AcademicTermUpdateInput,
  type AcademicYear,
  type AcademicYearCreateInput,
  type AcademicYearUpdateInput,
  type GradeLevel,
  type GradeLevelCreateInput,
  type GradeLevelUpdateInput,
  type SchoolSetupListInput,
  type SchoolSetupListOutput,
  type Section,
  type SectionCreateInput,
  type SectionUpdateInput,
  type Subject,
  type SubjectCreateInput,
  type SubjectUpdateInput
} from "@tsu-stack/core/school";
import { and, asc, db, eq, inArray, ne } from "@tsu-stack/db";
import {
  academicTerms,
  academicYears,
  gradeLevels,
  member,
  session,
  sections,
  subjects
} from "@tsu-stack/db/schema";

import {
  AcademicTermDateRangeError,
  isAcademicTermDateRangeInsideAcademicYear,
  SchoolSetupReferenceError
} from "./utils";

function timestampToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function academicYearToOutput(row: typeof academicYears.$inferSelect): AcademicYear {
  return {
    createdAt: timestampToIso(row.createdAt),
    endDate: row.endDate,
    id: row.id,
    isCurrent: row.isCurrent,
    name: row.name,
    startDate: row.startDate,
    updatedAt: timestampToIso(row.updatedAt)
  };
}

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

function shouldValidateAcademicTermRange(input: AcademicTermUpdateInput): boolean {
  return (
    input.academicYearId !== undefined ||
    input.startDate !== undefined ||
    input.endDate !== undefined
  );
}

async function getAcademicYearDateRange(organizationId: string, academicYearId: string) {
  const [academicYear] = await db
    .select({
      endDate: academicYears.endDate,
      startDate: academicYears.startDate
    })
    .from(academicYears)
    .where(
      and(eq(academicYears.organizationId, organizationId), eq(academicYears.id, academicYearId))
    )
    .limit(1);

  if (!academicYear) {
    throw new SchoolSetupReferenceError();
  }

  return academicYear;
}

async function assertAcademicTermInsideAcademicYear(
  organizationId: string,
  input: Pick<AcademicTermCreateInput, "academicYearId" | "endDate" | "startDate">
) {
  const academicYear = await getAcademicYearDateRange(organizationId, input.academicYearId);

  if (!isAcademicTermDateRangeInsideAcademicYear(input, academicYear)) {
    throw new AcademicTermDateRangeError();
  }
}

function gradeLevelToOutput(row: typeof gradeLevels.$inferSelect): GradeLevel {
  return {
    code: row.code,
    createdAt: timestampToIso(row.createdAt),
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    updatedAt: timestampToIso(row.updatedAt)
  };
}

function subjectToOutput(row: typeof subjects.$inferSelect): Subject {
  return {
    code: row.code,
    createdAt: timestampToIso(row.createdAt),
    id: row.id,
    isCore: row.isCore,
    name: row.name,
    shortName: row.shortName,
    updatedAt: timestampToIso(row.updatedAt)
  };
}

function sectionToOutput(row: typeof sections.$inferSelect): Section {
  return {
    academicYearId: row.academicYearId,
    capacity: row.capacity,
    code: row.code,
    createdAt: timestampToIso(row.createdAt),
    gradeLevelId: row.gradeLevelId,
    id: row.id,
    name: row.name,
    shift: row.shift,
    updatedAt: timestampToIso(row.updatedAt)
  };
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

export async function isSchoolSetupManager(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, userId),
        inArray(member.staffStatus, ["active", "on_leave"]),
        inArray(member.schoolRole, ["owner", "principal"])
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function getActiveOrganizationIdForSession(sessionId: string): Promise<string | null> {
  const [row] = await db
    .select({ activeOrganizationId: session.activeOrganizationId })
    .from(session)
    .where(eq(session.id, sessionId))
    .limit(1);

  return row?.activeOrganizationId ?? null;
}

export async function listSchoolSetup(
  organizationId: string,
  input: SchoolSetupListInput
): Promise<Omit<SchoolSetupListOutput, "canManageSetup">> {
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
}

export async function createAcademicTerm(
  organizationId: string,
  input: AcademicTermCreateInput
): Promise<AcademicTerm> {
  await assertAcademicTermInsideAcademicYear(organizationId, input);

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

  if (shouldValidateAcademicTermRange(input)) {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          academicYearId: academicTerms.academicYearId,
          endDate: academicTerms.endDate,
          startDate: academicTerms.startDate
        })
        .from(academicTerms)
        .where(and(eq(academicTerms.organizationId, organizationId), eq(academicTerms.id, id)))
        .limit(1);

      if (!existing) {
        return null;
      }

      const nextTerm = {
        academicYearId: input.academicYearId ?? existing.academicYearId,
        endDate: input.endDate ?? existing.endDate,
        startDate: input.startDate ?? existing.startDate
      };
      const [academicYear] = await tx
        .select({
          endDate: academicYears.endDate,
          startDate: academicYears.startDate
        })
        .from(academicYears)
        .where(
          and(
            eq(academicYears.organizationId, organizationId),
            eq(academicYears.id, nextTerm.academicYearId)
          )
        )
        .limit(1);

      if (!academicYear) {
        throw new SchoolSetupReferenceError();
      }

      if (!isAcademicTermDateRangeInsideAcademicYear(nextTerm, academicYear)) {
        throw new AcademicTermDateRangeError();
      }

      const [row] = await tx
        .update(academicTerms)
        .set(values)
        .where(and(eq(academicTerms.organizationId, organizationId), eq(academicTerms.id, id)))
        .returning();

      return row ? academicTermToOutput(row) : null;
    });
  }

  const [row] = await db
    .update(academicTerms)
    .set(values)
    .where(and(eq(academicTerms.organizationId, organizationId), eq(academicTerms.id, id)))
    .returning();

  return row ? academicTermToOutput(row) : null;
}

export async function createAcademicYear(
  organizationId: string,
  input: AcademicYearCreateInput
): Promise<AcademicYear> {
  const [row] = await db.transaction(async (tx) => {
    if (input.isCurrent) {
      await tx
        .update(academicYears)
        .set({ isCurrent: false })
        .where(eq(academicYears.organizationId, organizationId));
    }

    return tx
      .insert(academicYears)
      .values({ ...input, organizationId })
      .returning();
  });

  return academicYearToOutput(row);
}

export async function updateAcademicYear(
  organizationId: string,
  input: AcademicYearUpdateInput
): Promise<AcademicYear | null> {
  const { id, ...values } = input;
  const [row] = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.organizationId, organizationId), eq(academicYears.id, id)))
      .limit(1);

    if (!existing) {
      return [];
    }

    if (input.isCurrent) {
      await tx
        .update(academicYears)
        .set({ isCurrent: false })
        .where(and(eq(academicYears.organizationId, organizationId), ne(academicYears.id, id)));
    }

    return tx
      .update(academicYears)
      .set(values)
      .where(and(eq(academicYears.organizationId, organizationId), eq(academicYears.id, id)))
      .returning();
  });

  return row ? academicYearToOutput(row) : null;
}

export async function createGradeLevel(
  organizationId: string,
  input: GradeLevelCreateInput
): Promise<GradeLevel> {
  const [row] = await db
    .insert(gradeLevels)
    .values({ ...input, organizationId })
    .returning();

  return gradeLevelToOutput(row);
}

export async function updateGradeLevel(
  organizationId: string,
  input: GradeLevelUpdateInput
): Promise<GradeLevel | null> {
  const { id, ...values } = input;
  const [row] = await db
    .update(gradeLevels)
    .set(values)
    .where(and(eq(gradeLevels.organizationId, organizationId), eq(gradeLevels.id, id)))
    .returning();

  return row ? gradeLevelToOutput(row) : null;
}

export async function createSubject(
  organizationId: string,
  input: SubjectCreateInput
): Promise<Subject> {
  const [row] = await db
    .insert(subjects)
    .values({ ...input, organizationId, shortName: input.shortName ?? null })
    .returning();

  return subjectToOutput(row);
}

export async function updateSubject(
  organizationId: string,
  input: SubjectUpdateInput
): Promise<Subject | null> {
  const { id, ...values } = input;
  const [row] = await db
    .update(subjects)
    .set(values)
    .where(and(eq(subjects.organizationId, organizationId), eq(subjects.id, id)))
    .returning();

  return row ? subjectToOutput(row) : null;
}

export async function createSection(
  organizationId: string,
  input: SectionCreateInput
): Promise<Section> {
  const [row] = await db
    .insert(sections)
    .values({ ...input, organizationId, capacity: input.capacity ?? null })
    .returning();

  return sectionToOutput(row);
}

export async function updateSection(
  organizationId: string,
  input: SectionUpdateInput
): Promise<Section | null> {
  const { id, ...values } = input;
  const [row] = await db
    .update(sections)
    .set(values)
    .where(and(eq(sections.organizationId, organizationId), eq(sections.id, id)))
    .returning();

  return row ? sectionToOutput(row) : null;
}
