import { m } from "@tsu-stack/i18n/messages";

import { getDefinedError } from "@/shared/lib/orpc-errors";

export function getSchoolBootstrapErrorMessage(error: unknown) {
  const definedError = getDefinedError(error);

  if (definedError?.code === "DUPLICATE_SCHOOL_SLUG") {
    return m.school_bootstrap_page__duplicate_slug();
  }

  if (definedError) {
    return definedError.message ?? m.school_setup_page__save_failed();
  }

  return error instanceof Error ? error.message : m.school_setup_page__save_failed();
}
