import { join } from "node:path/posix";

import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import "@tanstack/react-start/server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { openAPI, organization } from "better-auth/plugins";

import { and, eq } from "@tsu-stack/db";
import { db } from "@tsu-stack/db";
import * as schema from "@tsu-stack/db/schema";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { invitationEmail, verificationEmail } from "./email";
import { canBootstrapRootUser, canSignUpWithInvitation } from "./invitation-signup-gate";
import { invitationIdHeader, signupIntentHeader } from "./signup-headers";

const signupForbiddenMessage = "Account creation requires a valid school invitation.";

function getHeader(headers: Headers | undefined, name: string): string | null {
  return headers?.get(name) ?? null;
}

export const auth = betterAuth({
  baseURL: new URL(ENV_SERVER.VITE_SERVER_URL).origin,
  basePath: join(new URL(ENV_SERVER.VITE_SERVER_URL).pathname, "auth"),
  trustedOrigins: [new URL(ENV_SERVER.VITE_WEB_URL).origin],
  secret: ENV_SERVER.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),

  // https://www.better-auth.com/docs/concepts/session-management#session-caching
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  },

  // https://www.better-auth.com/docs/authentication/email-password
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ url, user }) => {
      await verificationEmail({
        to: user.email,
        url
      });
    }
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }

      const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
      const intent = getHeader(ctx.headers, signupIntentHeader);
      const invitationId = getHeader(ctx.headers, invitationIdHeader);

      if (!intent && !invitationId && (await canBootstrapRootUser(email))) {
        return;
      }

      if (
        intent === "staff-invitation" &&
        invitationId &&
        (await canSignUpWithInvitation({ email, invitationId }))
      ) {
        return;
      }

      throw new APIError("FORBIDDEN", {
        message: signupForbiddenMessage
      });
    })
  },

  experimental: {
    // https://www.better-auth.com/docs/adapters/drizzle#joins-experimental
    joins: true
  },

  plugins: [
    organization({
      organizationHooks: {
        afterAcceptInvitation: async (data) => {
          await db
            .update(schema.schoolActors)
            .set({
              status: "active",
              updatedAt: new Date(),
              userId: data.user.id
            })
            .where(
              and(
                eq(schema.schoolActors.organizationId, data.organization.id),
                eq(schema.schoolActors.email, data.invitation.email)
              )
            );
        }
      },
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async (data) => {
        await invitationEmail({
          organizationName: data.organization.name,
          to: data.email,
          url: `${ENV_SERVER.VITE_WEB_URL}/accept-invitation/${data.id}`
        });
      }
    }),
    openAPI({
      theme: "deepSpace"
    })
  ],

  telemetry: {
    enabled: false
  }
});

export type AuthSession = typeof auth.$Infer.Session;
