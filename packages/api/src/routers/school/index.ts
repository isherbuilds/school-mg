import { schoolBootstrapRouter } from "#@/routers/school/bootstrap/index";
import { schoolSetupRouter } from "#@/routers/school/setup/index";
import { schoolStaffAccessRouter } from "#@/routers/school/staff-access/index";
import { schoolStaffRouter } from "#@/routers/school/staff/index";

export const schoolRouter = {
  bootstrap: schoolBootstrapRouter,
  setup: schoolSetupRouter,
  staffAccess: schoolStaffAccessRouter,
  staff: schoolStaffRouter
};
