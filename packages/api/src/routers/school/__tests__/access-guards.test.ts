import { beforeEach, describe, expect, it, vi } from "vitest";

import { inArray } from "@tsu-stack/db";
import { member } from "@tsu-stack/db/schema";

import { getActiveSchoolRolesForUser } from "#@/routers/school/access-guards";

const dbMock = vi.hoisted(() => {
  const where = vi.fn();
  const from = vi.fn(() => {
    return { where };
  });
  const select = vi.fn(() => {
    return { from };
  });

  return {
    from,
    select,
    where
  };
});

vi.mock("@tsu-stack/db", () => {
  return {
    and: vi.fn((...predicates) => predicates),
    db: {
      select: dbMock.select
    },
    eq: vi.fn((left, right) => {
      return { left, right };
    }),
    inArray: vi.fn((left, values) => {
      return { left, op: "inArray", values };
    }),
    isNotNull: vi.fn((column) => {
      return { column, op: "isNotNull" };
    })
  };
});

describe("school access guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.where.mockResolvedValue([{ role: "principal" }]);
  });

  it("counts active and on-leave member school roles when reading active roles", async () => {
    await expect(getActiveSchoolRolesForUser("org-1", "user-1")).resolves.toEqual(["principal"]);

    expect(inArray).toHaveBeenCalledWith(member.staffStatus, ["active", "on_leave"]);
  });
});
