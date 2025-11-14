// Supabase Edge Function - tRPC Context Creator
// Deno compatible version

import { initTRPC, TRPCError } from "npm:@trpc/server@^11.7.1";
import superjson from "npm:superjson@^2.2.5";
import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

// Get Supabase configuration from environment
function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase configuration for backend context");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

const supabaseAdminClient = getSupabaseAdmin();

export interface Context {
  req: Request;
  supabase: SupabaseClient;
  user: User | null;
}

export const createContext = async (req: Request): Promise<Context> => {
  const authorizationHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  let user: User | null = null;

  // Authorization header yoksa bile context döndür (publicProcedure için)
  // Sadece protectedProcedure'lar user gerektirir
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
          // Token geçersizse user null kalır, ama context döndürülür
        } else {
          user = data?.user || null;
        }
      } catch (error) {
        console.error("Unexpected error while verifying token", error);
        // Hata olsa bile context döndürülür, user null kalır
      }
    }
  } else {
    // Authorization header yok - bu normal (publicProcedure için)
    // Sadece log atalım, hata fırlatmayalım
    console.log("No authorization header - using public context");
  }

  return {
    req,
    supabase: supabaseAdminClient,
    user,
  };
};

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
      message: "Authentication required. Please log in to access this resource."
    });
  }

  return next({ ctx });
});

