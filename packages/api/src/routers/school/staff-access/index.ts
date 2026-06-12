import {
  staffAccessGrantInputSchema,
  staffAccessRevokeInputSchema,
  staffInvitationPreviewInputSchema,
  staffInvitationPreviewSchema,
  staffMemberSchema
} from "@tsu-stack/core/school";

import { type OrpcContext } from "#@/lib/context/types";
import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import {
  getActiveOrganizationIdForSession,
  getActiveSchoolRolesForUser,
  isOrganizationMember,
  staffPermissionsFromRoles
} from "#@/routers/school/access-guards";

import {
  createOrResendStaffInvitation,
  getStaffMemberForAccess,
  previewStaffInvitation,
  revokeStaffAccess,
  type StaffMemberForAccess
} from "./queries";

const staffAccessErrors = {
  ACTIVE_ORGANIZATION_REQUIRED: {
    message: "Select an organization before managing staff access.",
    status: 400
  },
  INVITATION_NOT_FOUND: {
    message: "Invitation not found.",
    status: 404
  },
  ORGANIZATION_ACCESS_DENIED: {
    message: "You do not have access to the active organization.",
    status: 403
  },
  SCHOOL_PRINCIPAL_MANAGEMENT_DENIED: {
    message: "Only owners can manage principal staff access.",
    status: 403
  },
  SCHOOL_STAFF_MANAGEMENT_DENIED: {
    message: "Only owners and principals can manage staff access.",
    status: 403
  },
  STAFF_ACCESS_ALREADY_LINKED: {
    message: "Staff access is already linked.",
    status: 409
  },
  STAFF_RECORD_NOT_FOUND: {
    message: "Staff record not found.",
    status: 404
  },
  STAFF_WITHOUT_EMAIL_NOT_ALLOWED: {
    message: "Staff access requires an email address.",
    status: 400
  }
};

const schoolStaffAccessProcedure = protectedProcedure.errors(staffAccessErrors);
const schoolStaffInvitationPreviewProcedure = publicProcedure.errors(staffAccessErrors);

type AuthenticatedContext = OrpcContext & {
  session: NonNullable<OrpcContext["session"]>;
};

type SchoolStaffAccessErrors = Parameters<
  Parameters<typeof schoolStaffAccessProcedure.handler>[0]
>[0]["errors"];

type StaffPermissions = ReturnType<typeof staffPermissionsFromRoles>;

async function requireActiveOrganization(
  context: AuthenticatedContext,
  errors: SchoolStaffAccessErrors
) {
  const organizationId = await getActiveOrganizationIdForSession(context.session.session.id);

  if (!organizationId) {
    throw errors.ACTIVE_ORGANIZATION_REQUIRED();
  }

  const isMember = await isOrganizationMember(organizationId, context.session.user.id);

  if (!isMember) {
    throw errors.ORGANIZATION_ACCESS_DENIED();
  }

  return organizationId;
}

async function requireStaffManager(
  context: AuthenticatedContext,
  errors: SchoolStaffAccessErrors
): Promise<{ organizationId: string; permissions: StaffPermissions }> {
  const organizationId = await requireActiveOrganization(context, errors);
  const roles = await getActiveSchoolRolesForUser(organizationId, context.session.user.id);

  if (roles.length === 0) {
    throw errors.ORGANIZATION_ACCESS_DENIED();
  }

  const permissions = staffPermissionsFromRoles(roles);

  if (!permissions.canManageStaff) {
    throw errors.SCHOOL_STAFF_MANAGEMENT_DENIED();
  }

  return {
    organizationId,
    permissions
  };
}

async function requireStaffMemberForAccess(
  organizationId: string,
  staffMemberId: string,
  errors: SchoolStaffAccessErrors
): Promise<StaffMemberForAccess> {
  const staffMember = await getStaffMemberForAccess(organizationId, staffMemberId);

  if (!staffMember) {
    throw errors.STAFF_RECORD_NOT_FOUND();
  }

  return staffMember;
}

function assertCanManageTargetStaff(
  permissions: StaffPermissions,
  staffMember: StaffMemberForAccess,
  errors: SchoolStaffAccessErrors
) {
  if (staffMember.role === "owner") {
    throw errors.SCHOOL_PRINCIPAL_MANAGEMENT_DENIED();
  }

  if (staffMember.role === "principal" && !permissions.canManagePrincipalRole) {
    throw errors.SCHOOL_PRINCIPAL_MANAGEMENT_DENIED();
  }
}

export const schoolStaffAccessRouter = {
  grant: schoolStaffAccessProcedure
    .route({
      description: "Create or resend staff access invitation for the active organization",
      method: "POST"
    })
    .input(staffAccessGrantInputSchema)
    .output(staffMemberSchema)
    .handler(async ({ context, errors, input }) => {
      const { organizationId, permissions } = await requireStaffManager(context, errors);
      const staffMember = await requireStaffMemberForAccess(
        organizationId,
        input.staffMemberId,
        errors
      );

      assertCanManageTargetStaff(permissions, staffMember, errors);

      if (!staffMember.email) {
        throw errors.STAFF_WITHOUT_EMAIL_NOT_ALLOWED();
      }

      if (staffMember.hasLinkedAccess) {
        throw errors.STAFF_ACCESS_ALREADY_LINKED();
      }

      return createOrResendStaffInvitation({
        inviterId: context.session.user.id,
        organizationId,
        staffMemberId: input.staffMemberId
      });
    }),
  preview: schoolStaffInvitationPreviewProcedure
    .route({
      description: "Preview a staff access invitation",
      method: "GET",
      spec: (spec) => {
        return {
          ...spec,
          security: []
        };
      }
    })
    .input(staffInvitationPreviewInputSchema)
    .output(staffInvitationPreviewSchema)
    .handler(async ({ errors, input }) => {
      const preview = await previewStaffInvitation(input.invitationId);

      if (!preview) {
        throw errors.INVITATION_NOT_FOUND();
      }

      return preview;
    }),
  revoke: schoolStaffAccessProcedure
    .route({
      description: "Revoke staff access for the active organization",
      method: "POST"
    })
    .input(staffAccessRevokeInputSchema)
    .output(staffMemberSchema)
    .handler(async ({ context, errors, input }) => {
      const { organizationId, permissions } = await requireStaffManager(context, errors);
      const staffMember = await requireStaffMemberForAccess(
        organizationId,
        input.staffMemberId,
        errors
      );

      assertCanManageTargetStaff(permissions, staffMember, errors);

      return revokeStaffAccess({
        organizationId,
        staffMemberId: input.staffMemberId
      });
    })
};
