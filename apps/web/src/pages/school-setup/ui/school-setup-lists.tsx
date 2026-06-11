import { useState } from "react";

import { type SchoolSetupQueryResult } from "@/pages/school-setup/api/get-school-setup.query";
import { AcademicYearList } from "@/pages/school-setup/ui/academic-year-list";
import { GradeLevelList } from "@/pages/school-setup/ui/grade-level-list";
import { SectionList } from "@/pages/school-setup/ui/section-list";
import { SubjectList } from "@/pages/school-setup/ui/subject-list";

type EditingRecord = {
  id: string;
  kind: "academic-year" | "grade-level" | "section" | "subject";
} | null;

export function SetupLists({ setup }: { setup: SchoolSetupQueryResult }) {
  const [editingRecord, setEditingRecord] = useState<EditingRecord>(null);

  const isEditing = (kind: NonNullable<EditingRecord>["kind"], id: string) =>
    editingRecord?.kind === kind && editingRecord.id === id;

  const startEditing = (kind: NonNullable<EditingRecord>["kind"], id: string) => {
    setEditingRecord({ id, kind });
  };

  const stopEditing = () => setEditingRecord(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AcademicYearList
        academicYears={setup.academicYears}
        canManageSetup={setup.canManageSetup}
        isEditing={(id) => isEditing("academic-year", id)}
        onCancel={stopEditing}
        onEdit={(id) => startEditing("academic-year", id)}
      />
      <GradeLevelList
        canManageSetup={setup.canManageSetup}
        gradeLevels={setup.gradeLevels}
        isEditing={(id) => isEditing("grade-level", id)}
        onCancel={stopEditing}
        onEdit={(id) => startEditing("grade-level", id)}
      />
      <SubjectList
        canManageSetup={setup.canManageSetup}
        isEditing={(id) => isEditing("subject", id)}
        onCancel={stopEditing}
        onEdit={(id) => startEditing("subject", id)}
        subjects={setup.subjects}
      />
      <SectionList
        academicYears={setup.academicYears}
        canManageSetup={setup.canManageSetup}
        gradeLevels={setup.gradeLevels}
        isEditing={(id) => isEditing("section", id)}
        onCancel={stopEditing}
        onEdit={(id) => startEditing("section", id)}
        sections={setup.sections}
      />
    </div>
  );
}
