import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type OrpcContext } from "#@/lib/context/types";
import { schoolSetupRouter } from "#@/routers/school/setup/index";
import * as queries from "#@/routers/school/setup/queries";

vi.mock("#@/routers/school/setup/queries", () => {
  return {
    createAcademicTerm: vi.fn(),
    createAcademicYear: vi.fn(),
    createGradeLevel: vi.fn(),
    createSection: vi.fn(),
    createSubject: vi.fn(),
    getActiveOrganizationIdForSession: vi.fn(),
    isOrganizationMember: vi.fn(),
    isSchoolSetupManager: vi.fn(),
    listSchoolSetup: vi.fn(),
    updateAcademicTerm: vi.fn(),
    updateAcademicYear: vi.fn(),
    updateGradeLevel: vi.fn(),
    updateSection: vi.fn(),
    updateSubject: vi.fn()
  };
});

const context = {
  session: {
    session: {
      activeOrganizationId: "stale-org",
      id: "session-1"
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

const academicTerm = {
  academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
  createdAt: "2026-06-10T00:00:00.000Z",
  endDate: "2026-09-30",
  id: "018f3ad5-8af8-733f-bb74-33f7f224f128",
  kind: "semester" as const,
  name: "Term 1",
  sortOrder: 1,
  startDate: "2026-06-01",
  updatedAt: "2026-06-10T00:00:00.000Z"
};

describe("school setup router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queries.getActiveOrganizationIdForSession).mockResolvedValue("org-1");
    vi.mocked(queries.isOrganizationMember).mockResolvedValue(true);
    vi.mocked(queries.isSchoolSetupManager).mockResolvedValue(true);
    vi.mocked(queries.listSchoolSetup).mockResolvedValue({
      academicTerms: [],
      academicYears: [],
      gradeLevels: [],
      sections: [],
      subjects: []
    });
    vi.mocked(queries.createAcademicTerm).mockResolvedValue(academicTerm);
    vi.mocked(queries.createGradeLevel).mockResolvedValue(gradeLevel);
    vi.mocked(queries.updateAcademicTerm).mockResolvedValue(academicTerm);
  });

  it("is exposed under the school router", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-with-enough-length-123456";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NODE_ENV = "development";
    process.env.VITE_SERVER_URL = "http://localhost:5000/server";
    process.env.VITE_WEB_URL = "http://localhost:3000/web";

    const { appRouter } = await import("#@/routers/index");

    expect(appRouter.school.setup.list).toBeDefined();
    expect(appRouter.school.setup.academicTerms.create).toBeDefined();
    expect(appRouter.school.setup.academicTerms.update).toBeDefined();
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
      academicTerms: [],
      academicYears: [],
      canManageSetup: true,
      gradeLevels: [],
      sections: [],
      subjects: []
    });

    expect(queries.isSchoolSetupManager).toHaveBeenCalledWith("org-1", "user-1");
  });

  it("requires an active organization from the session table", async () => {
    vi.mocked(queries.getActiveOrganizationIdForSession).mockResolvedValue(null);

    await expect(call(schoolSetupRouter.list, {}, { context })).rejects.toMatchObject({
      code: "ACTIVE_ORGANIZATION_REQUIRED"
    });

    expect(queries.isOrganizationMember).not.toHaveBeenCalled();
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

  it("rejects academic term mutations for non-manager members", async () => {
    vi.mocked(queries.isSchoolSetupManager).mockResolvedValue(false);

    await expect(
      call(
        schoolSetupRouter.academicTerms.create,
        {
          academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
          endDate: "2026-09-30",
          name: "Term 1",
          startDate: "2026-06-01"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "SCHOOL_SETUP_MANAGEMENT_DENIED" });

    expect(queries.createAcademicTerm).not.toHaveBeenCalled();
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

  it("maps academic term reference failures to typed errors", async () => {
    vi.mocked(queries.createAcademicTerm).mockRejectedValue({ code: "23503" });

    await expect(
      call(
        schoolSetupRouter.academicTerms.create,
        {
          academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
          endDate: "2026-09-30",
          name: "Term 1",
          startDate: "2026-06-01"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "INVALID_SCHOOL_SETUP_REFERENCE" });
  });

  it("updates academic terms for manager members", async () => {
    await expect(
      call(
        schoolSetupRouter.academicTerms.update,
        {
          endDate: "2026-09-30",
          id: "018f3ad5-8af8-733f-bb74-33f7f224f128",
          name: "Term 1",
          startDate: "2026-06-01"
        },
        { context }
      )
    ).resolves.toEqual(academicTerm);

    expect(queries.updateAcademicTerm).toHaveBeenCalledWith("org-1", {
      endDate: "2026-09-30",
      id: "018f3ad5-8af8-733f-bb74-33f7f224f128",
      name: "Term 1",
      startDate: "2026-06-01"
    });
  });

  it("maps missing academic terms to typed not found errors", async () => {
    vi.mocked(queries.updateAcademicTerm).mockResolvedValue(null);

    await expect(
      call(
        schoolSetupRouter.academicTerms.update,
        {
          id: "018f3ad5-8af8-733f-bb74-33f7f224f128",
          name: "Term 1"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "SCHOOL_SETUP_RECORD_NOT_FOUND" });
  });

  it("maps academic term update constraint failures to typed errors", async () => {
    vi.mocked(queries.updateAcademicTerm).mockRejectedValue({ code: "23514" });

    await expect(
      call(
        schoolSetupRouter.academicTerms.update,
        {
          endDate: "2026-09-30",
          id: "018f3ad5-8af8-733f-bb74-33f7f224f128",
          startDate: "2026-06-01"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "INVALID_SCHOOL_SETUP_DATES" });
  });

  it("maps academic term update reference failures to typed errors", async () => {
    vi.mocked(queries.updateAcademicTerm).mockRejectedValue({ code: "23503" });

    await expect(
      call(
        schoolSetupRouter.academicTerms.update,
        {
          academicYearId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
          id: "018f3ad5-8af8-733f-bb74-33f7f224f128"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "INVALID_SCHOOL_SETUP_REFERENCE" });
  });
});
