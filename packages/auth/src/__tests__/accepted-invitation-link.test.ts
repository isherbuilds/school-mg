import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    selectRows: [] as unknown[],
    updateCalls: [] as Array<{ table: string; values: unknown }>
  };
});

const tables = vi.hoisted(() => {
  return {
    invitation: {
      __table: "invitation",
      department: "invitation.department",
      employeeCode: "invitation.employeeCode",
      id: "invitation.id",
      schoolRole: "invitation.schoolRole",
      staffStatus: "invitation.staffStatus",
      title: "invitation.title"
    },
    member: {
      __table: "member",
      organizationId: "member.organizationId",
      userId: "member.userId"
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
    and: vi.fn((...conditions: unknown[]) => conditions),
    db: {
      select: vi.fn(() => {
        return {
          from: vi.fn(() => {
            return {
              where: vi.fn(() => {
                return {
                  limit: vi.fn(() => Promise.resolve(mocks.selectRows))
                };
              })
            };
          })
        };
      }),
      update: vi.fn((targetTable: unknown) => {
        return {
          set: vi.fn((values: unknown) => {
            mocks.updateCalls.push({ table: tableName(targetTable), values });
            return {
              where: vi.fn(() => Promise.resolve([]))
            };
          })
        };
      })
    },
    eq: vi.fn((column: unknown, value: unknown) => {
      return { column, value };
    })
  };
});

vi.mock("@tsu-stack/db/schema", () => tables);

describe("accepted staff invitation linking", () => {
  beforeEach(() => {
    mocks.selectRows = [
      {
        department: "Academics",
        employeeCode: "T-001",
        schoolRole: "teacher",
        staffStatus: "active",
        title: "Teacher"
      }
    ];
    mocks.updateCalls = [];
  });

  it("copies staff invitation fields onto the Better Auth member", async () => {
    const { applyAcceptedStaffInvitationToMember } = await import("#@/accepted-invitation-link");

    await applyAcceptedStaffInvitationToMember({
      invitationId: "invitation-1",
      organizationId: "org-1",
      userId: "user-1"
    });

    expect(mocks.updateCalls).toEqual([
      {
        table: "member",
        values: {
          department: "Academics",
          employeeCode: "T-001",
          schoolRole: "teacher",
          staffStatus: "active",
          title: "Teacher"
        }
      }
    ]);
  });

  it("ignores generic organization invitations", async () => {
    mocks.selectRows = [{ schoolRole: null }];

    const { applyAcceptedStaffInvitationToMember } = await import("#@/accepted-invitation-link");

    await applyAcceptedStaffInvitationToMember({
      invitationId: "invitation-1",
      organizationId: "org-1",
      userId: "user-1"
    });

    expect(mocks.updateCalls).toEqual([]);
  });
});
