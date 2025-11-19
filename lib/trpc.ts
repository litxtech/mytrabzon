import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
// AppRouter type - Backend'deki type'ı kullan (Supabase Edge Function'dan export edilen type ile uyumlu)
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

const stripTrailingSlash = (url: string) => url.replace(/\/$/, "");

// Get Supabase Edge Function URL for main app
const getBaseUrl = () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  
  if (!supabaseUrl) {
    // Sessizce localhost'a dön, uyarı yok
    return "http://127.0.0.1:54321/functions/v1/trpc";
  }
  
  // Supabase Edge Functions URL format:
  // https://[project-ref].supabase.co/functions/v1/[function-name]
  // tRPC endpoint path'i boş string olduğu için, base URL'e /api/trpc eklememiz gerekiyor
  const baseUrl = `${stripTrailingSlash(supabaseUrl)}/functions/v1/trpc/api/trpc`;
  if (__DEV__) {
    console.log("tRPC base URL (Supabase Edge Functions)", baseUrl);
  }
  return baseUrl;
};

// Get Admin Worker URL
const getAdminBaseUrl = () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  
  if (!supabaseUrl) {
    // Sessizce localhost'a dön, uyarı yok
    return "http://127.0.0.1:54321/functions/v1/admin-worker";
  }
  
  const baseUrl = `${stripTrailingSlash(supabaseUrl)}/functions/v1/admin-worker/api/trpc`;
  if (__DEV__) {
    console.log("Admin Worker base URL", baseUrl);
  }
  return baseUrl;
};

const baseUrl = getBaseUrl();
const adminBaseUrl = getAdminBaseUrl();

// Shared headers function
const getAuthHeaders = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn("Failed to get session for tRPC header:", error.message);
      return {};
    }
    
    const token = data?.session?.access_token;

    if (token) {
      if (__DEV__) {
        console.log("✅ Adding auth token to tRPC request");
      }
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    } else {
      if (__DEV__) {
        console.warn("⚠️ No auth token available - request will be unauthenticated");
      }
    }
  } catch (error) {
    console.error("Failed to attach Supabase auth header", error);
  }

  return {
    "Content-Type": "application/json",
  };
};

// Main app tRPC client
export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: baseUrl,
      transformer: superjson,
      async headers() {
        const headers = await getAuthHeaders();
        if (__DEV__) {
          console.log('📤 tRPC Request URL:', baseUrl);
          console.log('📤 tRPC Headers:', { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'YOK' });
        }
        return headers;
      },
      fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
        try {
          if (__DEV__) {
            console.log('🌐 tRPC Fetch:', url.toString());
            console.log('🌐 tRPC Method:', options?.method || 'GET');
          }
          
          const response = await fetch(url, options);
          
          if (!response.ok) {
            const errorClone = response.clone();
            const errorText = await errorClone.text();
            console.error('❌ tRPC Response Error:', {
              status: response.status,
              statusText: response.statusText,
              url: url.toString(),
              error: errorText.substring(0, 500),
            });
            
            // Hata loglanıyor ama gereksiz uyarılar kaldırıldı
          } else if (__DEV__) {
            console.log('✅ tRPC Response OK:', response.status);
          }
          
          return response;
        } catch (error) {
          console.error('❌ tRPC Network Error:', error);
          console.error('   URL:', url.toString());
          if (error instanceof Error) {
            console.error('   Message:', error.message);
          }
          throw error;
        }
      },
    }),
  ],
});

// Admin Worker tRPC client
export const adminTrpcClient = trpc.createClient({
  links: [
    httpLink({
      url: adminBaseUrl,
      transformer: superjson,
      async headers() {
        return await getAuthHeaders();
      },
    }),
  ],
});
