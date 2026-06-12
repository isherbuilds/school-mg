import { createFileRoute } from "@tanstack/react-router";

import { m } from "@tsu-stack/i18n/messages";

import { generateAppSeo } from "@/shared/lib/seo";

import { getInvitationPreviewQueryOptions } from "@/entities/staff-invitations";

import { AcceptInvitationForm } from "@/features/auth";

export const Route = createFileRoute(
  "/{-$locale}/(centered-layout)/accept-invitation/$invitationId/"
)({
  beforeLoad: async ({ context, params }) => {
    await context.queryClient
      .ensureQueryData(getInvitationPreviewQueryOptions(params.invitationId))
      .catch(() => undefined);
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/accept-invitation/${params.invitationId}`,
        locale: params.locale
      },
      robots: {
        follow: false,
        index: false
      },
      title: m.staff_invitations__accept_title()
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { invitationId } = Route.useParams();

  return <AcceptInvitationForm invitationId={invitationId} />;
}
