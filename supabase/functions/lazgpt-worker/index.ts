// LazGPT Worker - DeepSeek API Integration
// Karadeniz şivesiyle sohbet eden yapay zeka asistanı
// Deno runtime compatible

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";
import { TRPCError } from "npm:@trpc/server@^11.7.1";

// DeepSeek API Configuration
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

// Get API key from environment (don't throw error at module level)
function getDeepSeekApiKey(): string {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    console.warn("DEEPSEEK_API_KEY environment variable is not set");
    return ""; // Return empty string, will be checked in API call
  }
  return apiKey;
}

// LazGPT System Prompt
const LAZGPT_SYSTEM_PROMPT = `Sen LazGPT'sin, MyTrabzon uygulamasının Karadeniz şivesiyle konuşan yapay zeka asistanısın. 

Kişiliğin:
- Karadeniz (Trabzon) şivesiyle konuşursun (ama abartmadan, anlaşılır şekilde)
- Şapşal ama zeki bir karakterin var - bazen komik, bazen akıllıca cevaplar verirsin
- Kibar ama takılgan bir tarzın var - samimi ama saygılı, şakacı ama incitici değil
- Sohbetçi bir yapın var - kısa cevaplar verme, biraz sohbet et
- Karadeniz/Trabzon fıkraları anlatmayı seversin
- Uygulama hakkında bilgi verirsin
- Kullanıcılara yardımcı olursun

Konuşma tarzın:
- "Uşağum, ne istiyon bakalım? Anlat bakalım, dinliyorum ben seni"
- "Hadi anlatayım bi fıkra, gülersin belki. Trabzon'dan bi tane var, çok komik"
- "Uygulama hakkında bilgi mi istiyon? Anlatayım tabii, ne merak ediyon?"
- "Trabzon'umuzun güzelliklerini bilmek istiyon mu? Çok güzel yerlerimiz var"
- "Haha, güzel sormuşsun. Şimdi anlatayım bakalım"
- "Bak uşağum, şöyle bi şey var..."

Önemli:
- Kısa ve öz cevaplar ver, uzun paragraflar yazma
- Samimi ol ama saygılı kal
- Şapşal ama zeki ol - bazen komik, bazen ciddi
- Kibar ama takılgan - şakacı ama incitici değil
- Sohbetçi ol - kullanıcıyla sohbet et, sadece cevap verme
- Karadeniz şivesini kullan ama abartma, anlaşılır ol`;

// DeepSeek API çağrısı
async function callDeepSeekAPI(messages: { role: string; content: string }[]) {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is required");
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", errorText);
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Üzgünüm, cevap veremedim.";
  } catch (error) {
    console.error("DeepSeek API call error:", error);
    throw error;
  }
}

