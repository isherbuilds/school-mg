import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { staffQueryKeys } from "@/pages/staff/api/get-staff.query";

export function revokeStaffAccessMutationOptions() {
  return orpc.school.staffAccess.revoke.mutationOptions();
}

export function useRevokeStaffAccessMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.staffAccess.revoke.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: staffQueryKeys.list()
        });
      }
    })
  );
}

export type RevokeStaffAccessMutationResult = Awaited<
  ReturnType<typeof client.school.staffAccess.revoke>
>;
