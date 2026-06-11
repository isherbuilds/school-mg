type AcademicTermDateRange = {
  endDate: string;
  startDate: string;
};

export class AcademicTermDateRangeError extends Error {
  constructor() {
    super("Academic term dates must stay inside the selected academic year.");
    this.name = "AcademicTermDateRangeError";
  }
}

export class SchoolSetupReferenceError extends Error {
  constructor() {
    super("School setup reference does not belong to the active organization.");
    this.name = "SchoolSetupReferenceError";
  }
}

export function isAcademicTermDateRangeInsideAcademicYear(
  term: AcademicTermDateRange,
  academicYear: AcademicTermDateRange
): boolean {
  return term.startDate >= academicYear.startDate && term.endDate <= academicYear.endDate;
}
