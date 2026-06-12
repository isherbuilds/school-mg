import { m } from "@tsu-stack/i18n/messages";

import { getDefinedError } from "@/shared/lib/orpc-errors";

export function getStaffErrorMessage(error: unknown): string {
  const definedError = getDefinedError(error);

  if (definedError) {
    switch (definedError.code) {
      case "DUPLICATE_STAFF_RECORD":
        return m.staff_page__duplicate_staff_record();
      case "SCHOOL_PRINCIPAL_MANAGEMENT_DENIED":
        return m.staff_page__principal_management_denied();
      case "SCHOOL_STAFF_MANAGEMENT_DENIED":
        return m.staff_page__staff_management_denied();
      case "STAFF_WITHOUT_EMAIL_NOT_ALLOWED":
        return m.staff_page__email_required();
      case "STAFF_ACCESS_ALREADY_LINKED":
        return m.staff_page__access_already_linked();
      default:
        return definedError.message ?? m.staff_page__save_failed();
    }
  }

  return error instanceof Error ? error.message : m.staff_page__save_failed();
}
