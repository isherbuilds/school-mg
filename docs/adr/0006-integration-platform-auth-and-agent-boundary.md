# ADR 0006: Integration Platform Auth And Agent Boundary

Status: accepted

Date: 2026-06-11

## Context

School App will eventually integrate with Edernal Books, a future Transport App, WhatsApp-style channels, MCP clients, external APIs, and AI agents.

These integrations need different credential shapes:

- human app sessions for staff using the Staff App
- API keys or bearer tokens for server-to-server integrations
- OAuth for MCP clients and third-party agent surfaces that support delegated user authorization
- platform identity links for WhatsApp, Telegram, Slack, or similar channel users

Midday is a useful reference for this split. Its public SDK exposes an installable MCP server and supports OAuth2 and HTTP bearer token authentication. Its hosted MCP setup uses OAuth for ChatGPT/Gemini-style connectors. Its in-app chat uses AI SDK chat transport with a bearer token from the current session. Its database model keeps OAuth tokens, platform identities, and platform link tokens as separate concepts.

## Decision

External APIs, MCP, chat agents, and platform messaging will be treated as an Integration Platform phase, not as one-off feature-specific auth logic.

The Integration Platform will use these lanes:

1. Staff App sessions for human browser workflows.
2. External API credentials for server-to-server use, using scoped API keys or bearer tokens.
3. OAuth authorization for hosted MCP and third-party connectors that can ask a staff user to approve access to a selected school.
4. Platform identity and link-token records for WhatsApp, Telegram, Slack, or similar channel accounts.
5. Agent tool calls that execute through typed internal procedures, scoped to a school, user, role, and granted integration scope.

Generated SDKs and public API documentation are allowed when the external API surface stabilizes. They should wrap public API contracts rather than expose database tables or internal oRPC procedures directly.

MCP tools should expose narrow school operations and read models. They must not bypass role checks, school scoping, audit logs, or human review rules.

Agents may help staff with summaries, drafts, lookup, reconciliation, and workflow preparation. Agents must not silently perform high-impact actions such as posting accounting documents, deleting records, changing fees, sending bulk messages, or marking attendance without explicit product-level approval flows.

## Consequences

- MVP remains focused on school bootstrap and academic operations.
- API keys and bearer tokens are first-class future concepts, but not required for MVP.
- OAuth is the preferred future path for hosted MCP connectors because it supports delegated user approval and selected-school scoping.
- WhatsApp and other messaging channels get explicit identity linking instead of relying only on phone numbers or chat IDs.
- Edernal Books and future Transport App integrations can share the same integration concepts: scopes, external references, idempotency keys, webhook delivery records, and audit logs.
- Public external APIs must be versioned and documented before they are used as stable product contracts.

## Rejected

- Add separate token models inside each feature.
- Let MCP tools call internal procedures without integration scopes and audit records.
- Treat WhatsApp phone numbers as trusted user identity without an explicit link flow.
- Expose database tables directly as external APIs.
