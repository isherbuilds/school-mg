import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolAccessQueryKeys } from "@/shared/api/school-access/get-schools.query";

export function useCreateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.bootstrap.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: schoolAccessQueryKeys.list() });
        await queryClient.invalidateQueries({
          queryKey: orpc.school.setup.list.key({ input: {} })
        });
      }
    })
  );
}

export type CreateSchoolMutationResult = Awaited<ReturnType<typeof client.school.bootstrap.create>>;
