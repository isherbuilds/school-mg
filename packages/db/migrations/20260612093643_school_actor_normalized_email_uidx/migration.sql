DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "organization_id", lower(trim("email")) AS "normalized_email"
      FROM "school_actors"
      WHERE "email" IS NOT NULL
      GROUP BY "organization_id", lower(trim("email"))
      HAVING count(*) > 1
    ) "duplicate_school_actor_emails"
  ) THEN
    RAISE EXCEPTION 'Cannot create normalized school_actors email unique index: duplicate normalized emails exist. Resolve duplicate school_actors rows before retrying.';
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "school_actors_email_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "school_actors_email_uidx" ON "school_actors" ("organization_id",lower(trim("email")));
