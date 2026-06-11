import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { clearActiveSchoolSetupQueries } from "./cache";
import { schoolAccessQueryKeys } from "./get-schools.query";

export function useSelectSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.school.bootstrap.select.mutationOptions({
      onSuccess: async () => {
        clearActiveSchoolSetupQueries(queryClient);
        await queryClient.invalidateQueries({ queryKey: schoolAccessQueryKeys.list() });
      }
    })
  );
}

export type SelectSchoolMutationResult = Awaited<ReturnType<typeof client.school.bootstrap.select>>;
