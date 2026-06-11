import { createFileRoute } from "@tanstack/react-router";

import { m } from "@tsu-stack/i18n/messages";

import { generateAppSeo } from "@/shared/lib/seo";

import { SchoolBootstrapPage, getSchoolsQueryOptions } from "@/pages/school-bootstrap";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/schools/new/")({
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSchoolsQueryOptions()).catch(() => undefined);
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/schools/new",
        locale: params.locale
      },
      robots: {
        follow: false,
        index: false
      },
      title: m.school_bootstrap_page__title()
    }),
  component: SchoolBootstrapPage
});
