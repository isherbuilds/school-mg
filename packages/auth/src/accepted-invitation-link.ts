import { and, db, eq, sql } from "@tsu-stack/db";
import * as schema from "@tsu-stack/db/schema";

export async function linkAcceptedInvitationToSchoolActor(input: {
  invitationEmail: string;
  organizationId: string;
  userId: string;
}): Promise<void> {
  const normalizedEmail = input.invitationEmail.trim().toLowerCase();

  await db
    .update(schema.schoolActors)
    .set({
      email: normalizedEmail,
      status: "active",
      updatedAt: new Date(),
      userId: input.userId
    })
    .where(
      and(
        eq(schema.schoolActors.organizationId, input.organizationId),
        sql`lower(trim(${schema.schoolActors.email})) = ${normalizedEmail}`
      )
    );
}
