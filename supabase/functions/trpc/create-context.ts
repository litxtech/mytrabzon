// Supabase Edge Function - tRPC Context Creator
// Deno compatible version

import { initTRPC, TRPCError } from "npm:@trpc/server@^11.7.1";
import superjson from "npm:superjson@^2.2.5";
import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2";

// Get Supabase configuration from environment
function getSupabaseAdmin(): SupabaseClient {
  // Supabase Edge Functions'ta otomatik olarak sağlanan environment değişkenleri
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl) {
    console.error("❌ SUPABASE_URL environment variable is missing!");
    throw new Error("Missing SUPABASE_URL environment variable. Please set it in Supabase Dashboard > Edge Functions > Secrets");
  }

  if (!supabaseServiceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is missing!");
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please set it in Supabase Dashboard > Edge Functions > Secrets");
  }

  console.log("✅ Supabase admin client initialized");
  console.log("   URL:", supabaseUrl);
  console.log("   Key:", supabaseServiceRoleKey ? `***${supabaseServiceRoleKey.slice(-4)}` : "MISSING");

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

let supabaseAdminClient: SupabaseClient | null = null;

try {
  supabaseAdminClient = getSupabaseAdmin();
} catch (error) {
  console.error("❌ Failed to initialize Supabase admin client:", error);
  // Edge Function başlatılırken hata olursa, ilk request'te tekrar deneyecek
}

export interface Context {
  req: Request;
  supabase: SupabaseClient;
  user: User | null;
}

export const createContext = async (req: Request): Promise<Context> => {
  // Eğer admin client başlatılamadıysa, tekrar dene
  if (!supabaseAdminClient) {
    try {
      supabaseAdminClient = getSupabaseAdmin();
    } catch (error) {
      console.error("❌ Failed to initialize Supabase admin client in createContext:", error);
      throw new Error("Backend configuration error. Please check Edge Functions secrets.");
    }
  }

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
    if (Deno.env.get("DENO_ENV") === "development") {
      console.log("No authorization header - using public context");
    }
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

