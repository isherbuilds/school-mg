import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { staffQueryKeys } from "@/pages/staff/api/get-staff.query";

export function createStaffMemberMutationOptions() {
  return orpc.school.staff.create.mutationOptions();
}

export function useCreateStaffMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.staff.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: staffQueryKeys.list()
        });
      }
    })
  );
}

export type CreateStaffMemberMutationResult = Awaited<
  ReturnType<typeof client.school.staff.create>
>;
