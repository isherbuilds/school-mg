import {
  type StaffAssignableRole,
  type StaffListInput,
  type StaffMember,
  type StaffMemberCreateInput,
  type StaffMemberUpdateInput,
  type StaffStatus
} from "@tsu-stack/core/school";
import { and, asc, db, desc, eq, inArray, sql } from "@tsu-stack/db";
import {
  invitation,
  member,
  schoolActorRoles,
  schoolActors,
  staffProfiles
} from "@tsu-stack/db/schema";

const assignableStaffRoles: StaffAssignableRole[] = ["principal", "teacher"];

type StaffProfileRow = typeof staffProfiles.$inferSelect;
type StaffActorRow = Pick<
  typeof schoolActors.$inferSelect,
  "email" | "fullName" | "id" | "phone" | "userId"
>;
type StaffRow = StaffProfileRow & {
  actor: StaffActorRow;
};

function timestampToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function actorStatusFromStaffStatus(status: StaffStatus): "active" | "archived" {
  return status === "inactive" ? "archived" : "active";
}

function sortStaffRoles(roles: StaffAssignableRole[]): StaffAssignableRole[] {
  return assignableStaffRoles.filter((role) => roles.includes(role));
}

export function staffMemberToOutput(
  row: StaffRow,
  roleMap: Map<string, StaffAssignableRole[]>,
  memberUserIds: Set<string>,
  activeRoleActorIds: Set<string>,
  pendingInvitationByEmail: Map<string, string>
): StaffMember {
  const invitationId = row.actor.email
    ? (pendingInvitationByEmail.get(normalizeEmail(row.actor.email)) ?? null)
    : null;
  const hasLinkedAccess =
    row.actor.userId !== null &&
    memberUserIds.has(row.actor.userId) &&
    activeRoleActorIds.has(row.actor.id);

  return {
    accessStatus: hasLinkedAccess
      ? "linked"
      : invitationId
        ? "pending"
        : row.actor.userId !== null
          ? "revoked"
          : "not_invited",
    actorId: row.actorId,
    createdAt: timestampToIso(row.createdAt),
    department: row.department,
    email: row.actor.email ?? "",
    employeeCode: row.employeeCode,
    fullName: row.actor.fullName,
    id: row.id,
    invitationId,
    joinedOn: row.joinedOn,
    leftOn: row.leftOn,
    phone: row.actor.phone,
    roles: sortStaffRoles(roleMap.get(row.actorId) ?? []),
    status: row.status,
    title: row.title,
    updatedAt: timestampToIso(row.updatedAt),
    userId: row.actor.userId
  };
}

async function hydrateStaffRows(organizationId: string, rows: StaffRow[]): Promise<StaffMember[]> {
  if (rows.length === 0) {
    return [];
  }

  const actorIds = rows.map((row) => row.actorId);
  const userIds = rows
    .map((row) => row.actor.userId)
    .filter((userId): userId is string => userId !== null);
  const normalizedEmails = [
    ...new Set(
      rows
        .map((row) => (row.actor.email === null ? null : normalizeEmail(row.actor.email)))
        .filter((email): email is string => email !== null && email.length > 0)
    )
  ];

  const [roleRows, memberRows, invitationRows] = await Promise.all([
    db
      .select({
        active: schoolActorRoles.active,
        actorId: schoolActorRoles.actorId,
        role: schoolActorRoles.role
      })
      .from(schoolActorRoles)
      .where(
        and(
          eq(schoolActorRoles.organizationId, organizationId),
          inArray(schoolActorRoles.actorId, actorIds)
        )
      ),
    userIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ userId: member.userId })
          .from(member)
          .where(and(eq(member.organizationId, organizationId), inArray(member.userId, userIds))),
    normalizedEmails.length === 0
      ? Promise.resolve([])
      : db
          .select({
            createdAt: invitation.createdAt,
            email: invitation.email,
            id: invitation.id
          })
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, organizationId),
              eq(invitation.status, "pending"),
              inArray(sql`lower(trim(${invitation.email}))`, normalizedEmails)
            )
          )
          .orderBy(desc(invitation.createdAt))
  ]);

  const roleMap = new Map<string, StaffAssignableRole[]>();
  const activeRoleActorIds = new Set<string>();
  for (const row of roleRows) {
    if (row.active) {
      activeRoleActorIds.add(row.actorId);
    }

    if (!row.active || !assignableStaffRoles.includes(row.role as StaffAssignableRole)) {
      continue;
    }

    const roles = roleMap.get(row.actorId) ?? [];
    roles.push(row.role as StaffAssignableRole);
    roleMap.set(row.actorId, roles);
  }

  const memberUserIds = new Set(memberRows.map((row) => row.userId));
  const pendingInvitationByEmail = new Map<string, string>();
  for (const row of invitationRows) {
    const normalizedEmail = normalizeEmail(row.email);
    if (!pendingInvitationByEmail.has(normalizedEmail)) {
      pendingInvitationByEmail.set(normalizedEmail, row.id);
    }
  }

  return rows.map((row) =>
    staffMemberToOutput(row, roleMap, memberUserIds, activeRoleActorIds, pendingInvitationByEmail)
  );
}

