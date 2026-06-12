import { beforeEach, describe, expect, it, vi } from "vitest";

import { eq } from "@tsu-stack/db";
import { schoolActors } from "@tsu-stack/db/schema";

import { getActiveSchoolRolesForUser } from "#@/routers/school/access-guards";

const dbMock = vi.hoisted(() => {
  const where = vi.fn();
  const innerJoin = vi.fn(() => {
    return { where };
  });
  const from = vi.fn(() => {
    return { innerJoin };
  });
  const select = vi.fn(() => {
    return { from };
  });

  return {
    from,
    innerJoin,
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
    })
  };
});

describe("school access guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.where.mockResolvedValue([{ role: "principal" }]);
  });

  it("only counts active school actors when reading active roles", async () => {
    await expect(getActiveSchoolRolesForUser("org-1", "user-1")).resolves.toEqual(["principal"]);

    expect(eq).toHaveBeenCalledWith(schoolActors.status, "active");
  });
});
