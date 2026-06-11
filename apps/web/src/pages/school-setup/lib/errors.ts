import { type ORPCError, isDefinedError } from "@orpc/client";

import { m } from "@tsu-stack/i18n/messages";

type ClientErrorCandidate = Error | ORPCError<string, unknown>;

function getDefinedError(error: unknown): ORPCError<string, unknown> | null {
  const candidate = error as ClientErrorCandidate;
  return isDefinedError(candidate) ? candidate : null;
}

export function hasSchoolSetupErrorCode(error: unknown, code: string): boolean {
  return getDefinedError(error)?.code === code;
}

export function getSchoolSetupErrorMessage(error: unknown) {
  const definedError = getDefinedError(error);

  if (definedError) {
    return definedError.message ?? m.school_setup_page__save_failed();
  }

  return error instanceof Error ? error.message : m.school_setup_page__save_failed();
}
