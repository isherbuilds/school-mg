import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { StaffPage, getStaffQueryOptions } from "@/pages/staff";

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)/staff/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(getStaffQueryOptions()).catch(() => undefined),
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/staff",
        locale: params.locale
      },
      robots: {
        follow: false,
        index: false
      },
      title: "Staff"
    }),
  component: StaffPage
});
