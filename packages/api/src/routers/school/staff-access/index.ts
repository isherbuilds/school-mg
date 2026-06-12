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
  getStaffProfileForAccess,
  previewStaffInvitation,
  revokeStaffAccess,
  type StaffProfileForAccess
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

async function requireStaffProfileForAccess(
  organizationId: string,
  staffProfileId: string,
  errors: SchoolStaffAccessErrors
): Promise<StaffProfileForAccess> {
  const staffProfile = await getStaffProfileForAccess(organizationId, staffProfileId);

  if (!staffProfile) {
    throw errors.STAFF_RECORD_NOT_FOUND();
  }

  return staffProfile;
}

function assertCanManageTargetStaff(
  permissions: StaffPermissions,
  staffProfile: StaffProfileForAccess,
  errors: SchoolStaffAccessErrors
) {
  if (staffProfile.roles.includes("owner")) {
    throw errors.SCHOOL_PRINCIPAL_MANAGEMENT_DENIED();
  }

  if (staffProfile.roles.includes("principal") && !permissions.canManagePrincipalRole) {
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
      const staffProfile = await requireStaffProfileForAccess(
        organizationId,
        input.staffProfileId,
        errors
      );

      assertCanManageTargetStaff(permissions, staffProfile, errors);

      if (!staffProfile.email) {
        throw errors.STAFF_WITHOUT_EMAIL_NOT_ALLOWED();
      }

      if (staffProfile.hasLinkedAccess) {
        throw errors.STAFF_ACCESS_ALREADY_LINKED();
      }

      return createOrResendStaffInvitation({
        inviterId: context.session.user.id,
        organizationId,
        staffProfileId: input.staffProfileId
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
      const staffProfile = await requireStaffProfileForAccess(
        organizationId,
        input.staffProfileId,
        errors
      );

      assertCanManageTargetStaff(permissions, staffProfile, errors);

      return revokeStaffAccess({
        organizationId,
        staffProfileId: input.staffProfileId
      });
    })
};
