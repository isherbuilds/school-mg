import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { clearActiveSchoolSetupQueries } from "./cache";
import { schoolAccessQueryKeys } from "./get-schools.query";

export function useCreateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.bootstrap.create.mutationOptions({
      onSuccess: async () => {
        clearActiveSchoolSetupQueries(queryClient);
        await queryClient.invalidateQueries({ queryKey: schoolAccessQueryKeys.list() });
      }
    })
  );
}

export type CreateSchoolMutationResult = Awaited<ReturnType<typeof client.school.bootstrap.create>>;
