import { queryOptions, useQuery } from "@tanstack/react-query";

import { authClient } from "@tsu-stack/auth/react/auth-client";

export const staffInvitationQueryKeys = {
  currentUser() {
    return ["staff-invitations", "current-user"] as const;
  }
};

export function listUserInvitationsQueryOptions() {
  return queryOptions({
    queryKey: staffInvitationQueryKeys.currentUser(),
    queryFn: async () => {
      const result = await authClient.organization.listUserInvitations();

      if (!result.data) {
        throw new Error(result.error?.message ?? "Pending invitations could not be loaded.");
      }

      return result.data;
    }
  });
}

export function useListUserInvitationsQuery() {
  return useQuery(listUserInvitationsQueryOptions());
}

export type UserInvitationsQueryResult = Awaited<
  ReturnType<typeof authClient.organization.listUserInvitations>
>["data"];
export type UserInvitation = NonNullable<UserInvitationsQueryResult>[number];
