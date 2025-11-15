// Stripe tRPC Client
// Separate client for Stripe Worker

import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

// Stripe AppRouter type
export type StripeAppRouter = any;

export const stripeTrpc = createTRPCReact<StripeAppRouter>();

const stripTrailingSlash = (url: string) => url.replace(/\/$/, "");

// Get Stripe Worker URL
const getStripeBaseUrl = () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  
  if (!supabaseUrl) {
    console.warn("EXPO_PUBLIC_SUPABASE_URL not set, falling back to localhost");
    return "http://127.0.0.1:54321/functions/v1/stripe-worker";
  }
  
  const baseUrl = `${stripTrailingSlash(supabaseUrl)}/functions/v1/stripe-worker/api/trpc`;
  if (__DEV__) {
    console.log("Stripe Worker base URL", baseUrl);
  }
  return baseUrl;
};

const stripeBaseUrl = getStripeBaseUrl();

// Shared headers function
const getAuthHeaders = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      if (__DEV__) {
        console.warn("Failed to get session for Stripe tRPC header:", error.message);
      }
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

// Stripe tRPC client
export const stripeTrpcClient = stripeTrpc.createClient({
  links: [
    httpLink({
      url: stripeBaseUrl,
      transformer: superjson,
      async headers() {
        return await getAuthHeaders();
      },
    }),
  ],
});

