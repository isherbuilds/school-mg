import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StaffListInput } from "@tsu-stack/core/school";

const defaultStaffInput: StaffListInput = {};

export const staffQueryKeys = {
  list(input: StaffListInput = defaultStaffInput) {
    return orpc.school.staff.list.key({ input });
  }
};

export function getStaffQueryOptions(input: StaffListInput = defaultStaffInput) {
  return orpc.school.staff.list.queryOptions({
    input
  });
}

export function useGetStaffQuery(input: StaffListInput = defaultStaffInput) {
  return useQuery(getStaffQueryOptions(input));
}

export type StaffQueryResult = Awaited<ReturnType<typeof client.school.staff.list>>;
