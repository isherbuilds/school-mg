import { type RouterClient } from "@orpc/server";

import { healthRouter } from "#@/routers/health/index";
import { privateRouter } from "#@/routers/private/index";
import { schoolRouter } from "#@/routers/school/index";

export const appRouter = {
  health: healthRouter,
  private: privateRouter,
  school: schoolRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
