import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function updateSectionMutationOptions() {
  return orpc.school.setup.sections.update.mutationOptions();
}

export function useUpdateSectionMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.sections.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type UpdateSectionMutationResult = Awaited<
  ReturnType<typeof client.school.setup.sections.update>
>;
