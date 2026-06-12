import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export const staffInvitationPreviewQueryKeys = {
  byId(invitationId: string) {
    return orpc.school.staffAccess.preview.key({
      input: {
        invitationId
      }
    });
  }
};

export function getInvitationPreviewQueryOptions(invitationId: string) {
  return orpc.school.staffAccess.preview.queryOptions({
    input: {
      invitationId
    }
  });
}

export function useInvitationPreviewQuery(invitationId: string) {
  return useQuery(getInvitationPreviewQueryOptions(invitationId));
}

export type InvitationPreviewQueryResult = Awaited<
  ReturnType<typeof client.school.staffAccess.preview>
>;
