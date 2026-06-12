import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { staffQueryKeys } from "@/pages/staff/api/get-staff.query";

export function grantStaffAccessMutationOptions() {
  return orpc.school.staffAccess.grant.mutationOptions();
}

export function useGrantStaffAccessMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.staffAccess.grant.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: staffQueryKeys.list()
        });
      }
    })
  );
}

export type GrantStaffAccessMutationResult = Awaited<
  ReturnType<typeof client.school.staffAccess.grant>
>;
