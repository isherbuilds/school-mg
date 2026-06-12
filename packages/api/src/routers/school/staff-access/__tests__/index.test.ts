import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type OrpcContext } from "#@/lib/context/types";
import * as accessGuards from "#@/routers/school/access-guards";
import { schoolStaffAccessRouter } from "#@/routers/school/staff-access/index";
import * as queries from "#@/routers/school/staff-access/queries";

vi.mock("#@/routers/school/access-guards", () => {
  return {
    getActiveOrganizationIdForSession: vi.fn(),
    getActiveSchoolRolesForUser: vi.fn(),
    isOrganizationMember: vi.fn(),
    staffPermissionsFromRoles: vi.fn()
  };
});

vi.mock("#@/routers/school/staff-access/queries", () => {
  return {
    createOrResendStaffInvitation: vi.fn(),
    getStaffMemberForAccess: vi.fn(),
    previewStaffInvitation: vi.fn(),
    revokeStaffAccess: vi.fn()
  };
});

const staffMemberId = "invitation-1";

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
  accessStatus: "pending" as const,
  createdAt: "2026-06-10T00:00:00.000Z",
  department: "Academics",
  email: "teacher@example.com",
  employeeCode: "T-001",
  fullName: null,
  id: staffMemberId,
  invitationId: "invitation-1",
  memberId: null,
  role: "teacher" as const,
  status: "active" as const,
  title: "Teacher",
  updatedAt: "2026-06-10T00:00:00.000Z",
  userId: null
};

const staffMemberAccess = {
  accessStatus: staffMember.accessStatus,
  email: staffMember.email,
  hasLinkedAccess: false,
  id: staffMemberId,
  invitationId: "invitation-1",
  memberId: null,
  role: "teacher" as const,
  userId: null
};

describe("school staff access router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accessGuards.getActiveOrganizationIdForSession).mockResolvedValue("org-1");
    vi.mocked(accessGuards.isOrganizationMember).mockResolvedValue(true);
    vi.mocked(accessGuards.getActiveSchoolRolesForUser).mockResolvedValue(["principal"]);
    vi.mocked(accessGuards.staffPermissionsFromRoles).mockReturnValue({
      canManagePrincipalRole: false,
      canManageStaff: true
    });
    vi.mocked(queries.getStaffMemberForAccess).mockResolvedValue(staffMemberAccess);
    vi.mocked(queries.createOrResendStaffInvitation).mockResolvedValue(staffMember);
    vi.mocked(queries.previewStaffInvitation).mockResolvedValue({
      email: "teacher@example.com",
      expiresAt: "2026-06-17T00:00:00.000Z",
      invitationId: "invitation-1",
      organizationName: "Central School",
      status: "pending"
    });
    vi.mocked(queries.revokeStaffAccess).mockResolvedValue({
      ...staffMember,
      accessStatus: "revoked",
      invitationId: null,
      memberId: "member-1",
      userId: "staff-user-1"
    });
  });

  it("is exposed under the school router", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-with-enough-length-123456";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NODE_ENV = "development";
    process.env.VITE_SERVER_URL = "http://localhost:5000/server";
    process.env.VITE_WEB_URL = "http://localhost:3000/web";

    const { appRouter } = await import("#@/routers/index");

    expect(appRouter.school.staffAccess.preview).toBeDefined();
    expect(appRouter.school.staffAccess.grant).toBeDefined();
    expect(appRouter.school.staffAccess.revoke).toBeDefined();
  });

  it("returns pending invitation preview school and email", async () => {
    await expect(
      call(
        schoolStaffAccessRouter.preview,
        {
          invitationId: "invitation-1"
        },
        { context: { ...context, session: null } }
      )
    ).resolves.toEqual({
      email: "teacher@example.com",
      expiresAt: "2026-06-17T00:00:00.000Z",
      invitationId: "invitation-1",
      organizationName: "Central School",
      status: "pending"
    });

    expect(queries.previewStaffInvitation).toHaveBeenCalledWith("invitation-1");
  });

  it("denies grant for non-manager members before creating invitations", async () => {
    vi.mocked(accessGuards.staffPermissionsFromRoles).mockReturnValue({
      canManagePrincipalRole: false,
      canManageStaff: false
    });

    await expect(
      call(schoolStaffAccessRouter.grant, { staffMemberId }, { context })
    ).rejects.toMatchObject({
      code: "SCHOOL_STAFF_MANAGEMENT_DENIED"
    });

    expect(queries.createOrResendStaffInvitation).not.toHaveBeenCalled();
  });

  it("creates or resends pending invitation for staff email", async () => {
    await expect(
      call(schoolStaffAccessRouter.grant, { staffMemberId }, { context })
    ).resolves.toEqual(staffMember);

    expect(queries.getStaffMemberForAccess).toHaveBeenCalledWith("org-1", staffMemberId);
    expect(queries.createOrResendStaffInvitation).toHaveBeenCalledWith({
      inviterId: "user-1",
      organizationId: "org-1",
      staffMemberId
    });
  });

  it("denies grant for owner targets before creating invitations", async () => {
    vi.mocked(queries.getStaffMemberForAccess).mockResolvedValue({
      ...staffMemberAccess,
      role: "owner" as const
    });

    await expect(
      call(schoolStaffAccessRouter.grant, { staffMemberId }, { context })
    ).rejects.toMatchObject({
      code: "SCHOOL_PRINCIPAL_MANAGEMENT_DENIED"
    });

    expect(queries.createOrResendStaffInvitation).not.toHaveBeenCalled();
  });

  it("denies revoke for non-manager members before revoking access", async () => {
    vi.mocked(accessGuards.staffPermissionsFromRoles).mockReturnValue({
      canManagePrincipalRole: false,
      canManageStaff: false
    });

    await expect(
      call(schoolStaffAccessRouter.revoke, { staffMemberId }, { context })
    ).rejects.toMatchObject({
      code: "SCHOOL_STAFF_MANAGEMENT_DENIED"
    });

    expect(queries.revokeStaffAccess).not.toHaveBeenCalled();
  });

  it("denies revoke for owner targets before deactivating roles", async () => {
    vi.mocked(queries.getStaffMemberForAccess).mockResolvedValue({
      ...staffMemberAccess,
      role: "owner" as const
    });

    await expect(
      call(schoolStaffAccessRouter.revoke, { staffMemberId }, { context })
    ).rejects.toMatchObject({
      code: "SCHOOL_PRINCIPAL_MANAGEMENT_DENIED"
    });

    expect(queries.revokeStaffAccess).not.toHaveBeenCalled();
  });

  it("revoke marks access inactive through query helper", async () => {
    await expect(
      call(schoolStaffAccessRouter.revoke, { staffMemberId }, { context })
    ).resolves.toMatchObject({
      accessStatus: "revoked",
      id: staffMemberId
    });

    expect(queries.revokeStaffAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      staffMemberId
    });
  });
});
