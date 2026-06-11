import { GraduationCap } from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { getRequiredNumber, getRequiredString } from "@/shared/lib/form-values";

import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import { useUpdateGradeLevelMutation } from "@/pages/school-setup/api/update-grade-level.mutation";
import { getSchoolSetupErrorMessage } from "@/pages/school-setup/lib/errors";
import { ListItem, RecordList, UpdateButton } from "@/pages/school-setup/ui/setup-list-primitives";

type GradeLevel = SchoolSetupQueryResult["gradeLevels"][number];

type GradeLevelListProps = {
  canManageSetup: boolean;
  gradeLevels: SchoolSetupQueryResult["gradeLevels"];
  isEditing: (id: string) => boolean;
  onCancel: () => void;
  onEdit: (id: string) => void;
};

export function GradeLevelList({
  canManageSetup,
  gradeLevels,
  isEditing,
  onCancel,
  onEdit
}: GradeLevelListProps) {
  const mutation = useUpdateGradeLevelMutation();

  const handleUpdate = async (id: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await mutation.mutateAsync({
        code: getRequiredString(formData, "code"),
        id,
        name: getRequiredString(formData, "name"),
        sortOrder: getRequiredNumber(formData, "sortOrder")
      });
      onCancel();
      toast.success(m.school_setup_page__grade_level_updated());
    } catch (error) {
      toast.error(getSchoolSetupErrorMessage(error));
    }
  };

  return (
    <RecordList
      count={gradeLevels.length}
      emptyDescription={m.school_setup_page__grade_levels_empty_description()}
      emptyTitle={m.school_setup_page__grade_levels_empty_title()}
      icon={GraduationCap}
      title={m.school_setup_page__grade_levels()}
    >
      {gradeLevels.map((gradeLevel) => (
        <ListItem
          isEditing={isEditing(gradeLevel.id)}
          key={gradeLevel.id}
          meta={`#${gradeLevel.sortOrder}`}
          onCancel={onCancel}
          onEdit={canManageSetup ? () => onEdit(gradeLevel.id) : undefined}
          renderEditForm={() => (
            <GradeLevelEditForm
              gradeLevel={gradeLevel}
              isPending={mutation.isPending}
              onSubmit={(event) => void handleUpdate(gradeLevel.id, event)}
            />
          )}
        >
          <span className="block truncate">
            {gradeLevel.name} ({gradeLevel.code})
          </span>
        </ListItem>
      ))}
    </RecordList>
  );
}

function GradeLevelEditForm({
  gradeLevel,
  isPending,
  onSubmit
}: {
  gradeLevel: GradeLevel;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`grade-level-${gradeLevel.id}-name`}>
            {m.school_setup_page__grade_level_name()}
          </FieldLabel>
          <Input
            defaultValue={gradeLevel.name}
            id={`grade-level-${gradeLevel.id}-name`}
            name="name"
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
          <Field>
            <FieldLabel htmlFor={`grade-level-${gradeLevel.id}-code`}>
              {m.school_setup_page__code()}
            </FieldLabel>
            <Input
              defaultValue={gradeLevel.code}
              id={`grade-level-${gradeLevel.id}-code`}
              name="code"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`grade-level-${gradeLevel.id}-sort-order`}>
              {m.school_setup_page__order()}
            </FieldLabel>
            <Input
              defaultValue={gradeLevel.sortOrder}
              id={`grade-level-${gradeLevel.id}-sort-order`}
              min="0"
              name="sortOrder"
              required
              step="1"
              type="number"
            />
          </Field>
        </div>
        <UpdateButton isPending={isPending} />
      </FieldGroup>
    </form>
  );
}
