import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@tsu-stack/auth/react/auth-client";

// eslint-disable-next-line fsd/no-cross-slice-dependency, fsd/forbidden-imports
import { clearActiveSchoolSetupQueries, schoolAccessQueryKeys } from "@/entities/school-access/api";

import { staffInvitationQueryKeys } from "./list-user-invitations.query";

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { invitationId: string }) => {
      const result = await authClient.organization.acceptInvitation({
        invitationId: input.invitationId
      });

      if (!result.data) {
        throw new Error(result.error?.message ?? "Invitation could not be accepted.");
      }

      const organizationId = result.data.member.organizationId;

      if (organizationId) {
        const activeResult = await authClient.organization.setActive({
          organizationId
        });

        if (activeResult.error) {
          throw new Error(activeResult.error.message ?? "School could not be selected.");
        }

        clearActiveSchoolSetupQueries(queryClient);
      }

      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: schoolAccessQueryKeys.list() }),
        queryClient.invalidateQueries({ queryKey: staffInvitationQueryKeys.currentUser() })
      ]);
    }
  });
}

export type AcceptInvitationMutationResult = Awaited<
  ReturnType<typeof authClient.organization.acceptInvitation>
>["data"];
