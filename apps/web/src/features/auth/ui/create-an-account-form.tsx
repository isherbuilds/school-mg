import { UserPlus } from "lucide-react";

import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import { FieldDescription } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "@/shared/ui/container";
import { LogoIcon } from "@/shared/ui/logo";

import { appConfig } from "@/config/app.config";

export function CreateAnAccountForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: NavigateTo }) {
  return (
    <Container className={cn("flex max-w-md flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
          <span className="sr-only">{appConfig.site.shortName}</span>
        </Link>
      </div>

      <Empty className="min-h-[360px]">
        <EmptyMedia variant="icon">
          <UserPlus aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{m.auth__invitation_required_title()}</EmptyTitle>
          <EmptyDescription>{m.auth__invitation_required_description()}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-wrap justify-center gap-2">
          <Button asChild light="skeuomorphic">
            <Link to="/sign-in" search={{ redirect: redirectTo }}>
              {m.auth__sign_in_link()}
            </Link>
          </Button>
        </EmptyContent>
      </Empty>

      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
