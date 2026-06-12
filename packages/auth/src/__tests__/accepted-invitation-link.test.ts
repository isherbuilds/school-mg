import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    updateCalls: [] as Array<{
      table: string;
      values: unknown;
      where: unknown;
    }>
  };
});

const tables = vi.hoisted(() => {
  return {
    schoolActors: {
      __table: "school_actors",
      email: "school_actors.email",
      organizationId: "school_actors.organizationId",
      status: "school_actors.status",
      updatedAt: "school_actors.updatedAt",
      userId: "school_actors.userId"
    }
  };
});

function tableName(value: unknown): string {
  return typeof value === "object" && value !== null && "__table" in value
    ? String(value.__table)
    : "unknown";
}

vi.mock("@tsu-stack/db", () => {
  return {
    and: vi.fn((...conditions: unknown[]) => {
      return { conditions, op: "and" };
    }),
    db: {
      update: vi.fn((targetTable: unknown) => {
        return {
          set: vi.fn((values: unknown) => {
            return {
              where: vi.fn((where: unknown) => {
                mocks.updateCalls.push({
                  table: tableName(targetTable),
                  values,
                  where
                });
                return Promise.resolve([]);
              })
            };
          })
        };
      })
    },
    eq: vi.fn((column: unknown, value: unknown) => {
      return { column, op: "eq", value };
    }),
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      return { op: "sql", strings, values };
    })
  };
});

vi.mock("@tsu-stack/db/schema", () => tables);

describe("accepted invitation school actor linking", () => {
  beforeEach(() => {
    mocks.updateCalls = [];
  });

  it("links actor using normalized invitation email", async () => {
    const { linkAcceptedInvitationToSchoolActor } = await import("#@/accepted-invitation-link");

    await linkAcceptedInvitationToSchoolActor({
      invitationEmail: " Teacher@Example.com ",
      organizationId: "org-1",
      userId: "user-1"
    });

    expect(mocks.updateCalls).toHaveLength(1);
    expect(mocks.updateCalls[0]).toMatchObject({
      table: "school_actors",
      values: {
        email: "teacher@example.com",
        status: "active",
        userId: "user-1"
      }
    });
    expect(JSON.stringify(mocks.updateCalls[0]?.where)).toContain("teacher@example.com");
  });
});
