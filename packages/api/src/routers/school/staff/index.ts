import {
  staffListInputSchema,
  staffListOutputSchema,
  staffMemberCreateInputSchema,
  staffMemberSchema,
  staffMemberUpdateInputSchema
} from "@tsu-stack/core/school";

import { type OrpcContext } from "#@/lib/context/types";
import { protectedProcedure } from "#@/lib/procedures/factory";
import {
  canManageRequestedStaffRoles,
  getActiveOrganizationIdForSession,
  getActiveSchoolRolesForUser,
  isOrganizationMember,
  staffPermissionsFromRoles
} from "#@/routers/school/access-guards";

import {
  createStaffMember,
  getStaffMemberActiveRoles,
  listStaffMembers,
  updateStaffMember
} from "./queries";

const schoolStaffProcedure = protectedProcedure.errors({
  ACTIVE_ORGANIZATION_REQUIRED: {
    message: "Select an organization before managing staff.",
    status: 400
  },
  DUPLICATE_STAFF_RECORD: {
    message: "A staff record with the same unique fields already exists.",
    status: 409
  },
  INVALID_STAFF_DATES: {
    message: "Staff date range is invalid.",
    status: 400
  },
  ORGANIZATION_ACCESS_DENIED: {
    message: "You do not have access to the active organization.",
    status: 403
  },
  SCHOOL_PRINCIPAL_MANAGEMENT_DENIED: {
    message: "Only owners can manage the principal role.",
    status: 403
  },
  SCHOOL_STAFF_MANAGEMENT_DENIED: {
    message: "Only owners and principals can manage staff.",
    status: 403
  },
  STAFF_RECORD_NOT_FOUND: {
    message: "Staff record not found.",
    status: 404
  }
});

type AuthenticatedContext = OrpcContext & {
  session: NonNullable<OrpcContext["session"]>;
};

type SchoolStaffErrors = Parameters<
  Parameters<typeof schoolStaffProcedure.handler>[0]
>[0]["errors"];

type StaffPermissions = ReturnType<typeof staffPermissionsFromRoles>;

async function requireActiveOrganization(context: AuthenticatedContext, errors: SchoolStaffErrors) {
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

async function getStaffAccess(context: AuthenticatedContext, errors: SchoolStaffErrors) {
  const organizationId = await requireActiveOrganization(context, errors);
  const roles = await getActiveSchoolRolesForUser(organizationId, context.session.user.id);

  if (roles.length === 0) {
    throw errors.ORGANIZATION_ACCESS_DENIED();
  }

  return {
    organizationId,
    permissions: staffPermissionsFromRoles(roles)
  };
}

async function requireStaffManager(
  context: AuthenticatedContext,
  errors: SchoolStaffErrors
): Promise<{ organizationId: string; permissions: StaffPermissions }> {
  const access = await getStaffAccess(context, errors);

  if (!access.permissions.canManageStaff) {
    throw errors.SCHOOL_STAFF_MANAGEMENT_DENIED();
  }

  return access;
}

function assertCanManageRequestedRoles(
  permissions: StaffPermissions,
  requestedRoles: Parameters<typeof canManageRequestedStaffRoles>[0]["requestedRoles"],
  errors: SchoolStaffErrors
) {
  if (
    !canManageRequestedStaffRoles({
      canManagePrincipalRole: permissions.canManagePrincipalRole,
      requestedRoles
    })
  ) {
    throw errors.SCHOOL_PRINCIPAL_MANAGEMENT_DENIED();
  }
}

function assertCanManagePrincipalStaffUpdate(
  permissions: StaffPermissions,
  currentRoles: Awaited<ReturnType<typeof getStaffMemberActiveRoles>>,
  requestedRoles: Parameters<typeof canManageRequestedStaffRoles>[0]["requestedRoles"],
  errors: SchoolStaffErrors
) {
  const principalRoleInvolved =
    currentRoles?.includes("principal") === true || requestedRoles?.includes("principal") === true;

  if (principalRoleInvolved && !permissions.canManagePrincipalRole) {
    throw errors.SCHOOL_PRINCIPAL_MANAGEMENT_DENIED();
  }
}

function hasDatabaseCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("code" in error && error.code === code) {
    return true;
  }

  return "cause" in error && hasDatabaseCode(error.cause, code);
}

async function mapStaffWriteError<T>(action: () => Promise<T>, errors: SchoolStaffErrors) {
  try {
    return await action();
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      throw errors.DUPLICATE_STAFF_RECORD();
    }

    if (hasDatabaseCode(error, "23514")) {
      throw errors.INVALID_STAFF_DATES();
    }

    throw error;
  }
}

function requireRow<T>(row: T | null, errors: SchoolStaffErrors): T {
  if (!row) {
    throw errors.STAFF_RECORD_NOT_FOUND();
  }

  return row;
}

export const schoolStaffRouter = {
  create: schoolStaffProcedure
    .route({
      description: "Create a staff member for the active organization",
      method: "POST"
    })
    .input(staffMemberCreateInputSchema)
    .output(staffMemberSchema)
    .handler(async ({ context, errors, input }) => {
      const { organizationId, permissions } = await requireStaffManager(context, errors);
      assertCanManageRequestedRoles(permissions, input.roles, errors);
      return mapStaffWriteError(() => createStaffMember(organizationId, input), errors);
    }),
  list: schoolStaffProcedure
    .route({
      description: "List staff members for the active organization",
      method: "GET"
    })
    .input(staffListInputSchema)
    .output(staffListOutputSchema)
    .handler(async ({ context, errors, input }) => {
      const { organizationId, permissions } = await getStaffAccess(context, errors);
      const staff = await listStaffMembers(organizationId, input);

      return {
        ...permissions,
        staff
      };
    }),
  update: schoolStaffProcedure
    .route({
      description: "Update a staff member for the active organization",
      method: "PATCH"
    })
    .input(staffMemberUpdateInputSchema)
    .output(staffMemberSchema)
    .handler(async ({ context, errors, input }) => {
      const { organizationId, permissions } = await requireStaffManager(context, errors);
      const currentRoles = await getStaffMemberActiveRoles(organizationId, input.id);
      assertCanManagePrincipalStaffUpdate(permissions, currentRoles, input.roles, errors);
      const row = await mapStaffWriteError(() => updateStaffMember(organizationId, input), errors);
      return requireRow(row, errors);
    })
};
