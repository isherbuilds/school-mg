import { schoolBootstrapRouter } from "#@/routers/school/bootstrap/index";
import { schoolSetupRouter } from "#@/routers/school/setup/index";

export const schoolRouter = {
  bootstrap: schoolBootstrapRouter,
  setup: schoolSetupRouter
};