async function getStaffRows(organizationId: string): Promise<StaffRow[]> {
  const rows = await db
    .select({
      actor: {
        email: schoolActors.email,
        fullName: schoolActors.fullName,
        id: schoolActors.id,
        phone: schoolActors.phone,
        userId: schoolActors.userId
      },
      actorId: staffProfiles.actorId,
      createdAt: staffProfiles.createdAt,
      department: staffProfiles.department,
      employeeCode: staffProfiles.employeeCode,
      id: staffProfiles.id,
      joinedOn: staffProfiles.joinedOn,
      leftOn: staffProfiles.leftOn,
      metadata: staffProfiles.metadata,
      organizationId: staffProfiles.organizationId,
      status: staffProfiles.status,
      title: staffProfiles.title,
      updatedAt: staffProfiles.updatedAt
    })
    .from(staffProfiles)
    .innerJoin(
      schoolActors,
      and(
        eq(schoolActors.organizationId, staffProfiles.organizationId),
        eq(schoolActors.id, staffProfiles.actorId)
      )
    )
    .where(eq(staffProfiles.organizationId, organizationId))
    .orderBy(asc(schoolActors.fullName), asc(staffProfiles.employeeCode));

  return rows;
}

async function getStaffMemberById(
  organizationId: string,
  staffProfileId: string
): Promise<StaffMember | null> {
  const rows = await getStaffRows(organizationId);
  const [memberRow] = rows.filter((row) => row.id === staffProfileId);

  if (!memberRow) {
    return null;
  }

  const [staffMember] = await hydrateStaffRows(organizationId, [memberRow]);
  return staffMember ?? null;
}

async function syncStaffRoles(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  organizationId: string,
  actorId: string,
  requestedRoles: readonly StaffAssignableRole[]
) {
  const requestedRoleSet = new Set(requestedRoles);
  const existingRows = await tx
    .select({
      active: schoolActorRoles.active,
      id: schoolActorRoles.id,
      role: schoolActorRoles.role
    })
    .from(schoolActorRoles)
    .where(
      and(
        eq(schoolActorRoles.organizationId, organizationId),
        eq(schoolActorRoles.actorId, actorId),
        inArray(schoolActorRoles.role, assignableStaffRoles)
      )
    );
  const existingByRole = new Map(existingRows.map((row) => [row.role, row]));

  for (const role of assignableStaffRoles) {
    const existing = existingByRole.get(role);
    const shouldBeActive = requestedRoleSet.has(role);

    if (existing) {
      if (existing.active !== shouldBeActive) {
        await tx
          .update(schoolActorRoles)
          .set({ active: shouldBeActive })
          .where(eq(schoolActorRoles.id, existing.id));
      }
      continue;
    }

    if (shouldBeActive) {
      await tx.insert(schoolActorRoles).values({
        actorId,
        id: crypto.randomUUID(),
        organizationId,
        role
      });
    }
  }
}

