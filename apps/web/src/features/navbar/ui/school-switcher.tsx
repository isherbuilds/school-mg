import { useRouter } from "@tanstack/react-router";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Button } from "@tsu-stack/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useGetSchoolsQuery, useSelectSchoolMutation } from "@/shared/api/school-access";

type SchoolSwitcherProps = {
  className?: string;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
};

export function SchoolSwitcher(props: SchoolSwitcherProps) {
  const { user } = useAuthSuspense();

  if (!user) {
    return null;
  }

  return <AuthenticatedSchoolSwitcher {...props} />;
}

function AuthenticatedSchoolSwitcher({
  className,
  onNavigate,
  variant = "desktop"
}: SchoolSwitcherProps) {
  const router = useRouter();
  const schoolsQuery = useGetSchoolsQuery();
  const selectSchoolMutation = useSelectSchoolMutation();
  const [pendingSchoolId, setPendingSchoolId] = useState<string | null>(null);

  if (schoolsQuery.isPending) {
    return <Skeleton className={cn("h-9 w-40", className)} />;
  }

  if (schoolsQuery.isError || !schoolsQuery.data) {
    return null;
  }

  const activeSchool = schoolsQuery.data.schools.find(
    (school) => school.id === schoolsQuery.data.activeSchoolId
  );
  const triggerLabel = activeSchool?.name ?? m.school_switcher__no_school();
  const isMobile = variant === "mobile";

  const handleSelect = async (schoolId: string) => {
    if (schoolId === schoolsQuery.data.activeSchoolId) {
      return;
    }

    setPendingSchoolId(schoolId);
    try {
      await selectSchoolMutation.mutateAsync({ id: schoolId });
      await router.invalidate();
      toast.success(m.school_switcher__school_selected());
      onNavigate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.school_setup_page__save_failed());
    } finally {
      setPendingSchoolId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={m.school_switcher__trigger_label()}
          className={cn(
            "max-w-56 justify-start gap-2",
            isMobile && "w-full max-w-none justify-between",
            className
          )}
          size={isMobile ? "default" : "sm"}
          variant="outline"
        >
          <Building2 aria-hidden="true" className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown aria-hidden="true" className="ml-auto size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isMobile ? "start" : "end"} className="w-72">
        <DropdownMenuLabel>{m.school_switcher__label()}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {schoolsQuery.data.schools.map((school) => {
            const isActive = school.id === schoolsQuery.data.activeSchoolId;
            const isPending = pendingSchoolId === school.id;

            return (
              <DropdownMenuItem
                disabled={isActive || isPending}
                key={school.id}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleSelect(school.id);
                }}
              >
                <Building2 aria-hidden="true" className="opacity-60" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{school.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {school.slug}
                  </span>
                </span>
                {isActive ? (
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Check aria-hidden="true" className="size-3.5" />
                    {m.school_switcher__active()}
                  </span>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link onClick={onNavigate} to="/schools/new">
            <Plus aria-hidden="true" className="opacity-60" />
            <span>{m.school_switcher__create_school()}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
