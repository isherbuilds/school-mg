import "@tanstack/react-start/server-only";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

type TransactionalEmailInput = {
  html?: string;
  subject: string;
  text?: string;
  to: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function assertEmailConfig() {
  const apiKey = ENV_SERVER.RESEND_API_KEY;
  const from = ENV_SERVER.EMAIL_FROM;

  if (apiKey && from) {
    return { apiKey, from };
  }

  if (ENV_SERVER.NODE_ENV === "production") {
    throw new Error("Missing RESEND_API_KEY or EMAIL_FROM for auth email.");
  }

  console.debug("[auth-email:dev]", {
    reason: "missing_resend_config"
  });

  return null;
}

export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<void> {
  const config = assertEmailConfig();

  if (!config) {
    console.debug("[auth-email:dev]", {
      subject: input.subject,
      to: input.to
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: config.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to
    }),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Failed to send auth email: ${response.status}`);
  }
}

export async function invitationEmail(input: {
  organizationName: string;
  to: string;
  url: string;
}): Promise<void> {
  const organizationName = escapeHtml(input.organizationName);
  const url = escapeHtml(input.url);

  await sendTransactionalEmail({
    html: `<p>You have been invited to join ${organizationName}.</p><p><a href="${url}">Accept invitation</a></p>`,
    subject: `Invitation to join ${input.organizationName}`,
    text: `You have been invited to join ${input.organizationName}. Accept invitation: ${input.url}`,
    to: input.to
  });
}

export async function verificationEmail(input: { to: string; url: string }): Promise<void> {
  const url = escapeHtml(input.url);

  await sendTransactionalEmail({
    html: `<p>Verify your email address.</p><p><a href="${url}">Verify email</a></p>`,
    subject: "Verify your email address",
    text: `Verify your email address: ${input.url}`,
    to: input.to
  });
}
