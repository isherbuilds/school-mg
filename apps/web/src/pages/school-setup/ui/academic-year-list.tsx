import { CalendarDays } from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import { useUpdateAcademicYearMutation } from "@/pages/school-setup/api/update-academic-year.mutation";
import { getErrorMessage, getRequiredString } from "@/pages/school-setup/lib/form-values";
import { ListItem, RecordList, UpdateButton } from "@/pages/school-setup/ui/setup-list-primitives";

type AcademicYear = SchoolSetupQueryResult["academicYears"][number];

type AcademicYearListProps = {
  academicYears: SchoolSetupQueryResult["academicYears"];
  canManageSetup: boolean;
  isEditing: (id: string) => boolean;
  onCancel: () => void;
  onEdit: (id: string) => void;
};

export function AcademicYearList({
  academicYears,
  canManageSetup,
  isEditing,
  onCancel,
  onEdit
}: AcademicYearListProps) {
  const mutation = useUpdateAcademicYearMutation();

  const handleUpdate = async (id: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await mutation.mutateAsync({
        endDate: getRequiredString(formData, "endDate"),
        id,
        name: getRequiredString(formData, "name"),
        startDate: getRequiredString(formData, "startDate")
      });
      onCancel();
      toast.success(m.school_setup_page__academic_year_updated());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <RecordList
      count={academicYears.length}
      emptyDescription={m.school_setup_page__academic_years_empty_description()}
      emptyTitle={m.school_setup_page__academic_years_empty_title()}
      icon={CalendarDays}
      title={m.school_setup_page__academic_years()}
    >
      {academicYears.map((year) => (
        <ListItem
          isEditing={isEditing(year.id)}
          key={year.id}
          meta={`${year.startDate} - ${year.endDate}`}
          onCancel={onCancel}
          onEdit={canManageSetup ? () => onEdit(year.id) : undefined}
          renderEditForm={() => (
            <AcademicYearEditForm
              isPending={mutation.isPending}
              onSubmit={(event) => void handleUpdate(year.id, event)}
              year={year}
            />
          )}
        >
          <span className="block truncate">{year.name}</span>
        </ListItem>
      ))}
    </RecordList>
  );
}

function AcademicYearEditForm({
  isPending,
  onSubmit,
  year
}: {
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  year: AcademicYear;
}) {
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`academic-year-${year.id}-name`}>
            {m.school_setup_page__academic_year_name()}
          </FieldLabel>
          <Input
            defaultValue={year.name}
            id={`academic-year-${year.id}-name`}
            name="name"
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`academic-year-${year.id}-start-date`}>
              {m.school_setup_page__start_date()}
            </FieldLabel>
            <Input
              defaultValue={year.startDate}
              id={`academic-year-${year.id}-start-date`}
              name="startDate"
              required
              type="date"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`academic-year-${year.id}-end-date`}>
              {m.school_setup_page__end_date()}
            </FieldLabel>
            <Input
              defaultValue={year.endDate}
              id={`academic-year-${year.id}-end-date`}
              name="endDate"
              required
              type="date"
            />
          </Field>
        </div>
        <UpdateButton isPending={isPending} />
      </FieldGroup>
    </form>
  );
}
