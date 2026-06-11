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
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");

  if (slug.length >= 3) {
    return slug;
  }

  return slug ? `${slug}-school` : "school";
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
      role: schoolActorRoles.role,
      slug: organization.slug
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .innerJoin(
      schoolActors,
      and(
        eq(schoolActors.organizationId, organization.id),
        eq(schoolActors.status, "active"),
        eq(schoolActors.userId, input.userId)
      )
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

  return {
    activeSchoolId: input.activeOrganizationId,
    schools: dedupeSchoolSummaries(rows.map(organizationToSchoolSummary))
  };
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
  const schools = await listSchoolsForUser({
    activeOrganizationId: input.organizationId,
    userId: input.userId
  });
  const school = schools.schools.find((row) => row.id === input.organizationId);

  if (!school) {
    return null;
  }

  await db
    .update(session)
    .set({ activeOrganizationId: input.organizationId, updatedAt: new Date() })
    .where(eq(session.id, input.sessionId));

  return school;
}
