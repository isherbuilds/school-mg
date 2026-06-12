import { z } from "zod";

import {
  schoolBootstrapCreateInputSchema,
  schoolBootstrapCreateOutputSchema,
  schoolBootstrapListOutputSchema,
  schoolSelectInputSchema
} from "@tsu-stack/core/school";

import { type OrpcContext } from "#@/lib/context/types";
import { protectedProcedure } from "#@/lib/procedures/factory";

import {
  canCreateSchoolForUser,
  createSchoolForUser,
  getActiveSchoolIdForSession,
  listSchoolsForUser,
  selectSchoolForUser
} from "./queries";

const schoolBootstrapProcedure = protectedProcedure.errors({
  DUPLICATE_SCHOOL_SLUG: {
    message: "A school with this URL slug already exists.",
    status: 409
  },
  SCHOOL_ACCESS_DENIED: {
    message: "You do not have access to this school.",
    status: 403
  },
  SCHOOL_CREATION_DENIED: {
    message: "Only root bootstrap users can create schools.",
    status: 403
  }
});

type AuthenticatedContext = OrpcContext & {
  session: NonNullable<OrpcContext["session"]>;
};

type SchoolBootstrapErrors = Parameters<
  Parameters<typeof schoolBootstrapProcedure.handler>[0]
>[0]["errors"];

function hasDatabaseCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("code" in error && error.code === code) {
    return true;
  }

  return "cause" in error && hasDatabaseCode(error.cause, code);
}

async function mapBootstrapError<T>(action: () => Promise<T>, errors: SchoolBootstrapErrors) {
  try {
    return await action();
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      throw errors.DUPLICATE_SCHOOL_SLUG();
    }

    throw error;
  }
}

export const schoolBootstrapRouter = {
  create: schoolBootstrapProcedure
    .route({
      description: "Create a school and make the signed-in user its School Admin",
      method: "POST"
    })
    .input(schoolBootstrapCreateInputSchema)
    .output(schoolBootstrapCreateOutputSchema)
    .handler(async ({ context, errors, input }) => {
      const authenticatedContext = context as AuthenticatedContext;
      const canCreateSchool = await canCreateSchoolForUser(authenticatedContext.session.user.email);

      if (!canCreateSchool) {
        throw errors.SCHOOL_CREATION_DENIED();
      }

      return mapBootstrapError(
        () =>
          createSchoolForUser({
            email: authenticatedContext.session.user.email,
            name: input.name,
            sessionId: authenticatedContext.session.session.id,
            slug: input.slug,
            userId: authenticatedContext.session.user.id,
            userName: authenticatedContext.session.user.name
          }),
        errors
      );
    }),
  list: schoolBootstrapProcedure
    .route({
      description: "List schools available to the signed-in user",
      method: "GET"
    })
    .input(z.object({}))
    .output(schoolBootstrapListOutputSchema)
    .handler(async ({ context }) => {
      const authenticatedContext = context as AuthenticatedContext;
      const activeOrganizationId = await getActiveSchoolIdForSession(
        authenticatedContext.session.session.id
      );

      return listSchoolsForUser({
        activeOrganizationId,
        userId: authenticatedContext.session.user.id
      });
    }),
  select: schoolBootstrapProcedure
    .route({
      description: "Select the active school for the signed-in user",
      method: "POST"
    })
    .input(schoolSelectInputSchema)
    .output(schoolBootstrapCreateOutputSchema)
    .handler(async ({ context, errors, input }) => {
      const authenticatedContext = context as AuthenticatedContext;
      const activeSchool = await selectSchoolForUser({
        organizationId: input.id,
        sessionId: authenticatedContext.session.session.id,
        userId: authenticatedContext.session.user.id
      });

      if (!activeSchool) {
        throw errors.SCHOOL_ACCESS_DENIED();
      }

      return { activeSchool };
    })
};
