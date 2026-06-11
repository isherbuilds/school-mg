import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type SchoolSetupListInput } from "@tsu-stack/core/school";

const defaultSchoolSetupInput: SchoolSetupListInput = {};

export const schoolSetupQueryKeys = {
  list(input: SchoolSetupListInput = defaultSchoolSetupInput) {
    return orpc.school.setup.list.key({ input });
  }
};

export function getSchoolSetupQueryOptions(input: SchoolSetupListInput = defaultSchoolSetupInput) {
  return orpc.school.setup.list.queryOptions({
    input
  });
}

export function useGetSchoolSetupQuery(input: SchoolSetupListInput = defaultSchoolSetupInput) {
  return useQuery(getSchoolSetupQueryOptions(input));
}

export type SchoolSetupQueryResult = Awaited<ReturnType<typeof client.school.setup.list>>;
