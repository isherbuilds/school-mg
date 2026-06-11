import { describe, expect, it } from "vitest";

import { isAcademicTermDateRangeInsideAcademicYear } from "#@/routers/school/setup/utils";

describe("school setup query utilities", () => {
  it("accepts academic term dates inside the selected academic year", () => {
    expect(
      isAcademicTermDateRangeInsideAcademicYear(
        {
          endDate: "2026-09-30",
          startDate: "2026-06-01"
        },
        {
          endDate: "2027-03-31",
          startDate: "2026-04-01"
        }
      )
    ).toBe(true);
  });

  it("rejects academic term dates outside the selected academic year", () => {
    expect(
      isAcademicTermDateRangeInsideAcademicYear(
        {
          endDate: "2027-04-01",
          startDate: "2026-06-01"
        },
        {
          endDate: "2027-03-31",
          startDate: "2026-04-01"
        }
      )
    ).toBe(false);
  });
});
