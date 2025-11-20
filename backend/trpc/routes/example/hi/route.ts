import { publicProcedure } from "@/backend/trpc/create-context";

export default publicProcedure.query(() => {
  return { message: "Hello from Supabase Edge Functions!" };
});
