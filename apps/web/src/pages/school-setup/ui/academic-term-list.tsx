import { CalendarRange } from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Field, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { getRequiredString } from "@/shared/lib/form-values";

import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import { useUpdateAcademicTermMutation } from "@/pages/school-setup/api/update-academic-term.mutation";
import { getSchoolSetupErrorMessage } from "@/pages/school-setup/lib/errors";
import { getAcademicTermKindOptions } from "@/pages/school-setup/ui/academic-term-kind-options";
import { NativeSelect } from "@/pages/school-setup/ui/native-select";
import { ListItem, RecordList, UpdateButton } from "@/pages/school-setup/ui/setup-list-primitives";

type AcademicTerm = SchoolSetupQueryResult["academicTerms"][number];

type AcademicTermListProps = {
  academicTerms: SchoolSetupQueryResult["academicTerms"];
  academicYears: SchoolSetupQueryResult["academicYears"];
  canManageSetup: boolean;
  isEditing: (id: string) => boolean;
  onCancel: () => void;
  onEdit: (id: string) => void;
};

export function AcademicTermList({
  academicTerms,
  academicYears,
  canManageSetup,
  isEditing,
  onCancel,
  onEdit
}: AcademicTermListProps) {
  const mutation = useUpdateAcademicTermMutation();
  const termKindOptions = getAcademicTermKindOptions(m);

  const getYearName = (academicYearId: string) =>
    academicYears.find((year) => year.id === academicYearId)?.name ??
    m.school_setup_page__unknown_academic_year();

  const getTermKindLabel = (kind: AcademicTerm["kind"]) =>
    termKindOptions.find((option) => option.kind === kind)?.label ?? kind;

  const handleUpdate = async (id: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await mutation.mutateAsync({
        academicYearId: getRequiredString(formData, "academicYearId"),
        endDate: getRequiredString(formData, "endDate"),
        id,
        kind: getRequiredString(formData, "kind") as AcademicTerm["kind"],
        name: getRequiredString(formData, "name"),
        startDate: getRequiredString(formData, "startDate")
      });
      onCancel();
      toast.success(m.school_setup_page__academic_term_updated());
    } catch (error) {
      toast.error(getSchoolSetupErrorMessage(error));
    }
  };

  return (
    <RecordList
      count={academicTerms.length}
      emptyDescription={m.school_setup_page__academic_terms_empty_description()}
      emptyTitle={m.school_setup_page__academic_terms_empty_title()}
      icon={CalendarRange}
      title={m.school_setup_page__academic_terms()}
    >
      {academicTerms.map((term) => (
        <ListItem
          isEditing={isEditing(term.id)}
          key={term.id}
          meta={`${getYearName(term.academicYearId)} / ${getTermKindLabel(term.kind)} / ${term.startDate} - ${term.endDate}`}
          onCancel={onCancel}
          onEdit={canManageSetup ? () => onEdit(term.id) : undefined}
          renderEditForm={() => (
            <AcademicTermEditForm
              academicYears={academicYears}
              isPending={mutation.isPending}
              onSubmit={(event) => void handleUpdate(term.id, event)}
              term={term}
              termKindOptions={termKindOptions}
            />
          )}
        >
          <span className="block truncate">{term.name}</span>
        </ListItem>
      ))}
    </RecordList>
  );
}

function AcademicTermEditForm({
  academicYears,
  isPending,
  onSubmit,
  term,
  termKindOptions
}: {
  academicYears: SchoolSetupQueryResult["academicYears"];
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  term: AcademicTerm;
  termKindOptions: ReturnType<typeof getAcademicTermKindOptions>;
}) {
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`academic-term-${term.id}-year`}>
            {m.school_setup_page__academic_year()}
          </FieldLabel>
          <NativeSelect
            defaultValue={term.academicYearId}
            id={`academic-term-${term.id}-year`}
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-name`}>
              {m.school_setup_page__academic_term_name()}
            </FieldLabel>
            <Input
              defaultValue={term.name}
              id={`academic-term-${term.id}-name`}
              name="name"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-kind`}>
              {m.school_setup_page__term_kind()}
            </FieldLabel>
            <NativeSelect defaultValue={term.kind} id={`academic-term-${term.id}-kind`} name="kind">
              {termKindOptions.map((option) => (
                <option key={option.kind} value={option.kind}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-start-date`}>
              {m.school_setup_page__start_date()}
            </FieldLabel>
            <Input
              defaultValue={term.startDate}
              id={`academic-term-${term.id}-start-date`}
              name="startDate"
              required
              type="date"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`academic-term-${term.id}-end-date`}>
              {m.school_setup_page__end_date()}
            </FieldLabel>
            <Input
              defaultValue={term.endDate}
              id={`academic-term-${term.id}-end-date`}
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
