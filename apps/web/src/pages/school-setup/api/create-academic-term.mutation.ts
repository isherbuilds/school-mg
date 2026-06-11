import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function createAcademicTermMutationOptions() {
  return orpc.school.setup.academicTerms.create.mutationOptions();
}

export function useCreateAcademicTermMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.academicTerms.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type CreateAcademicTermMutationResult = Awaited<
  ReturnType<typeof client.school.setup.academicTerms.create>
>;
