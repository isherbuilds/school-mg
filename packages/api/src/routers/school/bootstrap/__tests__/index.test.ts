import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type OrpcContext } from "#@/lib/context/types";
import { schoolBootstrapRouter } from "#@/routers/school/bootstrap/index";
import * as queries from "#@/routers/school/bootstrap/queries";

vi.mock("#@/routers/school/bootstrap/queries", () => {
  return {
    createSchoolForUser: vi.fn(),
    getActiveSchoolIdForSession: vi.fn(),
    listSchoolsForUser: vi.fn(),
    selectSchoolForUser: vi.fn()
  };
});

const context = {
  session: {
    session: {
      activeOrganizationId: "org-1",
      id: "session-1"
    },
    user: {
      email: "admin@example.com",
      id: "user-1",
      name: "School Admin"
    }
  }
} as unknown as OrpcContext;

const activeSchool = {
  createdAt: "2026-06-11T00:00:00.000Z",
  id: "org-1",
  name: "Spring Valley School",
  role: "owner" as const,
  slug: "spring-valley"
};

describe("school bootstrap router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queries.createSchoolForUser).mockResolvedValue({
      activeSchool
    });
    vi.mocked(queries.getActiveSchoolIdForSession).mockResolvedValue("org-1");
    vi.mocked(queries.listSchoolsForUser).mockResolvedValue({
      activeSchoolId: "org-1",
      schools: [activeSchool]
    });
    vi.mocked(queries.selectSchoolForUser).mockResolvedValue(activeSchool);
  });

  it("is exposed under the school router", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-with-enough-length-123456";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NODE_ENV = "development";
    process.env.VITE_SERVER_URL = "http://localhost:5000/server";
    process.env.VITE_WEB_URL = "http://localhost:3000/web";

    const { appRouter } = await import("#@/routers/index");

    expect(appRouter.school.bootstrap.create).toBeDefined();
    expect(appRouter.school.bootstrap.list).toBeDefined();
    expect(appRouter.school.bootstrap.select).toBeDefined();
  });

  it("creates a school and makes it active for the current session", async () => {
    await expect(
      call(
        schoolBootstrapRouter.create,
        {
          name: "Spring Valley School",
          slug: "spring-valley"
        },
        { context }
      )
    ).resolves.toEqual({
      activeSchool
    });

    expect(queries.createSchoolForUser).toHaveBeenCalledWith({
      email: "admin@example.com",
      name: "Spring Valley School",
      sessionId: "session-1",
      slug: "spring-valley",
      userId: "user-1",
      userName: "School Admin"
    });
  });

  it("maps duplicate school slug conflicts to a typed error", async () => {
    vi.mocked(queries.createSchoolForUser).mockRejectedValue({ code: "23505" });

    await expect(
      call(
        schoolBootstrapRouter.create,
        {
          name: "Spring Valley School",
          slug: "spring-valley"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "DUPLICATE_SCHOOL_SLUG" });
  });

  it("maps wrapped duplicate school slug conflicts to a typed error", async () => {
    vi.mocked(queries.createSchoolForUser).mockRejectedValue({
      cause: { code: "23505" }
    });

    await expect(
      call(
        schoolBootstrapRouter.create,
        {
          name: "Spring Valley School",
          slug: "spring-valley"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "DUPLICATE_SCHOOL_SLUG" });
  });

  it("lists schools for the current user and active organization", async () => {
    await expect(call(schoolBootstrapRouter.list, {}, { context })).resolves.toEqual({
      activeSchoolId: "org-1",
      schools: [activeSchool]
    });

    expect(queries.getActiveSchoolIdForSession).toHaveBeenCalledWith("session-1");
    expect(queries.listSchoolsForUser).toHaveBeenCalledWith({
      activeOrganizationId: "org-1",
      userId: "user-1"
    });
  });

  it("selects an accessible school for the current session", async () => {
    await expect(
      call(
        schoolBootstrapRouter.select,
        {
          id: "org-2"
        },
        { context }
      )
    ).resolves.toEqual({
      activeSchool
    });

    expect(queries.selectSchoolForUser).toHaveBeenCalledWith({
      organizationId: "org-2",
      sessionId: "session-1",
      userId: "user-1"
    });
  });

  it("maps inaccessible school selection to a typed error", async () => {
    vi.mocked(queries.selectSchoolForUser).mockResolvedValue(null);

    await expect(
      call(
        schoolBootstrapRouter.select,
        {
          id: "org-2"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "SCHOOL_ACCESS_DENIED" });
  });
});
