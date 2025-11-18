import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase configuration for backend context");
}

const supabaseAdminClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authorizationHeader = opts.req.header("authorization") ?? opts.req.header("Authorization");
  let user: User | null = null;

  if (authorizationHeader?.startsWith("Bearer ")) {
    const token = authorizationHeader.slice(7).trim();
    if (token.length > 0) {
      try {
        const { data, error } = await supabaseAdminClient.auth.getUser(token);
        if (error) {
          console.error("Failed to verify user token", {
            message: error.message,
            status: error.status,
          });
        } else {
          user = data.user;
        }
      } catch (error) {
        console.error("Unexpected error while verifying token", error);
      }
    }
  }

  return {
    req: opts.req,
    supabase: supabaseAdminClient,
    user,
    supabaseUrl, // Media URL'leri için
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx });
});
