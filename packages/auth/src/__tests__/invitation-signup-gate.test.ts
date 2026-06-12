import { beforeEach, describe, expect, it, vi } from "vitest";

type DbQueueValue = unknown[] | number;

const dbQueue: DbQueueValue[] = [];
const envServer = vi.hoisted(() => {
  return {
    ROOT_BOOTSTRAP_EMAILS: "root@example.com"
  };
});

function queueDbResult(value: DbQueueValue) {
  dbQueue.push(value);
}

const tables = vi.hoisted(() => {
  const table = (name: string, columns: string[]) =>
    Object.fromEntries(columns.map((column) => [column, `${name}.${column}`]));

  return {
    invitation: table("invitation", [
      "email",
      "expiresAt",
      "id",
      "organizationId",
      "schoolRole",
      "status"
    ]),
    user: table("user", ["id"])
  };
});

vi.mock("@tsu-stack/db", () => {
  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(dbQueue.shift())),
    select: vi.fn(() => query),
    where: vi.fn(() => query)
  };

  return {
    and: vi.fn((...conditions: unknown[]) => {
      return { conditions, type: "and" };
    }),
    count: vi.fn(() => "count"),
    db: query,
    eq: vi.fn((left: unknown, right: unknown) => {
      return { left, right, type: "eq" };
    }),
    inArray: vi.fn((column: unknown, values: unknown[]) => {
      return { column, type: "inArray", values };
    }),
    isNotNull: vi.fn((column: unknown) => {
      return { column, type: "isNotNull" };
    })
  };
});

vi.mock("@tsu-stack/db/schema", () => tables);

vi.mock("@tsu-stack/env/server/env", () => {
  return {
    ENV_SERVER: envServer
  };
});

describe("invitation signup gate", () => {
  beforeEach(() => {
    dbQueue.length = 0;
    envServer.ROOT_BOOTSTRAP_EMAILS = "root@example.com";
  });

  it("normalizes and deduplicates root bootstrap emails", async () => {
    const { parseRootBootstrapEmails } = await import("#@/invitation-signup-gate");

    expect(
      parseRootBootstrapEmails(" Root@Example.com, admin@example.com\nroot@example.com ")
    ).toEqual(["root@example.com", "admin@example.com"]);
  });

  it("allows configured root bootstrap email before any users exist", async () => {
    const { canBootstrapRootUser } = await import("#@/invitation-signup-gate");
    queueDbResult([{ count: 0 }]);

    await expect(canBootstrapRootUser(" ROOT@example.com ")).resolves.toBe(true);
  });

  it("closes root bootstrap after first user exists", async () => {
    const { canBootstrapRootUser } = await import("#@/invitation-signup-gate");
    queueDbResult([{ count: 1 }]);

    await expect(canBootstrapRootUser("root@example.com")).resolves.toBe(false);
  });

  it("denies root bootstrap when multiple emails are configured", async () => {
    const { canBootstrapRootUser } = await import("#@/invitation-signup-gate");
    envServer.ROOT_BOOTSTRAP_EMAILS = "root@example.com, admin@example.com";
    queueDbResult([{ count: 0 }]);

    await expect(canBootstrapRootUser("root@example.com")).resolves.toBe(false);
  });

  it("rejects invitation signup when staff invitation email does not match", async () => {
    const { canSignUpWithInvitation } = await import("#@/invitation-signup-gate");
    queueDbResult([
      {
        email: "invited@example.com",
        expiresAt: new Date(Date.now() + 60_000),
        id: "invitation-1",
        organizationId: "org-1",
        status: "pending"
      }
    ]);

    await expect(
      canSignUpWithInvitation({
        email: "other@example.com",
        invitationId: "invitation-1"
      })
    ).resolves.toBe(false);
  });

  it("rejects signup for non-staff organization invitations", async () => {
    const { canSignUpWithInvitation } = await import("#@/invitation-signup-gate");
    queueDbResult([]);

    await expect(
      canSignUpWithInvitation({
        email: " invited@example.com ",
        invitationId: "invitation-1"
      })
    ).resolves.toBe(false);
  });

  it("allows signup with matching pending staff invitation", async () => {
    const { canSignUpWithInvitation } = await import("#@/invitation-signup-gate");
    queueDbResult([
      {
        email: "Invited@Example.com",
        expiresAt: new Date(Date.now() + 60_000),
        id: "invitation-1",
        organizationId: "org-1",
        status: "pending"
      }
    ]);

    await expect(
      canSignUpWithInvitation({
        email: " invited@example.com ",
        invitationId: "invitation-1"
      })
    ).resolves.toBe(true);
  });
});
