// Chat Add Reaction Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";

const appRouter = createTRPCRouter({
  addReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const { data: message } = await ctx.supabase
        .from('messages')
        .select('room_id')
        .eq('id', input.messageId)
        .single();

      if (!message) {
        throw new Error('Message not found');
      }

      const { data: member } = await ctx.supabase
        .from('chat_members')
        .select('*')
        .eq('room_id', message.room_id)
        .eq('user_id', userId)
        .single();

      if (!member) {
        throw new Error('Not a member of this room');
      }

      const { data: existingReaction } = await ctx.supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', input.messageId)
        .eq('user_id', userId)
        .eq('emoji', input.emoji)
        .single();

      if (existingReaction) {
        const { error } = await ctx.supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw new Error('Failed to remove reaction');
        
        return { removed: true };
      }

      const { error } = await ctx.supabase
        .from('message_reactions')
        .insert({
          message_id: input.messageId,
          user_id: userId,
          emoji: input.emoji,
        });

      if (error) {
        console.error('Error adding reaction:', error);
        throw new Error('Failed to add reaction');
      }

      return { added: true };
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
  
  if (pathname.startsWith("/functions/v1/chat-add-reaction")) {
    pathname = pathname.replace("/functions/v1/chat-add-reaction", "");
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

