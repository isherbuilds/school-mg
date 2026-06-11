import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function createSectionMutationOptions() {
  return orpc.school.setup.sections.create.mutationOptions();
}

export function useCreateSectionMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.sections.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type CreateSectionMutationResult = Awaited<
  ReturnType<typeof client.school.setup.sections.create>
>;
