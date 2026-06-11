import { type QueryClient } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function clearActiveSchoolSetupQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: orpc.school.setup.list.key() });
}
