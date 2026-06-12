import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  type MutationCall = {
    table: string;
    values?: unknown;
  };

  return {
    dbSelectResults: [] as unknown[][],
    deleteCalls: [] as MutationCall[],
    events: [] as string[],
    insertCalls: [] as MutationCall[],
    insertErrors: [] as unknown[],
    invitationEmail: vi.fn(),
    listStaffMembers: vi.fn(),
    transactionCount: 0,
    txSelectResults: [] as unknown[][],
    updateCalls: [] as MutationCall[]
  };
});

const tables = vi.hoisted(() => {
  const table = (name: string, columns: string[]) =>
    Object.fromEntries([
      ["__table", name],
      ...columns.map((column) => [column, `${name}.${column}`])
    ]);

  return {
    invitation: table("invitation", [
      "createdAt",
      "email",
      "expiresAt",
      "id",
      "inviterId",
      "organizationId",
      "role",
      "status"
    ]),
    member: table("member", ["id", "organizationId", "userId"]),
    organization: table("organization", ["id", "name"]),
    schoolActorRoles: table("school_actor_roles", ["active", "actorId", "organizationId", "role"]),
    schoolActors: table("school_actors", ["email", "id", "organizationId", "userId"]),
    session: table("session", ["activeOrganizationId", "userId"]),
    staffProfiles: table("staff_profiles", ["actorId", "id", "organizationId"])
  };
});

const invitationDurationMs = 7 * 24 * 60 * 60 * 1000;

function tableName(value: unknown): string {
  return typeof value === "object" && value !== null && "__table" in value
    ? String(value.__table)
    : "unknown";
}

function makeSelectBuilder(results: unknown[][]) {
  const makeResult = () => {
    const result = Promise.resolve(results.shift() ?? []);

    return Object.assign(result, {
      limit: vi.fn(() => result),
      orderBy: vi.fn(() => result)
    });
  };

  const builder = {
    from: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(results.shift() ?? [])),
    orderBy: vi.fn(() => builder),
    where: vi.fn(() => makeResult())
  };

  return builder;
}

function makeDbFacade(selectResults: unknown[][]) {
  return {
    delete: vi.fn((targetTable: unknown) => {
      return {
        where: vi.fn(() => {
          mocks.deleteCalls.push({ table: tableName(targetTable) });
          return Promise.resolve([]);
        })
      };
    }),
    insert: vi.fn((targetTable: unknown) => {
      return {
        values: vi.fn((values: unknown) => {
          const insertError = mocks.insertErrors.shift();
          if (insertError) {
            return Promise.reject(insertError);
          }
          mocks.insertCalls.push({ table: tableName(targetTable), values });
          return Promise.resolve([]);
        })
      };
    }),
    select: vi.fn(() => makeSelectBuilder(selectResults)),
    update: vi.fn((targetTable: unknown) => {
      return {
        set: vi.fn((values: unknown) => {
          return {
            where: vi.fn(() => {
              mocks.updateCalls.push({ table: tableName(targetTable), values });
              return Promise.resolve([]);
            })
          };
        })
      };
    })
  };
}

vi.mock("@tsu-stack/auth/email", () => {
  return {
    invitationEmail: vi.fn((input: unknown) => {
      mocks.events.push("email:invitation");
      return mocks.invitationEmail(input);
    })
  };
});

vi.mock("@tsu-stack/db", () => {
  const db = {
    ...makeDbFacade(mocks.dbSelectResults),
    transaction: vi.fn(async (callback: (tx: ReturnType<typeof makeDbFacade>) => unknown) => {
      mocks.transactionCount += 1;
      mocks.events.push("transaction:start");
      const result = await callback(makeDbFacade(mocks.txSelectResults));
      mocks.events.push("transaction:commit");
      return result;
    })
  };

  return {
    and: vi.fn((...conditions: unknown[]) => {
      return { conditions, op: "and" };
    }),
    db,
    desc: vi.fn((column: unknown) => {
      return { column, op: "desc" };
    }),
    eq: vi.fn((column: unknown, value: unknown) => {
      return { column, op: "eq", value };
    }),
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      return { op: "sql", strings, values };
    }),
    inArray: vi.fn((column: unknown, values: readonly unknown[]) => {
      return { column, op: "inArray", values };
    })
  };
});

vi.mock("@tsu-stack/db/schema", () => tables);

vi.mock("@tsu-stack/env/server/env", () => {
  return {
    ENV_SERVER: {
      VITE_WEB_URL: "http://localhost:3000/web"
    }
  };
});

vi.mock("#@/routers/school/staff/queries", () => {
  return {
    listStaffMembers: mocks.listStaffMembers
  };
});

