import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function createGradeLevelMutationOptions() {
  return orpc.school.setup.gradeLevels.create.mutationOptions();
}

export function useCreateGradeLevelMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.gradeLevels.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type CreateGradeLevelMutationResult = Awaited<
  ReturnType<typeof client.school.setup.gradeLevels.create>
>;
