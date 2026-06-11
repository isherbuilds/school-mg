import {
  academicYearCreateInputSchema,
  academicYearSchema,
  academicYearUpdateInputSchema,
  gradeLevelCreateInputSchema,
  gradeLevelSchema,
  gradeLevelUpdateInputSchema,
  schoolSetupListInputSchema,
  schoolSetupListOutputSchema,
  sectionCreateInputSchema,
  sectionSchema,
  sectionUpdateInputSchema,
  subjectCreateInputSchema,
  subjectSchema,
  subjectUpdateInputSchema
} from "@tsu-stack/core/school";

import { type OrpcContext } from "#@/lib/context/types";
import { protectedProcedure } from "#@/lib/procedures/factory";

import {
  createAcademicYear,
  createGradeLevel,
  createSection,
  createSubject,
  isOrganizationMember,
  isSchoolSetupManager,
  listSchoolSetup,
  updateAcademicYear,
  updateGradeLevel,
  updateSection,
  updateSubject
} from "./queries";

const schoolSetupProcedure = protectedProcedure.errors({
  ACTIVE_ORGANIZATION_REQUIRED: {
    message: "Select an organization before managing school setup.",
    status: 400
  },
  DUPLICATE_SCHOOL_SETUP_RECORD: {
    message: "A school setup record with the same unique fields already exists.",
    status: 409
  },
  INVALID_SCHOOL_SETUP_DATES: {
    message: "School setup date range is invalid.",
    status: 400
  },
  INVALID_SCHOOL_SETUP_REFERENCE: {
    message: "School setup reference does not belong to the active organization.",
    status: 400
  },
  ORGANIZATION_ACCESS_DENIED: {
    message: "You do not have access to the active organization.",
    status: 403
  },
  SCHOOL_SETUP_MANAGEMENT_DENIED: {
    message: "Only owners and principals can manage school setup.",
    status: 403
  },
  SCHOOL_SETUP_RECORD_NOT_FOUND: {
    message: "School setup record not found.",
    status: 404
  }
});

type AuthenticatedContext = OrpcContext & {
  session: NonNullable<OrpcContext["session"]>;
};

type SchoolSetupErrors = Parameters<
  Parameters<typeof schoolSetupProcedure.handler>[0]
>[0]["errors"];

function getActiveOrganizationId(context: AuthenticatedContext): string | null {
  return context.session.session.activeOrganizationId ?? null;
}

async function requireActiveOrganization(context: AuthenticatedContext, errors: SchoolSetupErrors) {
  const organizationId = getActiveOrganizationId(context);

  if (!organizationId) {
    throw errors.ACTIVE_ORGANIZATION_REQUIRED();
  }

  const isMember = await isOrganizationMember(organizationId, context.session.user.id);

  if (!isMember) {
    throw errors.ORGANIZATION_ACCESS_DENIED();
  }

  return organizationId;
}

async function requireSchoolSetupManager(context: AuthenticatedContext, errors: SchoolSetupErrors) {
  const organizationId = await requireActiveOrganization(context, errors);
  const canManageSetup = await isSchoolSetupManager(organizationId, context.session.user.id);

  if (!canManageSetup) {
    throw errors.SCHOOL_SETUP_MANAGEMENT_DENIED();
  }

  return organizationId;
}

function hasDatabaseCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function mapDatabaseError<T>(action: () => Promise<T>, errors: SchoolSetupErrors) {
  try {
    return await action();
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      throw errors.DUPLICATE_SCHOOL_SETUP_RECORD();
    }

    if (hasDatabaseCode(error, "23503")) {
      throw errors.INVALID_SCHOOL_SETUP_REFERENCE();
    }

    if (hasDatabaseCode(error, "23514")) {
      throw errors.INVALID_SCHOOL_SETUP_DATES();
    }

    throw error;
  }
}

function requireRow<T>(row: T | null, errors: SchoolSetupErrors): T {
  if (!row) {
    throw errors.SCHOOL_SETUP_RECORD_NOT_FOUND();
  }

  return row;
}

export const schoolSetupRouter = {
  academicYears: {
    create: schoolSetupProcedure
      .route({
        description: "Create an academic year for the active organization",
        method: "POST"
      })
      .input(academicYearCreateInputSchema)
      .output(academicYearSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        return mapDatabaseError(() => createAcademicYear(organizationId, input), errors);
      }),
    update: schoolSetupProcedure
      .route({
        description: "Update an academic year for the active organization",
        method: "PATCH"
      })
      .input(academicYearUpdateInputSchema)
      .output(academicYearSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        const row = await mapDatabaseError(() => updateAcademicYear(organizationId, input), errors);
        return requireRow(row, errors);
      })
  },
  gradeLevels: {
    create: schoolSetupProcedure
      .route({
        description: "Create a grade level for the active organization",
        method: "POST"
      })
      .input(gradeLevelCreateInputSchema)
      .output(gradeLevelSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        return mapDatabaseError(() => createGradeLevel(organizationId, input), errors);
      }),
    update: schoolSetupProcedure
      .route({
        description: "Update a grade level for the active organization",
        method: "PATCH"
      })
      .input(gradeLevelUpdateInputSchema)
      .output(gradeLevelSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        const row = await mapDatabaseError(() => updateGradeLevel(organizationId, input), errors);
        return requireRow(row, errors);
      })
  },
  list: schoolSetupProcedure
    .route({
      description: "List school setup records for the active organization",
      method: "GET"
    })
    .input(schoolSetupListInputSchema)
    .output(schoolSetupListOutputSchema)
    .handler(async ({ context, errors, input }) => {
      const organizationId = await requireActiveOrganization(context, errors);
      const [setup, canManageSetup] = await Promise.all([
        listSchoolSetup(organizationId, input),
        isSchoolSetupManager(organizationId, context.session.user.id)
      ]);

      return { ...setup, canManageSetup };
    }),
  sections: {
    create: schoolSetupProcedure
      .route({
        description: "Create a section for the active organization",
        method: "POST"
      })
      .input(sectionCreateInputSchema)
      .output(sectionSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        return mapDatabaseError(() => createSection(organizationId, input), errors);
      }),
    update: schoolSetupProcedure
      .route({
        description: "Update a section for the active organization",
        method: "PATCH"
      })
      .input(sectionUpdateInputSchema)
      .output(sectionSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        const row = await mapDatabaseError(() => updateSection(organizationId, input), errors);
        return requireRow(row, errors);
      })
  },
  subjects: {
    create: schoolSetupProcedure
      .route({
        description: "Create a subject for the active organization",
        method: "POST"
      })
      .input(subjectCreateInputSchema)
      .output(subjectSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        return mapDatabaseError(() => createSubject(organizationId, input), errors);
      }),
    update: schoolSetupProcedure
      .route({
        description: "Update a subject for the active organization",
        method: "PATCH"
      })
      .input(subjectUpdateInputSchema)
      .output(subjectSchema)
      .handler(async ({ context, errors, input }) => {
        const organizationId = await requireSchoolSetupManager(context, errors);
        const row = await mapDatabaseError(() => updateSubject(organizationId, input), errors);
        return requireRow(row, errors);
      })
  }
};
