import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function createAcademicYearMutationOptions() {
  return orpc.school.setup.academicYears.create.mutationOptions();
}

export function useCreateAcademicYearMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.academicYears.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type CreateAcademicYearMutationResult = Awaited<
  ReturnType<typeof client.school.setup.academicYears.create>
>;
