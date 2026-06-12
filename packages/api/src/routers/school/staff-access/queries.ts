import { invitationEmail } from "@tsu-stack/auth/email";
import {
  normalizeEmail,
  type SchoolAccessRole,
  type StaffInvitationPreview,
  type StaffMember
} from "@tsu-stack/core/school";
import { and, db, eq, isNotNull, sql } from "@tsu-stack/db";
import { invitation, member, organization, session } from "@tsu-stack/db/schema";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { getStaffMemberById } from "#@/routers/school/staff/queries";

const invitationDurationMs = 7 * 24 * 60 * 60 * 1000;

type InvitationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StaffMemberForAccess = {
  accessStatus: StaffMember["accessStatus"];
  email: string;
  hasLinkedAccess: boolean;
  id: string;
  invitationId: string | null;
  memberId: string | null;
  role: SchoolAccessRole;
  userId: string | null;
};

type StaffInvitationStatus = StaffInvitationPreview["status"];

function timestampToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizedInvitationEmailEquals(email: string) {
  return sql`lower(trim(${invitation.email})) = ${email}`;
}

function assertOwnerTargetIsNotManaged(staffMember: StaffMemberForAccess) {
  if (staffMember.role === "owner") {
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
  staffMemberId: string
): Promise<StaffMember> {
  const staffMember = await getStaffMemberById(organizationId, staffMemberId);

  if (!staffMember) {
    throw new Error("Staff member could not be reloaded.");
  }

  return staffMember;
}

export async function getStaffMemberForAccess(
  organizationId: string,
  staffMemberId: string
): Promise<StaffMemberForAccess | null> {
  const staffMember = await getStaffMemberById(organizationId, staffMemberId);

  if (!staffMember) {
    return null;
  }

  return {
    accessStatus: staffMember.accessStatus,
    email: staffMember.email,
    hasLinkedAccess: staffMember.accessStatus === "linked",
    id: staffMember.id,
    invitationId: staffMember.invitationId,
    memberId: staffMember.memberId,
    role: staffMember.role,
    userId: staffMember.userId
  };
}

export async function createOrResendStaffInvitation(input: {
  inviterId: string;
  organizationId: string;
  staffMemberId: string;
}): Promise<StaffMember> {
  const staffMember = await getStaffMemberForAccess(input.organizationId, input.staffMemberId);

  if (!staffMember) {
    throw new Error("Staff record not found.");
  }
  assertOwnerTargetIsNotManaged(staffMember);

  if (staffMember.hasLinkedAccess) {
    throw new Error("Staff access is already linked.");
  }

  if (staffMember.memberId) {
    const memberId = staffMember.memberId;

    await db
      .update(member)
      .set({
        deactivatedAt: null,
        deactivationReason: null,
        staffStatus: "active"
      })
      .where(and(eq(member.organizationId, input.organizationId), eq(member.id, memberId)));

    return getStaffMemberOutput(input.organizationId, staffMember.id);
  }

  if (!staffMember.invitationId) {
    throw new Error("Pending invitation not found.");
  }

  const invitationId = staffMember.invitationId;
  const staffEmail = normalizeEmail(staffMember.email);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + invitationDurationMs);

  const refreshInvitation = () =>
    db.transaction(async (tx) => {
      const organizationName = await selectOrganizationName(tx, input.organizationId);

      await tx
        .update(invitation)
        .set({
          createdAt: now,
          expiresAt,
          inviterId: input.inviterId,
          status: "pending"
        })
        .where(
          and(eq(invitation.organizationId, input.organizationId), eq(invitation.id, invitationId))
        );

      return organizationName;
    });

  const organizationName = await refreshInvitation();

  await invitationEmail({
    organizationName,
    to: staffEmail,
    url: `${ENV_SERVER.VITE_WEB_URL}/accept-invitation/${invitationId}`
  });

  return getStaffMemberOutput(input.organizationId, staffMember.id);
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
    .where(and(eq(invitation.id, invitationId), isNotNull(invitation.schoolRole)))
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
  staffMemberId: string;
}): Promise<StaffMember> {
  const staffMember = await getStaffMemberForAccess(input.organizationId, input.staffMemberId);

  if (!staffMember) {
    throw new Error("Staff record not found.");
  }
  assertOwnerTargetIsNotManaged(staffMember);

  if (staffMember.invitationId) {
    const invitationId = staffMember.invitationId;

    await db
      .update(invitation)
      .set({ status: "canceled" })
      .where(
        and(eq(invitation.organizationId, input.organizationId), eq(invitation.id, invitationId))
      );

    return getStaffMemberOutput(input.organizationId, staffMember.id);
  }

  if (!staffMember.memberId) {
    throw new Error("Staff member record not found.");
  }

  const memberId = staffMember.memberId;

  await db.transaction(async (tx) => {
    await tx
      .update(invitation)
      .set({ status: "canceled" })
      .where(
        and(
          eq(invitation.organizationId, input.organizationId),
          normalizedInvitationEmailEquals(staffMember.email),
          eq(invitation.status, "pending"),
          isNotNull(invitation.schoolRole)
        )
      );

    await tx
      .update(member)
      .set({
        deactivatedAt: new Date(),
        deactivationReason: "access_revoked",
        staffStatus: "inactive"
      })
      .where(and(eq(member.organizationId, input.organizationId), eq(member.id, memberId)));

    if (!staffMember.userId) {
      return;
    }

    await tx
      .update(session)
      .set({ activeOrganizationId: null })
      .where(
        and(
          eq(session.userId, staffMember.userId),
          eq(session.activeOrganizationId, input.organizationId)
        )
      );
  });

  return getStaffMemberOutput(input.organizationId, staffMember.id);
}
