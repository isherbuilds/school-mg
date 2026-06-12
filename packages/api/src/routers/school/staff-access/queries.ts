import { invitationEmail } from "@tsu-stack/auth/email";
import {
  type SchoolAccessRole,
  type StaffInvitationPreview,
  type StaffMember
} from "@tsu-stack/core/school";
import { and, db, desc, eq, inArray, sql } from "@tsu-stack/db";
import {
  invitation,
  member,
  organization,
  schoolActorRoles,
  schoolActors,
  session,
  staffProfiles
} from "@tsu-stack/db/schema";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { listStaffMembers } from "#@/routers/school/staff/queries";

const invitationDurationMs = 7 * 24 * 60 * 60 * 1000;
const staffManageableRoles = ["principal", "teacher"] as const;

type InvitationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StaffProfileForAccess = {
  actorId: string;
  email: string | null;
  hasLinkedAccess: boolean;
  id: string;
  roles: SchoolAccessRole[];
  userId: string | null;
};

type StaffInvitationStatus = StaffInvitationPreview["status"];

function timestampToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizedInvitationEmailEquals(email: string) {
  return sql`lower(trim(${invitation.email})) = ${email}`;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function assertOwnerTargetIsNotManaged(staffProfile: StaffProfileForAccess) {
  if (staffProfile.roles.includes("owner")) {
    throw new Error("Owner staff access is not manageable.");
  }
}

function normalizeInvitationStatus(
  status: string,
  expiresAt: Date | string
): StaffInvitationStatus {
  if (status === "pending" && new Date(expiresAt).getTime() < Date.now()) {
    return "expired";
  }

  if (
    status === "pending" ||
    status === "accepted" ||
    status === "rejected" ||
    status === "canceled"
  ) {
    return status;
  }

  return "pending";
}

async function cancelPendingInvitations(
  tx: InvitationTransaction,
  invitationIds: readonly string[]
) {
  for (const invitationId of invitationIds) {
    await tx.update(invitation).set({ status: "canceled" }).where(eq(invitation.id, invitationId));
  }
}

async function selectPendingInvitations(
  tx: InvitationTransaction,
  organizationId: string,
  email: string
) {
  return tx
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        normalizedInvitationEmailEquals(email),
        eq(invitation.status, "pending")
      )
    )
    .orderBy(desc(invitation.createdAt));
}

async function refreshPendingInvitation(
  tx: InvitationTransaction,
  input: {
    expiresAt: Date;
    invitationId: string;
    inviterId: string;
    now: Date;
  }
) {
  await tx
    .update(invitation)
    .set({
      createdAt: input.now,
      expiresAt: input.expiresAt,
      inviterId: input.inviterId,
      role: "member",
      status: "pending"
    })
    .where(eq(invitation.id, input.invitationId));
}

async function reusePendingInvitation(
  tx: InvitationTransaction,
  input: {
    expiresAt: Date;
    inviterId: string;
    now: Date;
    organizationId: string;
    staffEmail: string;
  }
) {
  const pendingInvitations = await selectPendingInvitations(
    tx,
    input.organizationId,
    input.staffEmail
  );
  const [pendingInvitation] = pendingInvitations;

  if (!pendingInvitation) {
    return null;
  }

  await refreshPendingInvitation(tx, {
    expiresAt: input.expiresAt,
    invitationId: pendingInvitation.id,
    inviterId: input.inviterId,
    now: input.now
  });
  await cancelPendingInvitations(
    tx,
    pendingInvitations.slice(1).map((invitationRow) => invitationRow.id)
  );

  return pendingInvitation.id;
}

async function selectOrganizationName(tx: InvitationTransaction, organizationId: string) {
  const [organizationRow] = await tx
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!organizationRow) {
    throw new Error("Organization not found.");
  }

  return organizationRow.name;
}

async function getStaffMemberOutput(
  organizationId: string,
  staffProfileId: string
): Promise<StaffMember> {
  const staffMembers = await listStaffMembers(organizationId, {});
  const staffMember = staffMembers.find((member) => member.id === staffProfileId);

  if (!staffMember) {
    throw new Error("Staff member could not be reloaded.");
  }

  return staffMember;
}

export async function getStaffProfileForAccess(
  organizationId: string,
  staffProfileId: string
): Promise<StaffProfileForAccess | null> {
  const [staffProfile] = await db
    .select({
      actor: {
        email: schoolActors.email,
        id: schoolActors.id,
        userId: schoolActors.userId
      },
      id: staffProfiles.id
    })
    .from(staffProfiles)
    .innerJoin(
      schoolActors,
      and(
        eq(schoolActors.organizationId, staffProfiles.organizationId),
        eq(schoolActors.id, staffProfiles.actorId)
      )
    )
    .where(
      and(eq(staffProfiles.organizationId, organizationId), eq(staffProfiles.id, staffProfileId))
    )
    .limit(1);

  if (!staffProfile) {
    return null;
  }

  const roleRows = await db
    .select({ role: schoolActorRoles.role })
    .from(schoolActorRoles)
    .where(
      and(
        eq(schoolActorRoles.organizationId, organizationId),
        eq(schoolActorRoles.actorId, staffProfile.actor.id),
        eq(schoolActorRoles.active, true)
      )
    );

  const memberRows =
    staffProfile.actor.userId === null
      ? []
      : await db
          .select({ id: member.id })
          .from(member)
          .where(
            and(
              eq(member.organizationId, organizationId),
              eq(member.userId, staffProfile.actor.userId)
            )
          )
          .limit(1);

  return {
    actorId: staffProfile.actor.id,
    email: staffProfile.actor.email,
    hasLinkedAccess:
      staffProfile.actor.userId !== null && memberRows.length > 0 && roleRows.length > 0,
    id: staffProfile.id,
    roles: roleRows.map((row) => row.role),
    userId: staffProfile.actor.userId
  };
}

