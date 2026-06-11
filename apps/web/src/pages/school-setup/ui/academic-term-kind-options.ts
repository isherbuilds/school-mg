import { type TermKind, termKinds } from "@tsu-stack/core/school";
import { type m } from "@tsu-stack/i18n/messages";

type MessageAccessor = typeof m;

export function getAcademicTermKindOptions(messages: MessageAccessor) {
  const labels = {
    custom: messages.school_setup_page__term_kind_custom(),
    quarter: messages.school_setup_page__term_kind_quarter(),
    semester: messages.school_setup_page__term_kind_semester(),
    trimester: messages.school_setup_page__term_kind_trimester()
  } satisfies Record<TermKind, string>;

  return termKinds.map((kind) => {
    return {
      kind,
      label: labels[kind]
    };
  });
}
