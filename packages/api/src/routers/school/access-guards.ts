import { type SchoolAccessRole, type StaffAssignableRole } from "@tsu-stack/core/school";
import { and, db, eq } from "@tsu-stack/db";
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
): Promise<SchoolAccessRole[]> {
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

export function staffPermissionsFromRoles(roles: readonly string[]): {
  canManagePrincipalRole: boolean;
  canManageStaff: boolean;
} {
  const canManagePrincipalRole = roles.includes("owner");

  return {
    canManagePrincipalRole,
    canManageStaff: canManagePrincipalRole || roles.includes("principal")
  };
}

export function canManageRequestedStaffRoles(input: {
  canManagePrincipalRole: boolean;
  requestedRoles?: readonly StaffAssignableRole[] | undefined;
}): boolean {
  return !input.requestedRoles?.includes("principal") || input.canManagePrincipalRole;
}
