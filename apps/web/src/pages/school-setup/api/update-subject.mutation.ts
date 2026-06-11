import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function updateSubjectMutationOptions() {
  return orpc.school.setup.subjects.update.mutationOptions();
}

export function useUpdateSubjectMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.subjects.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type UpdateSubjectMutationResult = Awaited<
  ReturnType<typeof client.school.setup.subjects.update>
>;
