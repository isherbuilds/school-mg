import { ArrowRight, Building2, Check, Plus, RefreshCw } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
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

import {
  useCreateSchoolMutation,
  useGetSchoolsQuery,
  useSelectSchoolMutation
} from "@/shared/api/school-access";
import {
  getErrorMessage,
  getOptionalString,
  getRequiredString,
  hasErrorCode
} from "@/shared/lib/form-values";
import { Container } from "@/shared/ui/container";

function getSchoolBootstrapErrorMessage(error: unknown) {
  if (hasErrorCode(error, "DUPLICATE_SCHOOL_SLUG")) {
    return m.school_bootstrap_page__duplicate_slug();
  }

  return getErrorMessage(error);
}

function generateSchoolSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");

  if (slug.length >= 3) {
    return slug;
  }

  return slug ? `${slug}-school` : "";
}

function SchoolBootstrapSkeleton() {
  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.65fr)]">
      <div className="rounded-md border bg-background p-4">
        <Skeleton className="mb-4 h-8 w-56" />
        <Skeleton className="mb-6 h-4 w-full max-w-xl" />
        <div className="grid gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <Skeleton className="h-72" />
    </Container>
  );
}

function SchoolBootstrapError({ onRetry }: { onRetry: () => void }) {
  return (
    <Container className="py-8">
      <Empty className="min-h-[420px]">
        <EmptyMedia variant="icon">
          <Building2 aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{m.school_bootstrap_page__unavailable_title()}</EmptyTitle>
          <EmptyDescription>{m.school_bootstrap_page__unavailable_description()}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRetry} variant="outline">
            <RefreshCw data-icon aria-hidden="true" />
            {m.school_bootstrap_page__retry()}
          </Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}

export function SchoolBootstrapPage() {
  const navigate = useNavigate();
  const schoolsQuery = useGetSchoolsQuery();
  const createSchoolMutation = useCreateSchoolMutation();
  const selectSchoolMutation = useSelectSchoolMutation();
  const [pendingSchoolId, setPendingSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const generatedSlug = schoolSlug ? "" : generateSchoolSlug(schoolName);

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await createSchoolMutation.mutateAsync({
        name: getRequiredString(formData, "name"),
        slug: getOptionalString(formData, "slug")
      });
      toast.success(m.school_bootstrap_page__created());
      form.reset();
      setSchoolName("");
      setSchoolSlug("");
      await navigate({ to: "/school-setup" });
    } catch (error) {
      toast.error(getSchoolBootstrapErrorMessage(error));
    }
  };

  const handleSelectSchool = async (schoolId: string) => {
    try {
      setPendingSchoolId(schoolId);
      await selectSchoolMutation.mutateAsync({ id: schoolId });
      await navigate({ to: "/school-setup" });
    } catch (error) {
      toast.error(getSchoolBootstrapErrorMessage(error));
    } finally {
      setPendingSchoolId(null);
    }
  };

  if (schoolsQuery.isPending) {
    return <SchoolBootstrapSkeleton />;
  }

  if (schoolsQuery.isError || !schoolsQuery.data) {
    return <SchoolBootstrapError onRetry={() => void schoolsQuery.refetch()} />;
  }

  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.65fr)]">
      <section className="rounded-md border bg-background">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium text-muted-foreground">
            {m.school_bootstrap_page__eyebrow()}
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-normal md:text-4xl">
            {m.school_bootstrap_page__title()}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            {m.school_bootstrap_page__description()}
          </p>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {m.school_bootstrap_page__multiple_schools_description()}
          </p>
        </div>

        <form onSubmit={handleCreateSubmit} className="p-4">
          <FieldSet>
            <FieldGroup className="gap-4">
              <Field>
                <FieldContent>
                  <FieldLabel htmlFor="school-name">
                    {m.school_bootstrap_page__school_name()}
                  </FieldLabel>
                  <FieldDescription>
                    {m.school_bootstrap_page__school_name_description()}
                  </FieldDescription>
                </FieldContent>
                <Input
                  id="school-name"
                  name="name"
                  onChange={(event) => setSchoolName(event.target.value)}
                  required
                  value={schoolName}
                  placeholder={m.school_bootstrap_page__school_name_placeholder()}
                />
              </Field>

              <Field>
                <FieldContent>
                  <FieldLabel htmlFor="school-slug">
                    {m.school_bootstrap_page__school_slug()}
                  </FieldLabel>
                  <FieldDescription>
                    {m.school_bootstrap_page__school_slug_description()}
                  </FieldDescription>
                </FieldContent>
                <Input
                  id="school-slug"
                  name="slug"
                  onChange={(event) => setSchoolSlug(event.target.value)}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={schoolSlug}
                  placeholder={m.school_bootstrap_page__school_slug_placeholder()}
                />
                {generatedSlug ? (
                  <p className="text-sm text-muted-foreground">
                    {m.school_bootstrap_page__generated_slug({ slug: generatedSlug })}
                  </p>
                ) : null}
              </Field>

              <Button disabled={createSchoolMutation.isPending} type="submit">
                {createSchoolMutation.isPending ? (
                  <Spinner data-icon aria-hidden="true" />
                ) : (
                  <Plus data-icon aria-hidden="true" />
                )}
                {m.school_bootstrap_page__create_school()}
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>
      </section>

      <aside className="rounded-md border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">{m.school_bootstrap_page__existing_schools()}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {m.school_bootstrap_page__existing_schools_description()}
          </p>
        </div>
        <div className="grid gap-2 p-4">
          {schoolsQuery.data.schools.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {m.school_bootstrap_page__no_existing_schools()}
            </div>
          ) : (
            schoolsQuery.data.schools.map((school) => {
              const isActive = school.id === schoolsQuery.data.activeSchoolId;
              const isPending = pendingSchoolId === school.id;

              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                  key={school.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{school.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{school.slug}</p>
                  </div>
                  <Button
                    aria-current={isActive ? "true" : undefined}
                    disabled={isActive || isPending}
                    onClick={() => void handleSelectSchool(school.id)}
                    size="sm"
                    variant={isActive ? "secondary" : "outline"}
                  >
                    {isActive || isPending ? (
                      <Check data-icon aria-hidden="true" />
                    ) : (
                      <ArrowRight data-icon aria-hidden="true" />
                    )}
                    {isActive
                      ? m.school_bootstrap_page__active_school()
                      : m.school_bootstrap_page__select_school()}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </Container>
  );
}
