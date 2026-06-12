import "@tanstack/react-start/server-only";

import { and, count, db, eq, inArray, isNotNull } from "@tsu-stack/db";
import { invitation, user } from "@tsu-stack/db/schema";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

const staffAssignableRoles = ["principal", "teacher"] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseRootBootstrapEmails(value: string): string[] {
  const emails = value
    .split(/[\s,]+/)
    .map(normalizeEmail)
    .filter(Boolean);

  return Array.from(new Set(emails));
}

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ count: count() }).from(user).limit(1);

  return Number(row?.count ?? 0);
}

export async function canBootstrapRootUser(email: string): Promise<boolean> {
  const bootstrapEmails = parseRootBootstrapEmails(ENV_SERVER.ROOT_BOOTSTRAP_EMAILS);

  if (bootstrapEmails.length !== 1) {
    return false;
  }

  if (!bootstrapEmails.includes(normalizeEmail(email))) {
    return false;
  }

  return (await countUsers()) === 0;
}

export async function findStaffInvitationById(id: string) {
  const [row] = await db
    .select({
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      id: invitation.id,
      organizationId: invitation.organizationId,
      status: invitation.status
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.id, id),
        eq(invitation.status, "pending"),
        isNotNull(invitation.schoolRole),
        inArray(invitation.schoolRole, [...staffAssignableRoles])
      )
    )
    .limit(1);

  return row ?? null;
}

export async function canSignUpWithInvitation(input: {
  email: string;
  invitationId: string;
}): Promise<boolean> {
  const invite = await findStaffInvitationById(input.invitationId);

  if (!invite) {
    return false;
  }

  return (
    invite.status === "pending" &&
    invite.expiresAt > new Date() &&
    normalizeEmail(invite.email) === normalizeEmail(input.email)
  );
}
