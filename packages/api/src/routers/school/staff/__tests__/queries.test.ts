import { describe, expect, it } from "vitest";

const staffRow = {
  actor: {
    email: "teacher@example.com",
    fullName: "Taylor Teacher",
    id: "018f3ad5-8af8-733f-bb74-33f7f224f126",
    phone: null,
    userId: "staff-user-1"
  },
  actorId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  department: null,
  employeeCode: "T-001",
  id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
  joinedOn: null,
  leftOn: null,
  metadata: null,
  organizationId: "org-1",
  status: "active" as const,
  title: null,
  updatedAt: new Date("2026-06-10T00:00:00.000Z")
};

describe("staff query mapping", () => {
  it("prefers pending invitations over revoked access when the actor has a user", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-with-enough-length-123456";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NODE_ENV = "development";
    process.env.VITE_SERVER_URL = "http://localhost:5000/server";
    process.env.VITE_WEB_URL = "http://localhost:3000/web";

    const { staffMemberToOutput } = await import("#@/routers/school/staff/queries");

    expect(
      staffMemberToOutput(
        staffRow,
        new Map(),
        new Set(),
        new Set(),
        new Map([["teacher@example.com", "invitation-1"]])
      )
    ).toMatchObject({
      accessStatus: "pending",
      invitationId: "invitation-1",
      userId: "staff-user-1"
    });
  });

  it("matches pending invitation emails after normalizing actor email case", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-with-enough-length-123456";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NODE_ENV = "development";
    process.env.VITE_SERVER_URL = "http://localhost:5000/server";
    process.env.VITE_WEB_URL = "http://localhost:3000/web";

    const { staffMemberToOutput } = await import("#@/routers/school/staff/queries");

    expect(
      staffMemberToOutput(
        {
          ...staffRow,
          actor: {
            ...staffRow.actor,
            email: " Teacher@Example.com "
          }
        },
        new Map(),
        new Set(),
        new Set(),
        new Map([["teacher@example.com", "invitation-1"]])
      )
    ).toMatchObject({
      accessStatus: "pending",
      invitationId: "invitation-1"
    });
  });
});