export async function listStaffMembers(
  organizationId: string,
  _input: StaffListInput
): Promise<StaffMember[]> {
  return hydrateStaffRows(organizationId, await getStaffRows(organizationId));
}

export async function getStaffMemberActiveRoles(
  organizationId: string,
  staffProfileId: string
): Promise<StaffAssignableRole[] | null> {
  const [staffProfile] = await db
    .select({ actorId: staffProfiles.actorId })
    .from(staffProfiles)
    .where(
      and(eq(staffProfiles.organizationId, organizationId), eq(staffProfiles.id, staffProfileId))
    )
    .limit(1);

  if (!staffProfile) {
    return null;
  }

  const rows = await db
    .select({ role: schoolActorRoles.role })
    .from(schoolActorRoles)
    .where(
      and(
        eq(schoolActorRoles.organizationId, organizationId),
        eq(schoolActorRoles.actorId, staffProfile.actorId),
        eq(schoolActorRoles.active, true),
        inArray(schoolActorRoles.role, assignableStaffRoles)
      )
    );

  return sortStaffRoles(rows.map((row) => row.role as StaffAssignableRole));
}

export async function createStaffMember(
  organizationId: string,
  input: StaffMemberCreateInput
): Promise<StaffMember> {
  const staffProfileId = await db.transaction(async (tx) => {
    const [actor] = await tx
      .insert(schoolActors)
      .values({
        email: input.email,
        fullName: input.fullName,
        organizationId,
        phone: input.phone ?? null,
        status: actorStatusFromStaffStatus(input.status),
        userId: null
      })
      .returning();

    const [staffProfile] = await tx
      .insert(staffProfiles)
      .values({
        actorId: actor.id,
        department: input.department ?? null,
        employeeCode: input.employeeCode,
        joinedOn: input.joinedOn ?? null,
        leftOn: input.leftOn ?? null,
        organizationId,
        status: input.status,
        title: input.title ?? null
      })
      .returning({ id: staffProfiles.id });

    await syncStaffRoles(tx, organizationId, actor.id, input.roles);

    return staffProfile.id;
  });

  const staffMember = await getStaffMemberById(organizationId, staffProfileId);

  if (!staffMember) {
    throw new Error("Created staff member could not be reloaded.");
  }

  return staffMember;
}

export async function updateStaffMember(
  organizationId: string,
  input: StaffMemberUpdateInput
): Promise<StaffMember | null> {
  const updatedStaffProfileId = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        actorId: staffProfiles.actorId,
        id: staffProfiles.id
      })
      .from(staffProfiles)
      .where(and(eq(staffProfiles.organizationId, organizationId), eq(staffProfiles.id, input.id)))
      .limit(1);

    if (!existing) {
      return null;
    }

    const actorValues = {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      status: input.status === undefined ? undefined : actorStatusFromStaffStatus(input.status)
    };
    if (Object.values(actorValues).some((value) => value !== undefined)) {
      await tx
        .update(schoolActors)
        .set(actorValues)
        .where(
          and(
            eq(schoolActors.organizationId, organizationId),
            eq(schoolActors.id, existing.actorId)
          )
        );
    }

    const staffValues = {
      department: input.department,
      employeeCode: input.employeeCode,
      joinedOn: input.joinedOn,
      leftOn: input.leftOn,
      status: input.status,
      title: input.title
    };
    if (Object.values(staffValues).some((value) => value !== undefined)) {
      await tx
        .update(staffProfiles)
        .set(staffValues)
        .where(
          and(eq(staffProfiles.organizationId, organizationId), eq(staffProfiles.id, input.id))
        );
    }

    if (input.roles !== undefined) {
      await syncStaffRoles(tx, organizationId, existing.actorId, input.roles);
    }

    return existing.id;
  });

  if (!updatedStaffProfileId) {
    return null;
  }

  return getStaffMemberById(organizationId, updatedStaffProfileId);
}
