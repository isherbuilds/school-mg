import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function updateGradeLevelMutationOptions() {
  return orpc.school.setup.gradeLevels.update.mutationOptions();
}

export function useUpdateGradeLevelMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.gradeLevels.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type UpdateGradeLevelMutationResult = Awaited<
  ReturnType<typeof client.school.setup.gradeLevels.update>
>;