const staffProfileRow = {
  actor: {
    email: "teacher@example.com",
    id: "018f3ad5-8af8-733f-bb74-33f7f224f126",
    userId: "staff-user-1"
  },
  id: "018f3ad5-8af8-733f-bb74-33f7f224f127"
};

const staffMember = {
  accessStatus: "pending" as const,
  actorId: staffProfileRow.actor.id,
  createdAt: "2026-06-10T00:00:00.000Z",
  department: "Academics",
  email: "teacher@example.com",
  employeeCode: "T-001",
  fullName: "Taylor Teacher",
  id: staffProfileRow.id,
  invitationId: "invitation-1",
  joinedOn: "2026-06-01",
  leftOn: null,
  phone: "+15551234567",
  roles: ["teacher" as const],
  status: "active" as const,
  title: "Teacher",
  updatedAt: "2026-06-10T00:00:00.000Z",
  userId: "staff-user-1"
};

describe("staff access query helpers", () => {
  beforeEach(() => {
    mocks.dbSelectResults.length = 0;
    mocks.deleteCalls = [];
    mocks.events = [];
    mocks.insertCalls = [];
    mocks.insertErrors = [];
    mocks.invitationEmail.mockReset();
    mocks.listStaffMembers.mockReset();
    mocks.listStaffMembers.mockResolvedValue([staffMember]);
    mocks.transactionCount = 0;
    mocks.txSelectResults.length = 0;
    mocks.updateCalls = [];
  });

  it("maps pending expired invitation previews to expired status", async () => {
    mocks.dbSelectResults.push([
      {
        email: "teacher@example.com",
        expiresAt: new Date("2000-01-01T00:00:00.000Z"),
        organizationName: "Central School",
        status: "pending"
      }
    ]);

    const { previewStaffInvitation } = await import("#@/routers/school/staff-access/queries");

    await expect(previewStaffInvitation("invitation-1")).resolves.toEqual({
      email: "teacher@example.com",
      expiresAt: "2000-01-01T00:00:00.000Z",
      invitationId: "invitation-1",
      organizationName: "Central School",
      status: "expired"
    });
  });

  it("creates a pending member invitation and emails the accept URL", async () => {
    mocks.dbSelectResults.push([staffProfileRow], [{ role: "teacher" }], [{ id: "member-1" }]);
    mocks.txSelectResults.push([{ name: "Central School" }], []);

    const { createOrResendStaffInvitation } =
      await import("#@/routers/school/staff-access/queries");

    await createOrResendStaffInvitation({
      inviterId: "manager-user-1",
      organizationId: "org-1",
      staffProfileId: staffProfileRow.id
    });

    expect(mocks.insertCalls).toHaveLength(1);
    expect(mocks.insertCalls[0]).toMatchObject({
      table: "invitation",
      values: {
        email: "teacher@example.com",
        inviterId: "manager-user-1",
        organizationId: "org-1",
        role: "member",
        status: "pending"
      }
    });
    const insertedInvitation = mocks.insertCalls[0]?.values as {
      createdAt: Date;
      expiresAt: Date;
      id: string;
    };
    expect(insertedInvitation.expiresAt.getTime() - insertedInvitation.createdAt.getTime()).toBe(
      invitationDurationMs
    );
    expect(mocks.invitationEmail).toHaveBeenCalledWith({
      organizationName: "Central School",
      to: "teacher@example.com",
      url: `http://localhost:3000/web/accept-invitation/${insertedInvitation.id}`
    });
  });

  it("resends an existing pending member invitation with a fresh expiry and inviter", async () => {
    mocks.dbSelectResults.push([staffProfileRow], [{ role: "teacher" }], [{ id: "member-1" }]);
    mocks.txSelectResults.push(
      [{ name: "Central School" }],
      [{ id: "pending-invitation-1" }, { id: "duplicate-invitation-1" }]
    );

    const { createOrResendStaffInvitation } =
      await import("#@/routers/school/staff-access/queries");

    await createOrResendStaffInvitation({
      inviterId: "manager-user-2",
      organizationId: "org-1",
      staffProfileId: staffProfileRow.id
    });

    expect(mocks.insertCalls).toHaveLength(0);
    expect(mocks.updateCalls).toMatchObject([
      {
        table: "invitation",
        values: {
          inviterId: "manager-user-2",
          role: "member",
          status: "pending"
        }
      },
      {
        table: "invitation",
        values: {
          status: "canceled"
        }
      }
    ]);
    const resendValues = mocks.updateCalls[0]?.values as {
      createdAt: Date;
      expiresAt: Date;
    };
    expect(resendValues.expiresAt.getTime() - resendValues.createdAt.getTime()).toBe(
      invitationDurationMs
    );
    expect(mocks.invitationEmail).toHaveBeenCalledWith({
      organizationName: "Central School",
      to: "teacher@example.com",
      url: "http://localhost:3000/web/accept-invitation/pending-invitation-1"
    });
    expect(mocks.events).toEqual(["transaction:start", "transaction:commit", "email:invitation"]);
  });

  it("reuses pending invitation when concurrent insert hits unique pending email index", async () => {
    mocks.dbSelectResults.push([staffProfileRow], [{ role: "teacher" }], [{ id: "member-1" }]);
    mocks.txSelectResults.push(
      [{ name: "Central School" }],
      [],
      [{ name: "Central School" }],
      [{ id: "pending-invitation-1" }]
    );
    mocks.insertErrors.push(Object.assign(new Error("duplicate key value"), { code: "23505" }));

    const { createOrResendStaffInvitation } =
      await import("#@/routers/school/staff-access/queries");

    await createOrResendStaffInvitation({
      inviterId: "manager-user-2",
      organizationId: "org-1",
      staffProfileId: staffProfileRow.id
    });

    expect(mocks.insertCalls).toHaveLength(0);
    expect(mocks.updateCalls).toMatchObject([
      {
        table: "invitation",
        values: {
          inviterId: "manager-user-2",
          role: "member",
          status: "pending"
        }
      }
    ]);
    expect(mocks.invitationEmail).toHaveBeenCalledTimes(1);
    expect(mocks.invitationEmail).toHaveBeenCalledWith({
      organizationName: "Central School",
      to: "teacher@example.com",
      url: "http://localhost:3000/web/accept-invitation/pending-invitation-1"
    });
    expect(mocks.events).toEqual([
      "transaction:start",
      "transaction:start",
      "transaction:commit",
      "email:invitation"
    ]);
  });

  it("revokes app access without deleting staff profile, actor, or role assignment records", async () => {
    mocks.dbSelectResults.push([staffProfileRow], [{ role: "teacher" }], [{ id: "member-1" }]);
    mocks.txSelectResults.push([{ id: "pending-invitation-1" }]);
    mocks.listStaffMembers.mockResolvedValue([
      {
        ...staffMember,
        accessStatus: "revoked",
        invitationId: null
      }
    ]);

    const { revokeStaffAccess } = await import("#@/routers/school/staff-access/queries");

    await expect(
      revokeStaffAccess({
        organizationId: "org-1",
        staffProfileId: staffProfileRow.id
      })
    ).resolves.toMatchObject({
      accessStatus: "revoked",
      id: staffProfileRow.id
    });

    expect(mocks.updateCalls).toEqual([
      {
        table: "invitation",
        values: { status: "canceled" }
      },
      {
        table: "session",
        values: { activeOrganizationId: null }
      }
    ]);
    expect(mocks.deleteCalls).toEqual([{ table: "member" }]);
    expect(mocks.updateCalls.map((call) => call.table)).not.toContain("school_actors");
    expect(mocks.updateCalls.map((call) => call.table)).not.toContain("school_actor_roles");
    expect(mocks.updateCalls.map((call) => call.table)).not.toContain("staff_profiles");
    expect(mocks.deleteCalls.map((call) => call.table)).not.toContain("school_actors");
    expect(mocks.deleteCalls.map((call) => call.table)).not.toContain("staff_profiles");
  });

  it("rejects owner targets before mutating access", async () => {
    mocks.dbSelectResults.push([staffProfileRow], [{ role: "owner" }], [{ id: "member-1" }]);

    const { createOrResendStaffInvitation, revokeStaffAccess } =
      await import("#@/routers/school/staff-access/queries");

    await expect(
      createOrResendStaffInvitation({
        inviterId: "manager-user-1",
        organizationId: "org-1",
        staffProfileId: staffProfileRow.id
      })
    ).rejects.toThrow("Owner staff access is not manageable.");

    mocks.dbSelectResults.push([staffProfileRow], [{ role: "owner" }], [{ id: "member-1" }]);

    await expect(
      revokeStaffAccess({
        organizationId: "org-1",
        staffProfileId: staffProfileRow.id
      })
    ).rejects.toThrow("Owner staff access is not manageable.");

    expect(mocks.insertCalls).toHaveLength(0);
    expect(mocks.updateCalls).toHaveLength(0);
    expect(mocks.deleteCalls).toHaveLength(0);
    expect(mocks.invitationEmail).not.toHaveBeenCalled();
  });
});
