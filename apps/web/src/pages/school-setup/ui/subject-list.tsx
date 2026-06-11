import { BookOpen } from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { getNullableString, getRequiredString } from "@/shared/lib/form-values";

import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import { useUpdateSubjectMutation } from "@/pages/school-setup/api/update-subject.mutation";
import { getSchoolSetupErrorMessage } from "@/pages/school-setup/lib/errors";
import { ListItem, RecordList, UpdateButton } from "@/pages/school-setup/ui/setup-list-primitives";

type Subject = SchoolSetupQueryResult["subjects"][number];

type SubjectListProps = {
  canManageSetup: boolean;
  isEditing: (id: string) => boolean;
  onCancel: () => void;
  onEdit: (id: string) => void;
  subjects: SchoolSetupQueryResult["subjects"];
};

export function SubjectList({
  canManageSetup,
  isEditing,
  onCancel,
  onEdit,
  subjects
}: SubjectListProps) {
  const mutation = useUpdateSubjectMutation();

  const handleUpdate = async (id: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await mutation.mutateAsync({
        code: getRequiredString(formData, "code"),
        id,
        name: getRequiredString(formData, "name"),
        shortName: getNullableString(formData, "shortName")
      });
      onCancel();
      toast.success(m.school_setup_page__subject_updated());
    } catch (error) {
      toast.error(getSchoolSetupErrorMessage(error));
    }
  };

  return (
    <RecordList
      count={subjects.length}
      emptyDescription={m.school_setup_page__subjects_empty_description()}
      emptyTitle={m.school_setup_page__subjects_empty_title()}
      icon={BookOpen}
      title={m.school_setup_page__subjects()}
    >
      {subjects.map((subject) => (
        <ListItem
          isEditing={isEditing(subject.id)}
          key={subject.id}
          meta={subject.isCore ? m.school_setup_page__core() : ""}
          onCancel={onCancel}
          onEdit={canManageSetup ? () => onEdit(subject.id) : undefined}
          renderEditForm={() => (
            <SubjectEditForm
              isPending={mutation.isPending}
              onSubmit={(event) => void handleUpdate(subject.id, event)}
              subject={subject}
            />
          )}
        >
          <span className="block truncate">
            {subject.name} ({subject.code})
          </span>
        </ListItem>
      ))}
    </RecordList>
  );
}

function SubjectEditForm({
  isPending,
  onSubmit,
  subject
}: {
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  subject: Subject;
}) {
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`subject-${subject.id}-name`}>
            {m.school_setup_page__subject_name()}
          </FieldLabel>
          <Input
            defaultValue={subject.name}
            id={`subject-${subject.id}-name`}
            name="name"
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field>
            <FieldLabel htmlFor={`subject-${subject.id}-code`}>
              {m.school_setup_page__code()}
            </FieldLabel>
            <Input
              defaultValue={subject.code}
              id={`subject-${subject.id}-code`}
              name="code"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`subject-${subject.id}-short-name`}>
              {m.school_setup_page__short_name()}
            </FieldLabel>
            <Input
              defaultValue={subject.shortName ?? ""}
              id={`subject-${subject.id}-short-name`}
              name="shortName"
            />
          </Field>
        </div>
        <UpdateButton isPending={isPending} />
      </FieldGroup>
    </form>
  );
}
