import { Building2, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
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
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { Container } from "@/shared/ui/container";

import {
  type UserInvitation,
  useAcceptInvitationMutation,
  useListUserInvitationsQuery
} from "@/entities/staff-invitations";

function formatInvitationDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return m.staff_invitations__unknown_expiry();
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(date);
}

function getInvitationSchoolName(invitation: UserInvitation) {
  return invitation.organizationName ?? invitation.organizationId;
}

export function InvitationsPage() {
  const navigate = useNavigate();
  const invitationsQuery = useListUserInvitationsQuery();
  const acceptInvitationMutation = useAcceptInvitationMutation();
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null);

  const handleAccept = async (invitationId: string) => {
    if (pendingInvitationId !== null) {
      return;
    }

    try {
      setPendingInvitationId(invitationId);
      await acceptInvitationMutation.mutateAsync({ invitationId });
      toast.success(m.staff_invitations__accepted());
      await navigate({ to: "/school-setup" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.staff_invitations__accept_failed());
    } finally {
      setPendingInvitationId(null);
    }
  };

  if (invitationsQuery.isPending) {
    return (
      <Container className="flex justify-center py-10">
        <Spinner />
      </Container>
    );
  }

  if (invitationsQuery.isError || !invitationsQuery.data) {
    return (
      <Container className="py-8">
        <Empty className="min-h-[420px]">
          <EmptyMedia variant="icon">
            <Building2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{m.staff_invitations__list_unavailable_title()}</EmptyTitle>
            <EmptyDescription>
              {m.staff_invitations__list_unavailable_description()}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => void invitationsQuery.refetch()} variant="outline">
              <RefreshCw data-icon aria-hidden="true" />
              {m.staff_invitations__retry()}
            </Button>
          </EmptyContent>
        </Empty>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <section className="rounded-md border bg-background">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium text-muted-foreground">
            {m.staff_invitations__eyebrow()}
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-normal md:text-4xl">
            {m.staff_invitations__title()}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            {m.staff_invitations__description()}
          </p>
        </div>

        <div className="grid gap-2 p-4">
          {invitationsQuery.data.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {m.staff_invitations__empty()}
            </div>
          ) : (
            invitationsQuery.data.map((invitation) => {
              const isPending = pendingInvitationId === invitation.id;
              const isAnyAcceptInProgress = pendingInvitationId !== null;

              return (
                <div
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={invitation.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getInvitationSchoolName(invitation)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.staff_invitations__expires_at({
                        date: formatInvitationDate(invitation.expiresAt)
                      })}
                    </p>
                  </div>
                  <Button
                    disabled={isAnyAcceptInProgress}
                    onClick={() => void handleAccept(invitation.id)}
                    size="sm"
                  >
                    {isPending ? (
                      <Spinner data-icon aria-hidden="true" />
                    ) : (
                      <Check data-icon aria-hidden="true" />
                    )}
                    {m.staff_invitations__accept()}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </Container>
  );
}
