import { schoolBootstrapRouter } from "#@/routers/school/bootstrap/index";
import { schoolSetupRouter } from "#@/routers/school/setup/index";
import { schoolStaffRouter } from "#@/routers/school/staff/index";

export const schoolRouter = {
  bootstrap: schoolBootstrapRouter,
  setup: schoolSetupRouter,
  staff: schoolStaffRouter
};