// LazGPT Router
const lazgptRouter = createTRPCRouter({
  // Sohbet mesajı gönder
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(1000),
        conversation_id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Konuşma geçmişini al (varsa)
      let conversationHistory: { role: string; content: string }[] = [
        { role: "system", content: LAZGPT_SYSTEM_PROMPT },
      ];

      if (input.conversation_id) {
        const { data: history } = await supabase
          .from("lazgpt_conversations")
          .select("messages")
          .eq("id", input.conversation_id)
          .eq("user_id", user.id)
          .single();

        if (history?.messages) {
          conversationHistory = [
            { role: "system", content: LAZGPT_SYSTEM_PROMPT },
            ...history.messages,
          ];
        }
      }

      // Kullanıcı mesajını ekle
      conversationHistory.push({
        role: "user",
        content: input.message,
      });

      // DeepSeek API'ye gönder
      const aiResponse = await callDeepSeekAPI(conversationHistory);

      let conversationId = input.conversation_id;

      if (conversationId) {
        // Mevcut konuşmayı güncelle
        const { data: existing } = await supabase
          .from("lazgpt_conversations")
          .select("messages")
          .eq("id", conversationId)
          .single();

        const updatedMessages = [
          ...(existing?.messages || []),
          { role: "user", content: input.message },
          { role: "assistant", content: aiResponse },
        ];

        await supabase
          .from("lazgpt_conversations")
          .update({
            messages: updatedMessages,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      } else {
        // Yeni konuşma oluştur
        const { data: newConversation, error } = await supabase
          .from("lazgpt_conversations")
          .insert({
            user_id: user.id,
            messages: [
              { role: "user", content: input.message },
              { role: "assistant", content: aiResponse },
            ],
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating conversation:", error);
        } else {
          conversationId = newConversation.id;
        }
      }

      return {
        response: aiResponse,
        conversation_id: conversationId,
      };
    }),

  // Konuşma geçmişini getir
  getConversation: protectedProcedure
    .input(
      z.object({
        conversation_id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const { data, error } = await supabase
        .from("lazgpt_conversations")
        .select("*")
        .eq("id", input.conversation_id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Konuşma bulunamadı",
        });
      }

      return data;
    }),

  // Tüm konuşmaları listele
  getConversations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const { data, error, count } = await supabase
        .from("lazgpt_conversations")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return {
        conversations: data || [],
        total: count || 0,
      };
    }),

  // Fıkra anlat (özel endpoint)
  tellJoke: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const jokePrompt = `Karadeniz/Trabzon fıkrası anlat. Kısa, komik ve Karadeniz şivesiyle anlat.`;

      const messages = [
        { role: "system", content: LAZGPT_SYSTEM_PROMPT },
        { role: "user", content: jokePrompt },
      ];

      const joke = await callDeepSeekAPI(messages);

      return {
        joke: joke,
      };
    }),

  // Uygulama hakkında bilgi ver
  getAppInfo: protectedProcedure
    .mutation(async () => {
      const infoPrompt = `MyTrabzon uygulaması hakkında kısa ve öz bilgi ver. Karadeniz şivesiyle, samimi bir dille anlat.`;

      const messages = [
        { role: "system", content: LAZGPT_SYSTEM_PROMPT },
        { role: "user", content: infoPrompt },
      ];

      const info = await callDeepSeekAPI(messages);

      return {
        info: info,
      };
    }),
});

const appRouter = createTRPCRouter({
  lazgpt: lazgptRouter,
});

export type AppRouter = typeof appRouter;

// Serve tRPC requests
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(req.url);
  let pathname = url.pathname;

  // Normalize pathname for lazgpt-worker
  // Remove function prefix if present, but keep the tRPC path
  if (pathname.startsWith("/functions/v1/lazgpt-worker")) {
    // Extract the tRPC path after the function prefix
    const trpcPath = pathname.replace("/functions/v1/lazgpt-worker", "");
    pathname = trpcPath || "/api/trpc";
  } else if (pathname.startsWith("/lazgpt-worker")) {
    // Extract the tRPC path after the function prefix
    const trpcPath = pathname.replace("/lazgpt-worker", "");
    pathname = trpcPath || "/api/trpc";
  }

  // Ensure pathname starts with /api/trpc
  if (!pathname.startsWith("/api/trpc")) {
    if (pathname === "/" || pathname === "") {
      pathname = "/api/trpc";
    } else if (pathname.startsWith("/")) {
      pathname = "/api/trpc" + pathname;
    } else {
      pathname = "/api/trpc/" + pathname;
    }
  }

  // Create normalized request - preserve query string and body
  const normalizedUrl = new URL(pathname + url.search, url.origin);
  const normalizedReq = new Request(normalizedUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  // Debug logging
  console.log('LazGPT Worker - Original path:', url.pathname);
  console.log('LazGPT Worker - Normalized path:', pathname);
  console.log('LazGPT Worker - Full URL:', normalizedUrl.toString());
  console.log('LazGPT Worker - Router keys:', Object.keys(appRouter._def?.record || {}));
  console.log('LazGPT Worker - Request method:', req.method);

  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      router: appRouter,
      req: normalizedReq,
      createContext: async () => await createContext(normalizedReq),
      onError: ({ error, path, type }) => {
        console.error(`LazGPT Worker tRPC error on '${path}':`, {
          code: error.code,
          message: error.message,
          type,
          path,
          routerKeys: Object.keys(appRouter._def?.record || {}),
        });
      },
    });

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return response;
  } catch (error) {
    console.error("LazGPT Worker error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
});

