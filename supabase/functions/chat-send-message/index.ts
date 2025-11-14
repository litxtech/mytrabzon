// Chat Send Message Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";

const appRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        content: z.string(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(['image', 'video', 'audio', 'file']).optional(),
        replyTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const { data: member, error: memberError } = await ctx.supabase
        .from('chat_members')
        .select('*')
        .eq('room_id', input.roomId)
        .eq('user_id', userId)
        .single();

      if (memberError || !member) {
        throw new Error('Not a member of this room');
      }

      const { data: message, error } = await ctx.supabase
        .from('messages')
        .insert({
          room_id: input.roomId,
          user_id: userId,
          content: input.content,
          media_url: input.mediaUrl || null,
          media_type: input.mediaType || null,
          reply_to: input.replyTo || null,
        })
        .select('*, user:profiles(*)')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }

      await ctx.supabase
        .from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', input.roomId);

      return message;
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
  
  if (pathname.startsWith("/functions/v1/chat-send-message")) {
    pathname = pathname.replace("/functions/v1/chat-send-message", "");
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

