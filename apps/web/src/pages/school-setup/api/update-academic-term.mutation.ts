import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function updateAcademicTermMutationOptions() {
  return orpc.school.setup.academicTerms.update.mutationOptions();
}

export function useUpdateAcademicTermMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.academicTerms.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type UpdateAcademicTermMutationResult = Awaited<
  ReturnType<typeof client.school.setup.academicTerms.update>
>;
