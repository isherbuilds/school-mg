import { parseRootBootstrapEmails } from "@tsu-stack/auth/invitation-signup-gate";
import {
  type SchoolBootstrapCreateOutput,
  type SchoolBootstrapListOutput,
  type SchoolSummary,
  normalizeSchoolSlug
} from "@tsu-stack/core/school";
import { and, asc, db, eq, inArray, isNotNull } from "@tsu-stack/db";
import { member, organization, session } from "@tsu-stack/db/schema";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

function timestampToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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

const rolePriority: Record<SchoolSummary["role"], number> = {
  owner: 3,
  principal: 2,
  teacher: 1
};

function schoolSummariesFromRows(
  rows: {
    createdAt: Date | string;
    id: string;
    name: string;
    role: SchoolSummary["role"] | null;
    slug: string;
  }[]
) {
  return rows.flatMap((row) => {
    if (row.role === null) {
      return [];
    }

    return [
      organizationToSchoolSummary({
        ...row,
        role: row.role
      })
    ];
  });
}

export async function canCreateSchoolForUser(email: string): Promise<boolean> {
  const bootstrapEmails = parseRootBootstrapEmails(ENV_SERVER.ROOT_BOOTSTRAP_EMAILS);

  if (bootstrapEmails.length !== 1) {
    return false;
  }

  return bootstrapEmails.includes(email.trim().toLowerCase());
}

function dedupeSchoolSummaries(rows: SchoolSummary[]): SchoolSummary[] {
  const schoolsById = new Map<string, SchoolSummary>();

  for (const row of rows) {
    const current = schoolsById.get(row.id);

    if (!current || rolePriority[row.role] > rolePriority[current.role]) {
      schoolsById.set(row.id, row);
    }
  }

  return Array.from(schoolsById.values());
}

export async function createSchoolForUser(input: {
  email: string;
  name: string;
  sessionId: string;
  slug?: string | undefined;
  userId: string;
  userName: string;
}): Promise<SchoolBootstrapCreateOutput> {
  const slug = input.slug ?? normalizeSchoolSlug(input.name);

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
      schoolRole: "owner",
      staffStatus: "active",
      userId: input.userId
    });

    await tx
      .update(session)
      .set({ activeOrganizationId: org.id, updatedAt: new Date() })
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

export async function listSchoolsForUser(input: {
  activeOrganizationId: string | null;
  userId: string;
}): Promise<SchoolBootstrapListOutput> {
  const rows = await db
    .select({
      createdAt: organization.createdAt,
      id: organization.id,
      name: organization.name,
      role: member.schoolRole,
      slug: organization.slug
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(
        eq(member.userId, input.userId),
        inArray(member.staffStatus, ["active", "on_leave"]),
        isNotNull(member.schoolRole)
      )
    )
    .orderBy(asc(organization.name));

  const schools = dedupeSchoolSummaries(schoolSummariesFromRows(rows));
  const isActiveSchoolAccessible = schools.some(
    (school) => school.id === input.activeOrganizationId
  );
  const activeSchoolId = isActiveSchoolAccessible ? input.activeOrganizationId : null;

  return {
    activeSchoolId,
    schools
  };
}

async function getAccessibleSchoolForUser(input: {
  organizationId: string;
  userId: string;
}): Promise<SchoolSummary | null> {
  const rows = await db
    .select({
      createdAt: organization.createdAt,
      id: organization.id,
      name: organization.name,
      role: member.schoolRole,
      slug: organization.slug
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(
        eq(member.userId, input.userId),
        eq(organization.id, input.organizationId),
        inArray(member.staffStatus, ["active", "on_leave"]),
        isNotNull(member.schoolRole)
      )
    );

  return dedupeSchoolSummaries(schoolSummariesFromRows(rows))[0] ?? null;
}

export async function getActiveSchoolIdForSession(sessionId: string): Promise<string | null> {
  const [row] = await db
    .select({ activeOrganizationId: session.activeOrganizationId })
    .from(session)
    .where(eq(session.id, sessionId))
    .limit(1);

  return row?.activeOrganizationId ?? null;
}

export async function selectSchoolForUser(input: {
  organizationId: string;
  sessionId: string;
  userId: string;
}): Promise<SchoolSummary | null> {
  const school = await getAccessibleSchoolForUser({
    organizationId: input.organizationId,
    userId: input.userId
  });

  if (!school) {
    return null;
  }

  await db
    .update(session)
    .set({ activeOrganizationId: input.organizationId, updatedAt: new Date() })
    .where(eq(session.id, input.sessionId));

  return school;
}
