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
    if (__DEV__) {
      console.warn('⚠️ EXPO_PUBLIC_SUPABASE_URL eksik! Localhost kullanılıyor.');
      console.warn('⚠️ Lütfen .env dosyasında EXPO_PUBLIC_SUPABASE_URL tanımlayın.');
    }
    // Localhost fallback (sadece development için)
    return "http://127.0.0.1:54321/functions/v1/trpc/api/trpc";
  }
  
  // Supabase Edge Functions URL format:
  // https://[project-ref].supabase.co/functions/v1/[function-name]
  // tRPC endpoint path'i boş string olduğu için, base URL'e /api/trpc eklememiz gerekiyor
  const baseUrl = `${stripTrailingSlash(supabaseUrl)}/functions/v1/trpc/api/trpc`;
  if (__DEV__) {
    console.log("✅ tRPC base URL (Supabase Edge Functions)", baseUrl);
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
    // Supabase instance kontrolü
    if (!supabase || !supabase.auth) {
      console.warn("⚠️ Supabase instance not available");
      return {
        "Content-Type": "application/json",
      };
    }

    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn("⚠️ Failed to get session for tRPC header:", error.message);
      return {
        "Content-Type": "application/json",
      };
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
  } catch (error: any) {
    // Hata yönetimi - sessizce devam et, sadece log
    console.error("❌ Failed to attach Supabase auth header:", error?.message || error);
    // Hata durumunda bile Content-Type header'ını döndür
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
            let errorText = '';
            try {
              errorText = await errorClone.text();
            } catch (e) {
              errorText = 'Hata mesajı okunamadı';
            }
            
            // Daha kullanıcı dostu hata mesajları
            let userFriendlyError = '';
            
            // WORKER_LIMIT hatası kontrolü (status 546 veya error text'te)
            // Nested JSON'u da kontrol et (error field içinde JSON string olabilir)
            let parsedErrorJson: any = null;
            try {
              parsedErrorJson = JSON.parse(errorText);
              // Nested error field'ı da kontrol et
              if (parsedErrorJson.error && typeof parsedErrorJson.error === 'string') {
                try {
                  const nestedError = JSON.parse(parsedErrorJson.error);
                  parsedErrorJson.error = nestedError;
                } catch (e) {
                  // Nested parse başarısız, devam et
                }
              }
            } catch (e) {
              // Parse başarısız, devam et
            }
            
            const isWorkerLimitError = 
              response.status === 546 ||
              errorText.includes('WORKER_LIMIT') ||
              errorText.includes('compute resources') ||
              errorText.includes('not having enough compute') ||
              parsedErrorJson?.error?.code === 'WORKER_LIMIT' ||
              parsedErrorJson?.error?.message?.includes('WORKER_LIMIT') ||
              parsedErrorJson?.code === 'WORKER_LIMIT' ||
              parsedErrorJson?.message?.includes('WORKER_LIMIT');
            
            if (isWorkerLimitError) {
              userFriendlyError = 'Sunucu yoğun. Lütfen birkaç dakika sonra tekrar deneyin veya daha küçük bir video seçin.';
            } else if (response.status === 404) {
              userFriendlyError = 'Veri bulunamadı';
            } else if (response.status === 401 || response.status === 403) {
              // 401/403 hatalarını sessizce handle et (özellikle public endpoint'ler için)
              // Eğer URL'de "getPolicies" veya "getRequiredPolicies" varsa, sessizce devam et
              const urlString = url.toString();
              const isPublicPolicyEndpoint = urlString.includes('getPolicies') || urlString.includes('getRequiredPolicies');
              
              if (isPublicPolicyEndpoint) {
                // Public policy endpoint'leri için sessizce devam et
                if (__DEV__) {
                  console.log('ℹ️ Public policy endpoint - 401 hatası sessizce handle edildi');
                }
                // Boş bir response döndür (query sessizce başarısız olacak)
                return new Response(JSON.stringify({ data: [] }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                });
              }
              
              userFriendlyError = 'Yetkisiz erişim. Lütfen tekrar giriş yapın.';
            } else if (response.status >= 500) {
              // tRPC hatasından mesaj çıkarmaya çalış
              if (parsedErrorJson) {
                // WORKER_LIMIT kontrolü JSON içinde de yap (zaten yukarıda kontrol edildi ama tekrar kontrol)
                if (parsedErrorJson.error?.code === 'WORKER_LIMIT' || 
                    parsedErrorJson.error?.message?.includes('WORKER_LIMIT') ||
                    parsedErrorJson.code === 'WORKER_LIMIT' ||
                    parsedErrorJson.message?.includes('WORKER_LIMIT')) {
                  userFriendlyError = 'Sunucu yoğun. Lütfen birkaç dakika sonra tekrar deneyin veya daha küçük bir video seçin.';
                } else if (parsedErrorJson.error?.message) {
                  userFriendlyError = parsedErrorJson.error.message;
                } else if (parsedErrorJson.message) {
                  userFriendlyError = parsedErrorJson.message;
                } else {
                  userFriendlyError = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
                }
              } else {
                // JSON parse başarısız, genel mesaj kullan
                userFriendlyError = `Sunucu hatası. Lütfen daha sonra tekrar deneyin.`;
              }
            } else if (response.status === 0 || response.statusText === 'Failed to fetch') {
              userFriendlyError = 'İnternet bağlantınızı kontrol edin';
            } else {
              // tRPC hatasından mesaj çıkarmaya çalış
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error?.message) {
                  userFriendlyError = errorJson.error.message;
                } else if (errorJson.message) {
                  userFriendlyError = errorJson.message;
                }
              } catch (e) {
                // JSON parse başarısız, genel mesaj kullan
                userFriendlyError = `Sunucu hatası (${response.status})`;
              }
            }
            
            console.error('❌ tRPC Response Error:', {
              status: response.status,
              statusText: response.statusText,
              url: url.toString(),
              userFriendlyError,
              error: errorText.substring(0, 500),
            });
            
            // Hata mesajını response'a ekle (kullanıcıya gösterilecek)
            const errorResponse = new Response(JSON.stringify({
              error: {
                message: userFriendlyError || `Sunucu hatası (${response.status})`,
                code: response.status,
              }
            }), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
            return errorResponse;
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
