import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { createSchoolSetupMutation } from "@/pages/school-setup/api/mutation-factory";

const {
  mutationOptions: updateAcademicYearMutationOptions,
  useMutation: useUpdateAcademicYearMutation
} = createSchoolSetupMutation(orpc.school.setup.academicYears.update.mutationOptions);

export { updateAcademicYearMutationOptions, useUpdateAcademicYearMutation };

export type UpdateAcademicYearMutationResult = Awaited<
  ReturnType<typeof client.school.setup.academicYears.update>
>;
