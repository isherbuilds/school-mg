import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { schoolAccessQueryKeys } from "@/shared/api/school-access/get-schools.query";

export function useSelectSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.bootstrap.select.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: schoolAccessQueryKeys.list() });
        await queryClient.invalidateQueries({
          queryKey: orpc.school.setup.list.key({ input: {} })
        });
      }
    })
  );
}

export type SelectSchoolMutationResult = Awaited<ReturnType<typeof client.school.bootstrap.select>>;
