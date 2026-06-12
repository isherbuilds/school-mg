import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type OrpcContext } from "#@/lib/context/types";
import * as accessGuards from "#@/routers/school/access-guards";
import { schoolStaffRouter } from "#@/routers/school/staff/index";
import * as queries from "#@/routers/school/staff/queries";

vi.mock("#@/routers/school/access-guards", () => {
  return {
    canManageRequestedStaffRoles: vi.fn(),
    getActiveOrganizationIdForSession: vi.fn(),
    getActiveSchoolRolesForUser: vi.fn(),
    isOrganizationMember: vi.fn(),
    staffPermissionsFromRoles: vi.fn()
  };
});

vi.mock("#@/routers/school/staff/queries", () => {
  return {
    createStaffMember: vi.fn(),
    getStaffMemberActiveRoles: vi.fn(),
    listStaffMembers: vi.fn(),
    updateStaffMember: vi.fn()
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

const staffMember = {
  accessStatus: "linked" as const,
  actorId: "018f3ad5-8af8-733f-bb74-33f7f224f126",
  createdAt: "2026-06-10T00:00:00.000Z",
  department: "Academics",
  email: "teacher@example.com",
  employeeCode: "T-001",
  fullName: "Taylor Teacher",
  id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
  invitationId: null,
  joinedOn: "2026-06-01",
  leftOn: null,
  phone: "+15551234567",
  roles: ["teacher" as const],
  status: "active" as const,
  title: "Teacher",
  updatedAt: "2026-06-10T00:00:00.000Z",
  userId: "staff-user-1"
};

const createInput = {
  department: "Academics",
  email: "teacher@example.com",
  employeeCode: "T-001",
  fullName: "Taylor Teacher",
  joinedOn: "2026-06-01",
  phone: "+15551234567",
  roles: ["teacher" as const],
  status: "active" as const,
  title: "Teacher"
};

describe("school staff router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accessGuards.getActiveOrganizationIdForSession).mockResolvedValue("org-1");
    vi.mocked(accessGuards.isOrganizationMember).mockResolvedValue(true);
    vi.mocked(accessGuards.getActiveSchoolRolesForUser).mockResolvedValue(["principal"]);
    vi.mocked(accessGuards.staffPermissionsFromRoles).mockReturnValue({
      canManagePrincipalRole: false,
      canManageStaff: true
    });
    vi.mocked(accessGuards.canManageRequestedStaffRoles).mockReturnValue(true);
    vi.mocked(queries.getStaffMemberActiveRoles).mockResolvedValue(["teacher"]);
    vi.mocked(queries.listStaffMembers).mockResolvedValue([staffMember]);
    vi.mocked(queries.createStaffMember).mockResolvedValue(staffMember);
    vi.mocked(queries.updateStaffMember).mockResolvedValue(staffMember);
  });

  it("is exposed under the school router", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-with-enough-length-123456";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NODE_ENV = "development";
    process.env.VITE_SERVER_URL = "http://localhost:5000/server";
    process.env.VITE_WEB_URL = "http://localhost:3000/web";

    const { appRouter } = await import("#@/routers/index");

    expect(appRouter.school.staff.list).toBeDefined();
    expect(appRouter.school.staff.create).toBeDefined();
    expect(appRouter.school.staff.update).toBeDefined();
  });

  it("requires active organization and membership when listing staff", async () => {
    await expect(call(schoolStaffRouter.list, {}, { context })).resolves.toEqual({
      canManagePrincipalRole: false,
      canManageStaff: true,
      staff: [staffMember]
    });

    expect(accessGuards.getActiveOrganizationIdForSession).toHaveBeenCalledWith("session-1");
    expect(accessGuards.isOrganizationMember).toHaveBeenCalledWith("org-1", "user-1");
    expect(accessGuards.getActiveSchoolRolesForUser).toHaveBeenCalledWith("org-1", "user-1");
    expect(queries.listStaffMembers).toHaveBeenCalledWith("org-1", {});
  });

  it("rejects staff listing without an active organization", async () => {
    vi.mocked(accessGuards.getActiveOrganizationIdForSession).mockResolvedValue(null);

    await expect(call(schoolStaffRouter.list, {}, { context })).rejects.toMatchObject({
      code: "ACTIVE_ORGANIZATION_REQUIRED"
    });

    expect(accessGuards.isOrganizationMember).not.toHaveBeenCalled();
    expect(queries.listStaffMembers).not.toHaveBeenCalled();
  });

  it("rejects staff listing for non-members", async () => {
    vi.mocked(accessGuards.isOrganizationMember).mockResolvedValue(false);

    await expect(call(schoolStaffRouter.list, {}, { context })).rejects.toMatchObject({
      code: "ORGANIZATION_ACCESS_DENIED"
    });

    expect(accessGuards.getActiveSchoolRolesForUser).not.toHaveBeenCalled();
    expect(queries.listStaffMembers).not.toHaveBeenCalled();
  });

  it("rejects staff listing for members without active school app roles", async () => {
    vi.mocked(accessGuards.getActiveSchoolRolesForUser).mockResolvedValue([]);

    await expect(call(schoolStaffRouter.list, {}, { context })).rejects.toMatchObject({
      code: "ORGANIZATION_ACCESS_DENIED"
    });

    expect(accessGuards.staffPermissionsFromRoles).not.toHaveBeenCalled();
    expect(queries.listStaffMembers).not.toHaveBeenCalled();
  });

  it("denies staff creation for non-manager members before writing", async () => {
    vi.mocked(accessGuards.staffPermissionsFromRoles).mockReturnValue({
      canManagePrincipalRole: false,
      canManageStaff: false
    });

    await expect(call(schoolStaffRouter.create, createInput, { context })).rejects.toMatchObject({
      code: "SCHOOL_STAFF_MANAGEMENT_DENIED"
    });

    expect(queries.createStaffMember).not.toHaveBeenCalled();
  });

  it("denies principal creation unless the user can manage principal roles", async () => {
    vi.mocked(accessGuards.staffPermissionsFromRoles).mockReturnValue({
      canManagePrincipalRole: false,
      canManageStaff: true
    });
    vi.mocked(accessGuards.canManageRequestedStaffRoles).mockReturnValue(false);

    await expect(
      call(
        schoolStaffRouter.create,
        {
          ...createInput,
          roles: ["principal" as const]
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "SCHOOL_PRINCIPAL_MANAGEMENT_DENIED" });

    expect(queries.createStaffMember).not.toHaveBeenCalled();
  });

  it("maps duplicate staff records to a typed error", async () => {
    vi.mocked(queries.createStaffMember).mockRejectedValue({ code: "23505" });

    await expect(call(schoolStaffRouter.create, createInput, { context })).rejects.toMatchObject({
      code: "DUPLICATE_STAFF_RECORD"
    });
  });

  it("maps missing staff update rows to a typed error", async () => {
    vi.mocked(queries.updateStaffMember).mockResolvedValue(null);

    await expect(
      call(
        schoolStaffRouter.update,
        {
          id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
          title: "Senior Teacher"
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "STAFF_RECORD_NOT_FOUND" });
  });

  it("denies principal managers from demoting existing principals", async () => {
    vi.mocked(queries.getStaffMemberActiveRoles).mockResolvedValue(["principal"]);

    await expect(
      call(
        schoolStaffRouter.update,
        {
          id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
          roles: ["teacher" as const]
        },
        { context }
      )
    ).rejects.toMatchObject({ code: "SCHOOL_PRINCIPAL_MANAGEMENT_DENIED" });

    expect(queries.updateStaffMember).not.toHaveBeenCalled();
  });

  it("allows owners to demote existing principals", async () => {
    vi.mocked(accessGuards.staffPermissionsFromRoles).mockReturnValue({
      canManagePrincipalRole: true,
      canManageStaff: true
    });
    vi.mocked(queries.getStaffMemberActiveRoles).mockResolvedValue(["principal"]);

    await expect(
      call(
        schoolStaffRouter.update,
        {
          id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
          roles: ["teacher" as const]
        },
        { context }
      )
    ).resolves.toEqual(staffMember);

    expect(queries.updateStaffMember).toHaveBeenCalledWith("org-1", {
      id: "018f3ad5-8af8-733f-bb74-33f7f224f127",
      roles: ["teacher"]
    });
  });
});
