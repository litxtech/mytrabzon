// KYC Create Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";

const appRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(1),
        nationalId: z.string().min(1),
        birthDate: z.string(),
        country: z.string().optional(),
        city: z.string().optional(),
        email: z.string().email().optional(),
        documents: z.array(
          z.object({
            type: z.enum(["id_front", "id_back", "selfie", "selfie_with_id"]),
            fileUrl: z.string().url(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      
      if (!user) throw new Error("Unauthorized");
      
      const { data: existingRequest } = await supabase
        .from("kyc_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();
      
      if (existingRequest) {
        throw new Error("Zaten bekleyen bir kimlik doğrulama başvurunuz var");
      }
      
      const today = new Date();
      const dateStr = today
        .toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\./g, "-");
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const verificationCode = `MYTRABZON - ${dateStr} - KOD: ${randomCode}`;
      
      const { data: kycRequest, error: kycError } = await supabase
        .from("kyc_requests")
        .insert({
          user_id: user.id,
          status: "pending",
          full_name: input.fullName,
          national_id: input.nationalId,
          birth_date: input.birthDate,
          country: input.country,
          city: input.city,
          email: input.email,
          verification_code: verificationCode,
          code_generated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (kycError) throw new Error(kycError.message);
      
      const documents = input.documents.map((doc) => ({
        kyc_id: kycRequest.id,
        type: doc.type,
        file_url: doc.fileUrl,
      }));
      
      const { error: docsError } = await supabase
        .from("kyc_documents")
        .insert(documents);
      
      if (docsError) throw new Error(docsError.message);
      
      return {
        success: true,
        kycId: kycRequest.id,
        verificationCode,
      };
    }),
});

export type AppRouter = typeof appRouter;

serve(async (req) => {
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
  
  if (pathname.startsWith("/functions/v1/kyc-create")) {
    pathname = pathname.replace("/functions/v1/kyc-create", "");
  }
  
  if (!pathname.startsWith("/api/trpc")) {
    pathname = "/api/trpc" + (pathname.startsWith("/") ? pathname : "/" + pathname);
  }
  
  const normalizedUrl = new URL(pathname + url.search, url.origin);
  const normalizedReq = new Request(normalizedUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req: normalizedReq,
    createContext: () => createContext(normalizedReq),
    onError: ({ error, path }) => {
      console.error(`tRPC error on '${path}':`, error);
    },
  });
  
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  return response;
});

