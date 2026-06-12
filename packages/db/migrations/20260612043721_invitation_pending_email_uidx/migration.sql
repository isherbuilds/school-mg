WITH ranked_pending_invitations AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "organization_id", lower(trim("email"))
			ORDER BY "created_at" DESC, "id" DESC
		) AS "duplicate_rank"
	FROM "invitation"
	WHERE "status" = 'pending'
)
UPDATE "invitation"
SET "status" = 'canceled'
FROM ranked_pending_invitations
WHERE "invitation"."id" = ranked_pending_invitations."id"
	AND ranked_pending_invitations."duplicate_rank" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_pending_email_uidx" ON "invitation" ("organization_id",lower(trim("email"))) WHERE "status" = 'pending';--> statement-breakpoint
