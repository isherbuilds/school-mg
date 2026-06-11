import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolSetupQueryKeys } from "@/pages/school-setup/api/get-school-setup.query";

export function updateAcademicYearMutationOptions() {
  return orpc.school.setup.academicYears.update.mutationOptions();
}

export function useUpdateAcademicYearMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.setup.academicYears.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: schoolSetupQueryKeys.list()
        });
      }
    })
  );
}

export type UpdateAcademicYearMutationResult = Awaited<
  ReturnType<typeof client.school.setup.academicYears.update>
>;
