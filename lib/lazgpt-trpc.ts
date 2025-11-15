// LazGPT tRPC Client
// Separate client for LazGPT Worker

import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

// LazGPT AppRouter type (will be imported from backend)
export type LazGPTAppRouter = any; // Will be properly typed later

export const lazgptTrpc = createTRPCReact<LazGPTAppRouter>();

const stripTrailingSlash = (url: string) => url.replace(/\/$/, "");

// Get LazGPT Worker URL
const getLazGPTBaseUrl = () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  
  if (!supabaseUrl) {
    console.warn("EXPO_PUBLIC_SUPABASE_URL not set, falling back to localhost");
    return "http://127.0.0.1:54321/functions/v1/lazgpt-worker";
  }
  
  const baseUrl = `${stripTrailingSlash(supabaseUrl)}/functions/v1/lazgpt-worker/api/trpc`;
  console.log("LazGPT Worker base URL", baseUrl);
  return baseUrl;
};

const lazgptBaseUrl = getLazGPTBaseUrl();

// Shared headers function
const getAuthHeaders = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn("Failed to get session for LazGPT tRPC header:", error.message);
      return {};
    }
    
    const token = data?.session?.access_token;

    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
  } catch (error) {
    console.error("Failed to attach Supabase auth header", error);
  }

  return {
    "Content-Type": "application/json",
  };
};

// LazGPT tRPC client
export const lazgptTrpcClient = lazgptTrpc.createClient({
  links: [
    httpLink({
      url: lazgptBaseUrl,
      transformer: superjson,
      async headers() {
        return await getAuthHeaders();
      },
    }),
  ],
});

