import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { requestAccountDeletionProcedure } from "./routes/user/request-deletion/route";
import { cancelAccountDeletionProcedure } from "./routes/user/cancel-deletion/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  user: createTRPCRouter({
    requestAccountDeletion: requestAccountDeletionProcedure,
    cancelAccountDeletion: cancelAccountDeletionProcedure,
  }),
});

export type AppRouter = typeof appRouter;
