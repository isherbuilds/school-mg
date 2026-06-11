import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type OrpcContext } from "#@/lib/context/types";
import { schoolSetupRouter } from "#@/routers/school/setup/index";
import * as queries from "#@/routers/school/setup/queries";

vi.mock("#@/routers/school/setup/queries", () => {
  return {
    createAcademicYear: vi.fn(),
    createGradeLevel: vi.fn(),
    createSection: vi.fn(),
    createSubject: vi.fn(),
    isOrganizationMember: vi.fn(),
    isSchoolSetupManager: vi.fn(),
    listSchoolSetup: vi.fn(),
    updateAcademicYear: vi.fn(),
    updateGradeLevel: vi.fn(),
    updateSection: vi.fn(),
    updateSubject: vi.fn()
  };
});

const context = {
  session: {
    session: {
      activeOrganizationId: "org-1"
    },
    user: {
      id: "user-1"
    }
  }
} as unknown as OrpcContext;

const gradeLevel = {
  code: "G5",
  createdAt: "2026-06-10T00:00:00.000Z",
  id: "018f3ad5-8af8-733f-bb74-33f7f224f126",
  name: "Grade 5",
  sortOrder: 5,
  updatedAt: "2026-06-10T00:00:00.000Z"
};

describe("school setup router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queries.isOrganizationMember).mockResolvedValue(true);
    vi.mocked(queries.isSchoolSetupManager).mockResolvedValue(true);
    vi.mocked(queries.listSchoolSetup).mockResolvedValue({
      academicYears: [],
      gradeLevels: [],
      sections: [],
      subjects: []
    });
    vi.mocked(queries.createGradeLevel).mockResolvedValue(gradeLevel);
  });

  it("is exposed under the school router", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-with-enough-length-123456";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NODE_ENV = "development";
    process.env.VITE_SERVER_URL = "http://localhost:5000/server";
    process.env.VITE_WEB_URL = "http://localhost:3000/web";

    const { appRouter } = await import("#@/routers/index");

    expect(appRouter.school.setup.list).toBeDefined();
    expect(appRouter.school.setup.academicYears.create).toBeDefined();
    expect(appRouter.school.setup.academicYears.update).toBeDefined();
    expect(appRouter.school.setup.gradeLevels.create).toBeDefined();
    expect(appRouter.school.setup.gradeLevels.update).toBeDefined();
    expect(appRouter.school.setup.sections.create).toBeDefined();
    expect(appRouter.school.setup.sections.update).toBeDefined();
    expect(appRouter.school.setup.subjects.create).toBeDefined();
    expect(appRouter.school.setup.subjects.update).toBeDefined();
  });

  it("allows organization members to list setup records", async () => {
    expect(await call(schoolSetupRouter.list, {}, { context })).toEqual({
      academicYears: [],
      canManageSetup: true,
      gradeLevels: [],
      sections: [],
      subjects: []
    });

    expect(queries.isSchoolSetupManager).toHaveBeenCalledWith("org-1", "user-1");
  });

  it("allows non-manager members to list setup records without management capability", async () => {
    vi.mocked(queries.isSchoolSetupManager).mockResolvedValue(false);

    expect(await call(schoolSetupRouter.list, {}, { context })).toMatchObject({
      canManageSetup: false
    });
  });

  it("rejects setup mutations for non-manager members", async () => {
    vi.mocked(queries.isSchoolSetupManager).mockResolvedValue(false);

    await expect(
      call(
        schoolSetupRouter.gradeLevels.create,
        {
          code: "G5",
          name: "Grade 5"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "SCHOOL_SETUP_MANAGEMENT_DENIED" });

    expect(queries.createGradeLevel).not.toHaveBeenCalled();
  });

  it("maps setup reference constraint failures to typed errors", async () => {
    vi.mocked(queries.createSection).mockRejectedValue({ code: "23503" });

    await expect(
      call(
        schoolSetupRouter.sections.create,
        {
          academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
          code: "5A",
          gradeLevelId: "018f3ad5-8af8-733f-bb74-33f7f224f127",
          name: "Class 5 A"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "INVALID_SCHOOL_SETUP_REFERENCE" });
  });
});
