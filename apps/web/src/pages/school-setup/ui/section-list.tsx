import { UsersRound } from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { getNullableNumber, getRequiredString } from "@/shared/lib/form-values";

import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import { useUpdateSectionMutation } from "@/pages/school-setup/api/update-section.mutation";
import { getSchoolSetupErrorMessage } from "@/pages/school-setup/lib/errors";
import { NativeSelect } from "@/pages/school-setup/ui/native-select";
import { ListItem, RecordList, UpdateButton } from "@/pages/school-setup/ui/setup-list-primitives";

type Section = SchoolSetupQueryResult["sections"][number];

type SectionListProps = {
  academicYears: SchoolSetupQueryResult["academicYears"];
  canManageSetup: boolean;
  gradeLevels: SchoolSetupQueryResult["gradeLevels"];
  isEditing: (id: string) => boolean;
  onCancel: () => void;
  onEdit: (id: string) => void;
  sections: SchoolSetupQueryResult["sections"];
};

export function SectionList({
  academicYears,
  canManageSetup,
  gradeLevels,
  isEditing,
  onCancel,
  onEdit,
  sections
}: SectionListProps) {
  const mutation = useUpdateSectionMutation();

  const handleUpdate = async (id: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await mutation.mutateAsync({
        academicYearId: getRequiredString(formData, "academicYearId"),
        capacity: getNullableNumber(formData, "capacity"),
        code: getRequiredString(formData, "code"),
        gradeLevelId: getRequiredString(formData, "gradeLevelId"),
        id,
        name: getRequiredString(formData, "name")
      });
      onCancel();
      toast.success(m.school_setup_page__section_updated());
    } catch (error) {
      toast.error(getSchoolSetupErrorMessage(error));
    }
  };

  return (
    <RecordList
      count={sections.length}
      emptyDescription={m.school_setup_page__sections_empty_description()}
      emptyTitle={m.school_setup_page__sections_empty_title()}
      icon={UsersRound}
      title={m.school_setup_page__sections()}
    >
      {sections.map((section) => (
        <ListItem
          isEditing={isEditing(section.id)}
          key={section.id}
          meta={
            section.capacity !== null ? String(section.capacity) : section.shift.replace("_", " ")
          }
          onCancel={onCancel}
          onEdit={canManageSetup ? () => onEdit(section.id) : undefined}
          renderEditForm={() => (
            <SectionEditForm
              academicYears={academicYears}
              gradeLevels={gradeLevels}
              isPending={mutation.isPending}
              onSubmit={(event) => void handleUpdate(section.id, event)}
              section={section}
            />
          )}
        >
          <span className="block truncate">
            {section.name} ({section.code})
          </span>
        </ListItem>
      ))}
    </RecordList>
  );
}

function SectionEditForm({
  academicYears,
  gradeLevels,
  isPending,
  onSubmit,
  section
}: {
  academicYears: SchoolSetupQueryResult["academicYears"];
  gradeLevels: SchoolSetupQueryResult["gradeLevels"];
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  section: Section;
}) {
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`section-${section.id}-academic-year`}>
              {m.school_setup_page__academic_year()}
            </FieldLabel>
            <NativeSelect
              defaultValue={section.academicYearId}
              id={`section-${section.id}-academic-year`}
              name="academicYearId"
              required
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`section-${section.id}-grade-level`}>
              {m.school_setup_page__grade_level()}
            </FieldLabel>
            <NativeSelect
              defaultValue={section.gradeLevelId}
              id={`section-${section.id}-grade-level`}
              name="gradeLevelId"
              required
            >
              {gradeLevels.map((gradeLevel) => (
                <option key={gradeLevel.id} value={gradeLevel.id}>
                  {gradeLevel.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px_96px]">
          <Field>
            <FieldLabel htmlFor={`section-${section.id}-name`}>
              {m.school_setup_page__section_name()}
            </FieldLabel>
            <Input
              defaultValue={section.name}
              id={`section-${section.id}-name`}
              name="name"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`section-${section.id}-code`}>
              {m.school_setup_page__code()}
            </FieldLabel>
            <Input
              defaultValue={section.code}
              id={`section-${section.id}-code`}
              name="code"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`section-${section.id}-capacity`}>
              {m.school_setup_page__capacity()}
            </FieldLabel>
            <Input
              defaultValue={section.capacity ?? ""}
              id={`section-${section.id}-capacity`}
              min="0"
              name="capacity"
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
