import { MailPlus, RefreshCw, ShieldCheck, ShieldOff, UsersRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  defaultStaffAssignableRoles,
  staffAssignableRoles,
  staffStatuses,
  type SchoolAccessRole,
  type StaffAssignableRole,
  type StaffMember,
  type StaffMemberCreateInput,
  type StaffMemberUpdateInput,
  type StaffStatus
} from "@tsu-stack/core/school";
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

import { getNullableString, getRequiredString } from "@/shared/lib/form-values";
import { Container } from "@/shared/ui/container";

import { useCreateStaffMemberMutation } from "@/pages/staff/api/create-staff-member.mutation";
import { useGetStaffQuery } from "@/pages/staff/api/get-staff.query";
import { useGrantStaffAccessMutation } from "@/pages/staff/api/grant-staff-access.mutation";
import { useRevokeStaffAccessMutation } from "@/pages/staff/api/revoke-staff-access.mutation";
import { useUpdateStaffMemberMutation } from "@/pages/staff/api/update-staff-member.mutation";
import { getStaffErrorMessage } from "@/pages/staff/lib/errors";

const statusOptions: readonly StaffStatus[] = staffStatuses;

function isStaffAssignableRole(role: FormDataEntryValue | null): role is StaffAssignableRole {
  return typeof role === "string" && staffAssignableRoles.includes(role as StaffAssignableRole);
}

function StaffSkeleton() {
  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Skeleton className="h-[560px]" />
      <div className="grid gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </Container>
  );
}

function StaffError({ onRetry }: { onRetry: () => void }) {
  return (
    <Container className="py-8">
      <Empty className="min-h-[420px]">
        <EmptyMedia variant="icon">
          <UsersRound aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{m.staff_page__unavailable_title()}</EmptyTitle>
          <EmptyDescription>{m.staff_page__unavailable_description()}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRetry} variant="outline">
            <RefreshCw data-icon aria-hidden="true" />
            {m.staff_page__retry()}
          </Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}

function NativeSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input/70 bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-border disabled:opacity-64",
        className
      )}
      {...props}
    />
  );
}

function SubmitButton({ children, isPending }: { children: string; isPending: boolean }) {
  return (
    <Button disabled={isPending} type="submit">
      {isPending ? (
        <Spinner data-icon aria-hidden="true" />
      ) : (
        <ShieldCheck data-icon aria-hidden="true" />
      )}
      {children}
    </Button>
  );
}

function getSelectedRole(formData: FormData): StaffAssignableRole {
  const role = formData.get("role");

  return isStaffAssignableRole(role) ? role : defaultStaffAssignableRoles[0];
}

function getStaffFormInput(formData: FormData): StaffMemberCreateInput {
  return {
    department: getNullableString(formData, "department"),
    email: getRequiredString(formData, "email"),
    employeeCode: getNullableString(formData, "employeeCode"),
    role: getSelectedRole(formData),
    status: getRequiredString(formData, "status") as StaffStatus,
    title: getNullableString(formData, "title")
  };
}

function getStaffUpdateInput(formData: FormData, staff: StaffMember): StaffMemberUpdateInput {
  return {
    department: getNullableString(formData, "department"),
    email: staff.invitationId ? getRequiredString(formData, "email") : undefined,
    employeeCode: getNullableString(formData, "employeeCode"),
    id: staff.id,
    role: getSelectedRole(formData),
    status: getRequiredString(formData, "status") as StaffStatus,
    title: getNullableString(formData, "title")
  };
}

function getAccessStatusLabel(staff: StaffMember) {
  switch (staff.accessStatus) {
    case "linked":
      return m.staff_page__access_linked();
    case "pending":
      return m.staff_page__access_pending();
    case "revoked":
      return m.staff_page__access_revoked();
  }
}

function getStatusLabel(status: StaffStatus) {
  switch (status) {
    case "active":
      return m.staff_page__status_active();
    case "inactive":
      return m.staff_page__status_inactive();
    case "on_leave":
      return m.staff_page__status_on_leave();
  }
}

function getRoleLabel(role: SchoolAccessRole) {
  if (role === "owner") {
    return m.staff_page__role_owner();
  }

  return role === "principal" ? m.staff_page__role_principal() : m.staff_page__role_teacher();
}

