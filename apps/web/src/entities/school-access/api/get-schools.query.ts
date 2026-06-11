import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export const schoolAccessQueryKeys = {
  list() {
    return orpc.school.bootstrap.list.key({ input: {} });
  }
};

export function getSchoolsQueryOptions() {
  return orpc.school.bootstrap.list.queryOptions({
    input: {}
  });
}

export function useGetSchoolsQuery() {
  return useQuery(getSchoolsQueryOptions());
}

export type SchoolsQueryResult = Awaited<ReturnType<typeof client.school.bootstrap.list>>;
