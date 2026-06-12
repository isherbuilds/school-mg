import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { staffQueryKeys } from "@/pages/staff/api/get-staff.query";

export function updateStaffMemberMutationOptions() {
  return orpc.school.staff.update.mutationOptions();
}

export function useUpdateStaffMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.staff.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: staffQueryKeys.list()
        });
      }
    })
  );
}

export type UpdateStaffMemberMutationResult = Awaited<
  ReturnType<typeof client.school.staff.update>
>;
