import { createFileRoute } from "@tanstack/react-router";

import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";

import { generateAppSeo } from "@/shared/lib/seo";

import { SchoolSetupPage, getSchoolSetupQueryOptions } from "@/pages/school-setup";
import { hasSchoolSetupErrorCode } from "@/pages/school-setup/lib/errors";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/school-setup/")({
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSchoolSetupQueryOptions()).catch((error) => {
      if (hasSchoolSetupErrorCode(error, "ACTIVE_ORGANIZATION_REQUIRED")) {
        throw redirect({
          to: "/schools/new"
        });
      }
    });
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
