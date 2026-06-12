import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, LockKeyhole, RefreshCw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { invitationIdHeader, signupIntentHeader } from "@tsu-stack/auth/signup-headers";
import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
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
  FieldLabel
} from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "@/shared/ui/container";
import { LogoIcon } from "@/shared/ui/logo";

import {
  staffInvitationPreviewQueryKeys,
  useAcceptInvitationMutation,
  useInvitationPreviewQuery
} from "@/entities/staff-invitations";

import { appConfig } from "@/config/app.config";

type AcceptInvitationFormProps = React.ComponentProps<"div"> & {
  invitationId: string;
};

function InvitationUnavailable({
  description,
  onRetry,
  title
}: {
  description: string;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <Container className="flex max-w-md flex-col gap-6 py-8">
      <Empty className="min-h-[360px]">
        <EmptyMedia variant="icon">
          <Building2 aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw data-icon aria-hidden="true" />
              {m.staff_invitations__retry()}
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/sign-in">{m.auth__sign_in_link()}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}

export function AcceptInvitationForm({
  invitationId,
  className,
  ...props
}: AcceptInvitationFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previewQuery = useInvitationPreviewQuery(invitationId);
  const acceptInvitationMutation = useAcceptInvitationMutation();
  const { user, isPending: isAuthPending } = useAuth();

  const signUpMutation = useMutation({
    mutationFn: async (values: { name: string; password: string }) => {
      if (!previewQuery.data) {
        throw new Error(m.staff_invitations__preview_missing());
      }

      const result = await authClient.signUp.email(
        {
          email: previewQuery.data.email,
          name: values.name,
          password: values.password
        },
        {
          headers: {
            [invitationIdHeader]: invitationId,
            [signupIntentHeader]: "staff-invitation"
          }
        }
      );

      if (!result.data) {
        throw new Error(result.error?.message ?? m.auth__sign_up_failed());
      }

      return result.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || m.auth__sign_up_failed());
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(getAuthUserQueryOptions()),
        queryClient.invalidateQueries({
          queryKey: staffInvitationPreviewQueryKeys.byId(invitationId)
        })
      ]);
      toast.success(m.staff_invitations__verification_required());
      await navigate({
        search: {
          redirect: "/invitations"
        },
        to: "/sign-in"
      });
    }
  });

  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      name: "",
      password: ""
    },
    onSubmit: async ({ value }) => {
      const { name, password } = value;
      signUpMutation.mutate({ name, password });
    },
    validators: {
      onSubmit: z
        .object({
          confirmPassword: z.string(),
          name: z.string().min(2, m.auth__name_min_length()),
          password: z.string().min(8, m.auth__password_min_length())
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: m.auth__passwords_no_match(),
          path: ["confirmPassword"]
        })
    }
  });

  const handleExistingAccount = async () => {
    if (!user) {
      await navigate({
        search: {
          redirect: "/invitations"
        },
        to: "/sign-in"
      });
      return;
    }

    try {
      await acceptInvitationMutation.mutateAsync({ invitationId });
      toast.success(m.staff_invitations__accepted());
      await navigate({ to: "/school-setup" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.staff_invitations__accept_failed());
    }
  };

  if (previewQuery.isPending || isAuthPending) {
    return (
      <Container className={cn("flex max-w-md justify-center py-8", className)} {...props}>
        <Spinner />
      </Container>
    );
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <InvitationUnavailable
        description={m.staff_invitations__unavailable_description()}
        onRetry={() => void previewQuery.refetch()}
        title={m.staff_invitations__unavailable_title()}
      />
    );
  }

  if (previewQuery.data.status !== "pending") {
    return (
      <InvitationUnavailable
        description={m.staff_invitations__not_pending_description({
          status: previewQuery.data.status
        })}
        title={m.staff_invitations__not_pending_title()}
      />
    );
  }

  if (user) {
    return (
      <Container className={cn("flex max-w-md flex-col gap-6", className)} {...props}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex flex-col items-center gap-2 font-medium">
              <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
              <span className="sr-only">{appConfig.site.shortName}</span>
            </Link>
            <h1 className="text-xl font-bold">{m.staff_invitations__accept_title()}</h1>
            <FieldDescription>
              {m.staff_invitations__accept_description({
                schoolName: previewQuery.data.organizationName
              })}
            </FieldDescription>
          </div>

          <Field>
            <FieldContent>
              <FieldLabel htmlFor="signed-in-invitation-email">{m.auth__email_label()}</FieldLabel>
              <FieldDescription>{m.staff_invitations__locked_email_description()}</FieldDescription>
            </FieldContent>
            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-9"
                disabled
                id="signed-in-invitation-email"
                readOnly
                type="email"
                value={previewQuery.data.email}
              />
            </div>
          </Field>

          <Field>
            <Button
              disabled={acceptInvitationMutation.isPending}
              light="skeuomorphic"
              onClick={() => void handleExistingAccount()}
              type="button"
            >
              {acceptInvitationMutation.isPending ? (
                <Spinner data-icon aria-hidden="true" />
              ) : (
                <UserCheck data-icon aria-hidden="true" />
              )}
              {m.staff_invitations__use_existing_account()}
            </Button>
          </Field>
        </FieldGroup>
      </Container>
    );
  }

  return (
    <Container className={cn("flex max-w-md flex-col gap-6", className)} {...props}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          await form.handleSubmit();
        }}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex flex-col items-center gap-2 font-medium">
              <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
              <span className="sr-only">{appConfig.site.shortName}</span>
            </Link>
            <h1 className="text-xl font-bold">{m.staff_invitations__accept_title()}</h1>
            <FieldDescription>
              {m.staff_invitations__accept_description({
                schoolName: previewQuery.data.organizationName
              })}
            </FieldDescription>
          </div>

          <Field>
            <FieldContent>
              <FieldLabel htmlFor="invitation-email">{m.auth__email_label()}</FieldLabel>
              <FieldDescription>{m.staff_invitations__locked_email_description()}</FieldDescription>
            </FieldContent>
            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-9"
                disabled
                id="invitation-email"
                readOnly
                type="email"
                value={previewQuery.data.email}
              />
            </div>
          </Field>

          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{m.auth__name_label()}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={m.auth__name_placeholder()}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-sm text-destructive" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </Field>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{m.auth__password_label()}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  type="password"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-sm text-destructive" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </Field>
            )}
          </form.Field>

          <form.Field name="confirmPassword">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{m.auth__confirm_password_label()}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  type="password"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-sm text-destructive" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </Field>
            )}
          </form.Field>

          <Field>
            <Button
              disabled={signUpMutation.isPending || signUpMutation.isSuccess}
              light="skeuomorphic"
              type="submit"
            >
              {signUpMutation.isPending
                ? m.auth__creating_account()
                : m.staff_invitations__create_account_and_continue()}
            </Button>
          </Field>

          <Field>
            <Button
              disabled={acceptInvitationMutation.isPending}
              onClick={() => void handleExistingAccount()}
              type="button"
              variant="outline"
            >
              {acceptInvitationMutation.isPending ? (
                <Spinner data-icon aria-hidden="true" />
              ) : (
                <UserCheck data-icon aria-hidden="true" />
              )}
              {m.staff_invitations__use_existing_account()}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
