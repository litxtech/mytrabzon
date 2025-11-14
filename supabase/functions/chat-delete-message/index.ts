// Chat Delete Message Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";

const appRouter = createTRPCRouter({
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const { data: message, error: fetchError } = await ctx.supabase
        .from('messages')
        .select('*')
        .eq('id', input.messageId)
        .single();

      if (fetchError || !message) {
        throw new Error('Message not found');
      }

      if (message.user_id !== userId) {
        throw new Error('Not authorized to delete this message');
      }

      const { error } = await ctx.supabase
        .from('messages')
        .delete()
        .eq('id', input.messageId);

      if (error) {
        console.error('Error deleting message:', error);
        throw new Error('Failed to delete message');
      }

      return { success: true };
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
  
  if (pathname.startsWith("/functions/v1/chat-delete-message")) {
    pathname = pathname.replace("/functions/v1/chat-delete-message", "");
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

