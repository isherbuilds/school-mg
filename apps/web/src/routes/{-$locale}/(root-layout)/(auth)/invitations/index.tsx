import { createFileRoute } from "@tanstack/react-router";

import { m } from "@tsu-stack/i18n/messages";

import { generateAppSeo } from "@/shared/lib/seo";

import { listUserInvitationsQueryOptions } from "@/entities/staff-invitations";

import { InvitationsPage } from "@/pages/invitations";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/invitations/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(listUserInvitationsQueryOptions());
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/invitations",
        locale: params.locale
      },
      robots: {
        follow: false,
        index: false
      },
      title: m.staff_invitations__title()
    }),
  component: InvitationsPage
});