export async function createOrResendStaffInvitation(input: {
  inviterId: string;
  organizationId: string;
  staffProfileId: string;
}): Promise<StaffMember> {
  const staffProfile = await getStaffProfileForAccess(input.organizationId, input.staffProfileId);

  if (!staffProfile) {
    throw new Error("Staff record not found.");
  }
  assertOwnerTargetIsNotManaged(staffProfile);

  if (!staffProfile.email) {
    throw new Error("Staff record has no email.");
  }
  const staffEmail = normalizeEmail(staffProfile.email);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + invitationDurationMs);

  const createInvitationDetails = () =>
    db.transaction(async (tx) => {
      const organizationName = await selectOrganizationName(tx, input.organizationId);
      const pendingInvitationId = await reusePendingInvitation(tx, {
        expiresAt,
        inviterId: input.inviterId,
        now,
        organizationId: input.organizationId,
        staffEmail
      });

      if (pendingInvitationId) {
        return {
          invitationId: pendingInvitationId,
          organizationName
        };
      }

      const invitationId = crypto.randomUUID();
      await tx.insert(invitation).values({
        createdAt: now,
        email: staffEmail,
        expiresAt,
        id: invitationId,
        inviterId: input.inviterId,
        organizationId: input.organizationId,
        role: "member",
        status: "pending"
      });

      return {
        invitationId,
        organizationName
      };
    });

  const reuseInvitationDetails = () =>
    db.transaction(async (tx) => {
      const organizationName = await selectOrganizationName(tx, input.organizationId);
      const pendingInvitationId = await reusePendingInvitation(tx, {
        expiresAt,
        inviterId: input.inviterId,
        now,
        organizationId: input.organizationId,
        staffEmail
      });

      if (!pendingInvitationId) {
        throw new Error("Pending staff invitation could not be reloaded after conflict.");
      }

      return {
        invitationId: pendingInvitationId,
        organizationName
      };
    });

  const invitationDetails = await createInvitationDetails().catch((error: unknown) => {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    return reuseInvitationDetails();
  });

  await invitationEmail({
    organizationName: invitationDetails.organizationName,
    to: staffEmail,
    url: `${ENV_SERVER.VITE_WEB_URL}/accept-invitation/${invitationDetails.invitationId}`
  });

  return getStaffMemberOutput(input.organizationId, input.staffProfileId);
}

export async function previewStaffInvitation(
  invitationId: string
): Promise<StaffInvitationPreview | null> {
  const [row] = await db
    .select({
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
      status: invitation.status
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(eq(invitation.id, invitationId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    email: row.email,
    expiresAt: timestampToIso(row.expiresAt),
    invitationId,
    organizationName: row.organizationName,
    status: normalizeInvitationStatus(row.status, row.expiresAt)
  };
}

export async function revokeStaffAccess(input: {
  organizationId: string;
  staffProfileId: string;
}): Promise<StaffMember> {
  const staffProfile = await getStaffProfileForAccess(input.organizationId, input.staffProfileId);

  if (!staffProfile) {
    throw new Error("Staff record not found.");
  }
  assertOwnerTargetIsNotManaged(staffProfile);

  await db.transaction(async (tx) => {
    if (staffProfile.email) {
      const pendingInvitations = await tx
        .select({ id: invitation.id })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, input.organizationId),
            normalizedInvitationEmailEquals(normalizeEmail(staffProfile.email)),
            eq(invitation.status, "pending")
          )
        );

      await cancelPendingInvitations(
        tx,
        pendingInvitations.map((invitationRow) => invitationRow.id)
      );
    }

    await tx
      .update(schoolActorRoles)
      .set({ active: false })
      .where(
        and(
          eq(schoolActorRoles.organizationId, input.organizationId),
          eq(schoolActorRoles.actorId, staffProfile.actorId),
          inArray(schoolActorRoles.role, staffManageableRoles)
        )
      );

    if (!staffProfile.userId) {
      return;
    }

    await tx
      .delete(member)
      .where(
        and(eq(member.organizationId, input.organizationId), eq(member.userId, staffProfile.userId))
      );

    await tx
      .update(session)
      .set({ activeOrganizationId: null })
      .where(
        and(
          eq(session.userId, staffProfile.userId),
          eq(session.activeOrganizationId, input.organizationId)
        )
      );
  });

  return getStaffMemberOutput(input.organizationId, input.staffProfileId);
}
