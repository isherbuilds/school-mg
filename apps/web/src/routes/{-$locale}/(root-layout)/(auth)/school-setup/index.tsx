import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { SchoolSetupPage, getSchoolSetupQueryOptions } from "@/pages/school-setup";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/school-setup/")({
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSchoolSetupQueryOptions());
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/school-setup",
        locale: params.locale
      },
      description: `Manage academic years, grade levels, subjects, and sections in ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "School Setup"
    }),
  component: SchoolSetupPage
});
