import { Layers3, Plus } from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet
} from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useCreateAcademicYearMutation } from "@/pages/school-setup/api/create-academic-year.mutation";
import { useCreateGradeLevelMutation } from "@/pages/school-setup/api/create-grade-level.mutation";
import { useCreateSectionMutation } from "@/pages/school-setup/api/create-section.mutation";
import { useCreateSubjectMutation } from "@/pages/school-setup/api/create-subject.mutation";
import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import {
  getBoolean,
  getErrorMessage,
  getOptionalNumber,
  getOptionalString,
  getRequiredNumber,
  getRequiredString
} from "@/pages/school-setup/lib/form-values";
import { NativeSelect } from "@/pages/school-setup/ui/native-select";

function SubmitButton({ children, isPending }: { children: string; isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? <Spinner data-icon aria-hidden="true" /> : <Plus data-icon aria-hidden="true" />}
      {children}
    </Button>
  );
}

export function SetupForms({ setup }: { setup: SchoolSetupQueryResult }) {
  const academicYearMutation = useCreateAcademicYearMutation();
  const gradeLevelMutation = useCreateGradeLevelMutation();
  const subjectMutation = useCreateSubjectMutation();
  const sectionMutation = useCreateSectionMutation();

  const canCreateSection = setup.academicYears.length > 0 && setup.gradeLevels.length > 0;

  const handleAcademicYearSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await academicYearMutation.mutateAsync({
        endDate: getRequiredString(formData, "endDate"),
        isCurrent: getBoolean(formData, "isCurrent"),
        name: getRequiredString(formData, "name"),
        startDate: getRequiredString(formData, "startDate")
      });
      form.reset();
      toast.success(m.school_setup_page__academic_year_saved());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleGradeLevelSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await gradeLevelMutation.mutateAsync({
        code: getRequiredString(formData, "code"),
        name: getRequiredString(formData, "name"),
        sortOrder: getRequiredNumber(formData, "sortOrder")
      });
      form.reset();
      toast.success(m.school_setup_page__grade_level_saved());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await subjectMutation.mutateAsync({
        code: getRequiredString(formData, "code"),
        name: getRequiredString(formData, "name"),
        shortName: getOptionalString(formData, "shortName")
      });
      form.reset();
      toast.success(m.school_setup_page__subject_saved());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await sectionMutation.mutateAsync({
        academicYearId: getRequiredString(formData, "academicYearId"),
        capacity: getOptionalNumber(formData, "capacity"),
        code: getRequiredString(formData, "code"),
        gradeLevelId: getRequiredString(formData, "gradeLevelId"),
        name: getRequiredString(formData, "name")
      });
      form.reset();
      toast.success(m.school_setup_page__section_saved());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{m.school_setup_page__quick_create()}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {m.school_setup_page__quick_create_description()}
        </p>
      </div>

      <div className="grid gap-6 p-4">
        <form onSubmit={handleAcademicYearSubmit}>
          <FieldSet>
            <FieldGroup className="gap-4">
              <Field>
                <FieldContent>
                  <FieldLabel htmlFor="academic-year-name">
                    {m.school_setup_page__academic_year_name()}
                  </FieldLabel>
                </FieldContent>
                <Input
                  id="academic-year-name"
                  name="name"
                  required
                  placeholder={m.school_setup_page__academic_year_name_placeholder()}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="academic-year-start-date">
                      {m.school_setup_page__start_date()}
                    </FieldLabel>
                  </FieldContent>
                  <Input id="academic-year-start-date" name="startDate" required type="date" />
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="academic-year-end-date">
                      {m.school_setup_page__end_date()}
                    </FieldLabel>
                  </FieldContent>
                  <Input id="academic-year-end-date" name="endDate" required type="date" />
                </Field>
              </div>
              <Field orientation="horizontal">
                <input
                  id="academic-year-is-current"
                  name="isCurrent"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                />
                <FieldContent>
                  <FieldLabel htmlFor="academic-year-is-current">
                    {m.school_setup_page__set_as_current_year()}
                  </FieldLabel>
                  <FieldDescription>
                    {m.school_setup_page__set_as_current_year_description()}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <SubmitButton isPending={academicYearMutation.isPending}>
                {m.school_setup_page__add_academic_year()}
              </SubmitButton>
            </FieldGroup>
          </FieldSet>
        </form>

        <form onSubmit={handleGradeLevelSubmit}>
          <FieldSet>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_96px]">
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="grade-level-name">
                      {m.school_setup_page__grade_level_name()}
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    id="grade-level-name"
                    name="name"
                    required
                    placeholder={m.school_setup_page__grade_level_name_placeholder()}
                  />
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="grade-level-code">
                      {m.school_setup_page__code()}
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    id="grade-level-code"
                    name="code"
                    required
                    placeholder={m.school_setup_page__grade_level_code_placeholder()}
                  />
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="grade-level-sort-order">
                      {m.school_setup_page__order()}
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    defaultValue="0"
                    id="grade-level-sort-order"
                    min="0"
                    name="sortOrder"
                    required
                    step="1"
                    type="number"
                  />
                </Field>
              </div>
              <SubmitButton isPending={gradeLevelMutation.isPending}>
                {m.school_setup_page__add_grade_level()}
              </SubmitButton>
            </FieldGroup>
          </FieldSet>
        </form>

        <form onSubmit={handleSubjectSubmit}>
          <FieldSet>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_140px]">
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="subject-name">
                      {m.school_setup_page__subject_name()}
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    id="subject-name"
                    name="name"
                    required
                    placeholder={m.school_setup_page__subject_name_placeholder()}
                  />
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="subject-code">{m.school_setup_page__code()}</FieldLabel>
                  </FieldContent>
                  <Input
                    id="subject-code"
                    name="code"
                    required
                    placeholder={m.school_setup_page__subject_code_placeholder()}
                  />
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="subject-short-name">
                      {m.school_setup_page__short_name()}
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    id="subject-short-name"
                    name="shortName"
                    placeholder={m.school_setup_page__subject_short_name_placeholder()}
                  />
                </Field>
              </div>
              <SubmitButton isPending={subjectMutation.isPending}>
                {m.school_setup_page__add_subject()}
              </SubmitButton>
            </FieldGroup>
          </FieldSet>
        </form>

        <form onSubmit={handleSectionSubmit}>
          <FieldSet disabled={!canCreateSection}>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="section-academic-year">
                      {m.school_setup_page__academic_year()}
                    </FieldLabel>
                  </FieldContent>
                  <NativeSelect id="section-academic-year" name="academicYearId" required>
                    <option value="">{m.school_setup_page__select_academic_year()}</option>
                    {setup.academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="section-grade-level">
                      {m.school_setup_page__grade_level()}
                    </FieldLabel>
                  </FieldContent>
                  <NativeSelect id="section-grade-level" name="gradeLevelId" required>
                    <option value="">{m.school_setup_page__select_grade_level()}</option>
                    {setup.gradeLevels.map((gradeLevel) => (
                      <option key={gradeLevel.id} value={gradeLevel.id}>
                        {gradeLevel.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="section-name">
                      {m.school_setup_page__section_name()}
                    </FieldLabel>
                  </FieldContent>
                  <Input
                    id="section-name"
                    name="name"
                    required
                    placeholder={m.school_setup_page__section_name_placeholder()}
                  />
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="section-code">{m.school_setup_page__code()}</FieldLabel>
                  </FieldContent>
                  <Input
                    id="section-code"
                    name="code"
                    required
                    placeholder={m.school_setup_page__section_code_placeholder()}
                  />
                </Field>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="section-capacity">
                      {m.school_setup_page__capacity()}
                    </FieldLabel>
                  </FieldContent>
                  <Input id="section-capacity" min="0" name="capacity" step="1" type="number" />
                </Field>
              </div>
              {!canCreateSection && (
                <FieldDescription>
                  {m.school_setup_page__section_dependencies_description()}
                </FieldDescription>
              )}
              <SubmitButton isPending={sectionMutation.isPending}>
                {m.school_setup_page__add_section()}
              </SubmitButton>
            </FieldGroup>
          </FieldSet>
        </form>
      </div>
    </div>
  );
}

export function SetupReadOnlyPanel() {
  return (
    <div className="rounded-md border bg-background">
      <Empty className="min-h-[360px] border-0 p-8">
        <EmptyMedia variant="icon">
          <Layers3 aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{m.school_setup_page__read_only_title()}</EmptyTitle>
          <EmptyDescription>{m.school_setup_page__read_only_description()}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