function RoleControl({
  canManagePrincipalRole,
  defaultRole,
  disabled
}: {
  canManagePrincipalRole: boolean;
  defaultRole: StaffAssignableRole;
  disabled?: boolean;
}) {
  return (
    <Field>
      <FieldContent>
        <FieldLabel>{m.staff_page__roles()}</FieldLabel>
        <FieldDescription>{m.staff_page__roles_description()}</FieldDescription>
      </FieldContent>
      <NativeSelect defaultValue={defaultRole} disabled={disabled} name="role">
        {staffAssignableRoles.map((role) => (
          <option
            disabled={role === "principal" && !canManagePrincipalRole}
            key={role}
            value={role}
          >
            {getRoleLabel(role)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

function StaffCreateForm({ canManagePrincipalRole }: { canManagePrincipalRole: boolean }) {
  const createStaffMutation = useCreateStaffMemberMutation();

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await createStaffMutation.mutateAsync(getStaffFormInput(formData));
      form.reset();
      toast.success(m.staff_page__staff_saved());
    } catch (error) {
      toast.error(getStaffErrorMessage(error));
    }
  };

  return (
    <section className="rounded-md border bg-background">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{m.staff_page__new_staff_title()}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {m.staff_page__new_staff_description()}
        </p>
      </div>

      <form onSubmit={handleCreateSubmit} className="p-4">
        <FieldSet>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="staff-create-email">{m.staff_page__email()}</FieldLabel>
                <Input id="staff-create-email" name="email" required type="email" />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-create-employee-code">
                  {m.staff_page__employee_code()}
                </FieldLabel>
                <Input id="staff-create-employee-code" name="employeeCode" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="staff-create-title">{m.staff_page__title_field()}</FieldLabel>
                <Input id="staff-create-title" name="title" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="staff-create-department">
                  {m.staff_page__department()}
                </FieldLabel>
                <Input id="staff-create-department" name="department" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="staff-create-status">{m.staff_page__status()}</FieldLabel>
                <NativeSelect id="staff-create-status" name="status" defaultValue="active">
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <RoleControl
              canManagePrincipalRole={canManagePrincipalRole}
              defaultRole={defaultStaffAssignableRoles[0]}
            />
            <SubmitButton isPending={createStaffMutation.isPending}>
              {m.staff_page__create_staff()}
            </SubmitButton>
          </FieldGroup>
        </FieldSet>
      </form>
    </section>
  );
}

function StaffAccessButton({
  disabled,
  isPending,
  onClick,
  staff
}: {
  disabled: boolean;
  isPending: boolean;
  onClick: () => void;
  staff: StaffMember;
}) {
  if (staff.accessStatus === "linked") {
    return (
      <Button disabled={disabled || isPending} onClick={onClick} size="sm" variant="outline">
        {isPending ? (
          <Spinner data-icon aria-hidden="true" />
        ) : (
          <ShieldOff data-icon aria-hidden="true" />
        )}
        {m.staff_page__revoke_access()}
      </Button>
    );
  }

  const label =
    staff.accessStatus === "pending" ? m.staff_page__resend_access() : m.staff_page__grant_access();

  return (
    <Button disabled={disabled || isPending} onClick={onClick} size="sm" variant="outline">
      {isPending ? (
        <Spinner data-icon aria-hidden="true" />
      ) : (
        <MailPlus data-icon aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

function StaffMemberCard({
  canManagePrincipalRole,
  canManageStaff,
  staff
}: {
  canManagePrincipalRole: boolean;
  canManageStaff: boolean;
  staff: StaffMember;
}) {
  const updateStaffMutation = useUpdateStaffMemberMutation();
  const grantAccessMutation = useGrantStaffAccessMutation();
  const revokeAccessMutation = useRevokeStaffAccessMutation();
  const [isAccessPending, setIsAccessPending] = useState(false);
  const isOwner = staff.role === "owner";
  const isPrincipal = staff.role === "principal";
  const canManageThisStaff = canManageStaff && !isOwner && (!isPrincipal || canManagePrincipalRole);

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageThisStaff) {
      toast.error(m.staff_page__principal_management_denied());
      return;
    }

    const formData = new FormData(event.currentTarget);
    const input = getStaffUpdateInput(formData, staff);

    try {
      await updateStaffMutation.mutateAsync(input);
      toast.success(m.staff_page__staff_saved());
    } catch (error) {
      toast.error(getStaffErrorMessage(error));
    }
  };

  const handleAccess = async () => {
    if (!canManageThisStaff || isAccessPending) {
      return;
    }

    try {
      setIsAccessPending(true);
      if (staff.accessStatus === "linked") {
        await revokeAccessMutation.mutateAsync({ staffMemberId: staff.id });
        toast.success(m.staff_page__access_revoked_success());
      } else {
        await grantAccessMutation.mutateAsync({ staffMemberId: staff.id });
        toast.success(m.staff_page__access_sent_success());
      }
    } catch (error) {
      toast.error(getStaffErrorMessage(error));
    } finally {
      setIsAccessPending(false);
    }
  };

  return (
    <article className="rounded-md border bg-background">
      <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">{staff.fullName ?? staff.email}</h3>
            <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
              {getAccessStatusLabel(staff)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{staff.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {staff.employeeCode ?? m.staff_page__employee_code_missing()} ·{" "}
            {getRoleLabel(staff.role)}
          </p>
        </div>
        {canManageStaff ? (
          <StaffAccessButton
            disabled={!canManageThisStaff}
            isPending={isAccessPending}
            onClick={() => void handleAccess()}
            staff={staff}
          />
        ) : null}
      </div>

      <form onSubmit={handleUpdateSubmit} className="p-4">
        <FieldSet disabled={!canManageThisStaff}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`staff-${staff.id}-email`}>{m.staff_page__email()}</FieldLabel>
                <Input
                  defaultValue={staff.email}
                  id={`staff-${staff.id}-email`}
                  name="email"
                  readOnly={!staff.invitationId}
                  required
                  type="email"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`staff-${staff.id}-employee-code`}>
                  {m.staff_page__employee_code()}
                </FieldLabel>
                <Input
                  defaultValue={staff.employeeCode ?? ""}
                  id={`staff-${staff.id}-employee-code`}
                  name="employeeCode"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`staff-${staff.id}-title`}>
                  {m.staff_page__title_field()}
                </FieldLabel>
                <Input
                  defaultValue={staff.title ?? ""}
                  id={`staff-${staff.id}-title`}
                  name="title"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`staff-${staff.id}-department`}>
                  {m.staff_page__department()}
                </FieldLabel>
                <Input
                  defaultValue={staff.department ?? ""}
                  id={`staff-${staff.id}-department`}
                  name="department"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`staff-${staff.id}-status`}>
                  {m.staff_page__status()}
                </FieldLabel>
                <NativeSelect
                  id={`staff-${staff.id}-status`}
                  name="status"
                  defaultValue={staff.status}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <RoleControl
              canManagePrincipalRole={canManagePrincipalRole}
              defaultRole={staff.role === "owner" ? "principal" : staff.role}
              disabled={!canManageThisStaff}
            />

            {canManageStaff ? (
              <SubmitButton isPending={updateStaffMutation.isPending}>
                {m.staff_page__save_staff()}
              </SubmitButton>
            ) : null}
          </FieldGroup>
        </FieldSet>
      </form>
    </article>
  );
}

function StaffReadOnlyPanel() {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {m.staff_page__read_only_description()}
    </div>
  );
}

export function StaffPage() {
  const staffQuery = useGetStaffQuery();

  if (staffQuery.isPending) {
    return <StaffSkeleton />;
  }

  if (staffQuery.isError || !staffQuery.data) {
    return <StaffError onRetry={() => void staffQuery.refetch()} />;
  }

  return (
    <Container className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">{m.staff_page__eyebrow()}</p>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-semibold tracking-normal md:text-4xl">
              {m.staff_page__title()}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              {m.staff_page__description()}
            </p>
          </div>
          <Button onClick={() => void staffQuery.refetch()} variant="outline">
            <RefreshCw data-icon aria-hidden="true" />
            {m.staff_page__refresh()}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.65fr)_minmax(0,1.35fr)]">
        {staffQuery.data.canManageStaff ? (
          <StaffCreateForm canManagePrincipalRole={staffQuery.data.canManagePrincipalRole} />
        ) : (
          <StaffReadOnlyPanel />
        )}

        <section className="rounded-md border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">{m.staff_page__directory_title()}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {m.staff_page__directory_description()}
            </p>
          </div>
          <div className="grid gap-3 p-4">
            {staffQuery.data.staff.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {m.staff_page__empty()}
              </div>
            ) : (
              staffQuery.data.staff.map((staff) => (
                <StaffMemberCard
                  canManagePrincipalRole={staffQuery.data.canManagePrincipalRole}
                  canManageStaff={staffQuery.data.canManageStaff}
                  key={staff.id}
                  staff={staff}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </Container>
  );
}
