import { FetchCreateContextFnOptions } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { initTRPC, TRPCError } from "npm:@trpc/server@^11.7.1";
import superjson from "npm:superjson@^2.2.5";
import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@^2.81.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase configuration for Stripe Worker context");
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
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

