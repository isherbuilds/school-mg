import { and, db, eq } from "@tsu-stack/db";
import * as schema from "@tsu-stack/db/schema";

export async function applyAcceptedStaffInvitationToMember(input: {
  invitationId: string;
  organizationId: string;
  userId: string;
}): Promise<void> {
  const [acceptedInvitation] = await db
    .select({
      department: schema.invitation.department,
      employeeCode: schema.invitation.employeeCode,
      schoolRole: schema.invitation.schoolRole,
      staffStatus: schema.invitation.staffStatus,
      title: schema.invitation.title
    })
    .from(schema.invitation)
    .where(eq(schema.invitation.id, input.invitationId))
    .limit(1);

  if (!acceptedInvitation?.schoolRole) {
    return;
  }

  await db
    .update(schema.member)
    .set({
      department: acceptedInvitation.department,
      employeeCode: acceptedInvitation.employeeCode,
      schoolRole: acceptedInvitation.schoolRole,
      staffStatus: acceptedInvitation.staffStatus,
      title: acceptedInvitation.title
    })
    .where(
      and(
        eq(schema.member.organizationId, input.organizationId),
        eq(schema.member.userId, input.userId)
      )
    );
}
