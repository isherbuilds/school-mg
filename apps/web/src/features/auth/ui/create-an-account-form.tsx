import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";
import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "@/shared/ui/container";
import { LogoIcon } from "@/shared/ui/logo";

import { appConfig } from "@/config/app.config";

export function CreateAnAccountForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: NavigateTo }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending } = useAuth();

  const signUpMutation = useMutation({
    mutationFn: async (values: { email: string; name: string; password: string }) => {
      const result = await authClient.signUp.email({
        email: values.email,
        name: values.name,
        password: values.password
      });

      if (!result.data) {
        throw new Error(result.error?.message ?? m.auth__sign_up_failed());
      }

      return result.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || m.auth__sign_up_failed());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOptions());
      toast.success(m.auth__root_verification_required());
      await navigate({
        search: {
          redirect: redirectTo
        },
        to: "/sign-in"
      });
    }
  });

  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: ""
    },
    onSubmit: async ({ value }) => {
      const { email, name, password } = value;
      signUpMutation.mutate({ email, name, password });
    },
    validators: {
      onSubmit: z
        .object({
          confirmPassword: z.string(),
          email: z.email(m.auth__invalid_email()),
          name: z.string().min(2, m.auth__name_min_length()),
          password: z.string().min(8, m.auth__password_min_length())
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: m.auth__passwords_no_match(),
          path: ["confirmPassword"]
        })
    }
  });

  if (isPending) {
    return <Spinner />;
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
            <h1 className="text-xl font-bold">{m.auth__root_create_account_title()}</h1>
            <FieldDescription>{m.auth__root_create_account_description()}</FieldDescription>
          </div>

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

          <form.Field name="email">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{m.auth__email_label()}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={m.auth__email_placeholder()}
                  type="email"
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
              {signUpMutation.isPending ? m.auth__creating_account() : m.auth__create_account()}
            </Button>
          </Field>

          <FieldDescription className="text-center">
            {m.auth__already_have_account()}{" "}
            <Link to="/sign-in" search={{ redirect: redirectTo }}>
              {m.auth__sign_in_link()}
            </Link>
          </FieldDescription>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
