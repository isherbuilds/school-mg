import { m } from "@tsu-stack/i18n/messages";

import { getDefinedError } from "@/shared/lib/orpc-errors";

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
