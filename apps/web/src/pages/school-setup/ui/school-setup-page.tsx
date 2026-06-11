import { Layers3, RefreshCw } from "lucide-react";

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
import { Skeleton } from "@tsu-stack/ui/components/skeleton";

import { Container } from "@/shared/ui/container";

import { useGetSchoolSetupQuery } from "@/pages/school-setup/api/get-school-setup.query";
import { SetupForms, SetupReadOnlyPanel } from "@/pages/school-setup/ui/school-setup-forms";
import { SetupLists } from "@/pages/school-setup/ui/school-setup-lists";

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
