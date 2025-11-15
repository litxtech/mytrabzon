// Create context for LazGPT Worker
// Deno runtime compatible

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { initTRPC, TRPCError } from "npm:@trpc/server@^11.7.1";
import superjson from "npm:superjson@^2.2.5";

export interface Context {
  supabase: ReturnType<typeof createClient>;
  user: any | null;
}

export async function createContext(req: Request): Promise<Context> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Get auth token from header
  const authHeader = req.headers.get("Authorization");
  let user = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          user = data.user;
        }
      } catch (error) {
        console.error("Error verifying token:", error);
      }
    }
  }

  return {
    supabase,
    user,
  };
}

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "Authentication required"
    });
  }
  return next({ ctx });
});

