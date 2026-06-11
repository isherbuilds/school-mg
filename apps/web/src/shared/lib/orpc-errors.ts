import { type ORPCError, isDefinedError } from "@orpc/client";

type ClientErrorCandidate = Error | ORPCError<string, unknown>;

export function getDefinedError(error: unknown): ORPCError<string, unknown> | null {
  const candidate = error as ClientErrorCandidate;
  return isDefinedError(candidate) ? candidate : null;
}
