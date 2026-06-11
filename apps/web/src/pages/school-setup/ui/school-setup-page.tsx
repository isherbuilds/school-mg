import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Layers3,
  Plus,
  RefreshCw,
  UsersRound
} from "lucide-react";
import { type FormEvent } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
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
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "@/shared/ui/container";

import { useCreateAcademicYearMutation } from "@/pages/school-setup/api/create-academic-year.mutation";
import { useCreateGradeLevelMutation } from "@/pages/school-setup/api/create-grade-level.mutation";
import { useCreateSectionMutation } from "@/pages/school-setup/api/create-section.mutation";
import { useCreateSubjectMutation } from "@/pages/school-setup/api/create-subject.mutation";
import {
  type SchoolSetupQueryResult,
  useGetSchoolSetupQuery
} from "@/pages/school-setup/api/get-school-setup.query";

type RecordListProps = {
  children: React.ReactNode;
  count: number;
  emptyDescription: string;
  emptyTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : m.school_setup_page__save_failed();
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value.length > 0 ? value : undefined;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value.length > 0 ? Number(value) : undefined;
}

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select"> & { className?: string }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input/70 bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-border disabled:opacity-64 dark:bg-input/32",
        className
      )}
      {...props}
    />
  );
}

function SubmitButton({ children, isPending }: { children: string; isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? <Spinner data-icon aria-hidden="true" /> : <Plus data-icon aria-hidden="true" />}
      {children}
    </Button>
  );
}

function RecordList({
  children,
  count,
  emptyDescription,
  emptyTitle,
  icon: Icon,
  title
}: RecordListProps) {
  return (
    <section className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="truncate text-sm font-medium">{title}</h2>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{count}</span>
      </div>
      {count > 0 ? (
        <ul className="divide-y">{children}</ul>
      ) : (
        <Empty className="border-0 p-8">
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

function ListItem({ children, meta }: { children: React.ReactNode; meta: string }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 text-sm font-medium">{children}</div>
      <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>
    </li>
  );
}

function SchoolSetupSkeleton() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-52" key={index} />
          ))}
        </div>
        <Skeleton className="h-[560px]" />
      </div>
    </Container>
  );
}

function SchoolSetupError({ onRetry }: { onRetry: () => void }) {
  return (
    <Container className="py-8">
      <Empty className="min-h-[420px]">
        <EmptyMedia variant="icon">
          <Layers3 aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{m.school_setup_page__unavailable_title()}</EmptyTitle>
          <EmptyDescription>{m.school_setup_page__unavailable_description()}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRetry} variant="outline">
            <RefreshCw data-icon aria-hidden="true" />
            {m.school_setup_page__retry()}
          </Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}

function SetupLists({ setup }: { setup: SchoolSetupQueryResult }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RecordList
        count={setup.academicYears.length}
        emptyDescription={m.school_setup_page__academic_years_empty_description()}
        emptyTitle={m.school_setup_page__academic_years_empty_title()}
        icon={CalendarDays}
        title={m.school_setup_page__academic_years()}
      >
        {setup.academicYears.map((year) => (
          <ListItem key={year.id} meta={`${year.startDate} - ${year.endDate}`}>
            <span className="block truncate">{year.name}</span>
          </ListItem>
        ))}
      </RecordList>

      <RecordList
        count={setup.gradeLevels.length}
        emptyDescription={m.school_setup_page__grade_levels_empty_description()}
        emptyTitle={m.school_setup_page__grade_levels_empty_title()}
        icon={GraduationCap}
        title={m.school_setup_page__grade_levels()}
      >
        {setup.gradeLevels.map((gradeLevel) => (
          <ListItem key={gradeLevel.id} meta={`#${gradeLevel.sortOrder}`}>
            <span className="block truncate">
              {gradeLevel.name} ({gradeLevel.code})
            </span>
          </ListItem>
        ))}
      </RecordList>

      <RecordList
        count={setup.subjects.length}
        emptyDescription={m.school_setup_page__subjects_empty_description()}
        emptyTitle={m.school_setup_page__subjects_empty_title()}
        icon={BookOpen}
        title={m.school_setup_page__subjects()}
      >
        {setup.subjects.map((subject) => (
          <ListItem key={subject.id} meta={subject.isCore ? m.school_setup_page__core() : ""}>
            <span className="block truncate">
              {subject.name} ({subject.code})
            </span>
          </ListItem>
        ))}
      </RecordList>

      <RecordList
        count={setup.sections.length}
        emptyDescription={m.school_setup_page__sections_empty_description()}
        emptyTitle={m.school_setup_page__sections_empty_title()}
        icon={UsersRound}
        title={m.school_setup_page__sections()}
      >
        {setup.sections.map((section) => (
          <ListItem
            key={section.id}
            meta={
              section.capacity !== null ? String(section.capacity) : section.shift.replace("_", " ")
            }
          >
            <span className="block truncate">
              {section.name} ({section.code})
            </span>
          </ListItem>
        ))}
      </RecordList>
    </div>
  );
}

function SetupForms({ setup }: { setup: SchoolSetupQueryResult }) {
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
        isCurrent: true,
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
        sortOrder: Number(getRequiredString(formData, "sortOrder"))
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

function SetupReadOnlyPanel() {
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

export function SchoolSetupPage() {
  const setupQuery = useGetSchoolSetupQuery();

  if (setupQuery.isPending) {
    return <SchoolSetupSkeleton />;
  }

  if (setupQuery.isError || !setupQuery.data) {
    return <SchoolSetupError onRetry={() => void setupQuery.refetch()} />;
  }

  return (
    <Container className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {m.school_setup_page__eyebrow()}
        </p>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-semibold tracking-normal md:text-4xl">
              {m.school_setup_page__title()}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              {m.school_setup_page__description()}
            </p>
          </div>
          <Button onClick={() => void setupQuery.refetch()} variant="outline">
            <RefreshCw data-icon aria-hidden="true" />
            {m.school_setup_page__refresh()}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <SetupLists setup={setupQuery.data} />
        {setupQuery.data.canManageSetup ? (
          <SetupForms setup={setupQuery.data} />
        ) : (
          <SetupReadOnlyPanel />
        )}
      </div>
    </Container>
  );
}
