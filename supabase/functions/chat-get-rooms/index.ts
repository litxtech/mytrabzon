// Chat Get Rooms Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";
import { TRPCError } from "npm:@trpc/server@^11.7.1";

const appRouter = createTRPCRouter({
  getRooms: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const { data: membershipRows, error: membershipError } = await ctx.supabase
        .from('chat_members')
        .select('room_id, unread_count, role, last_read_at')
        .eq('user_id', userId);

      if (membershipError) {
        console.error('Failed to fetch user chat memberships', membershipError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Chat odaları yüklenemedi: ${membershipError.message ?? 'Üyelik bilgisi alınamadı'}`,
        });
      }

      const memberships = (membershipRows ?? []) as any[];

      if (memberships.length === 0) {
        return [];
      }

      const membershipMap = memberships.reduce<Record<string, any>>((acc, membership) => {
        acc[membership.room_id] = membership;
        return acc;
      }, {});

      const roomIds = memberships.map((membership) => membership.room_id);

      const { data: roomsData, error: roomsError } = await ctx.supabase
        .from('chat_rooms')
        .select('id, name, avatar_url, type, district, last_message_at, created_by, created_at')
        .in('id', roomIds);

      if (roomsError) {
        console.error('Failed to fetch chat rooms list', roomsError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Chat odaları yüklenemedi: ${roomsError.message ?? 'Sohbet listesi alınamadı'}`,
        });
      }

      const sortedRooms = ((roomsData ?? []) as any[]).sort((a, b) => {
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return timeB - timeA;
      });

      const paginatedRooms = sortedRooms.slice(input.offset, input.offset + input.limit);

      const roomsWithLastMessage = await Promise.all(
        paginatedRooms.map(async (room) => {
          const { data: lastMessage } = await ctx.supabase
            .from('messages')
            .select('*, user:profiles(*)')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: memberRows } = await ctx.supabase
            .from('chat_members')
            .select('id, room_id, user_id, role, unread_count, last_read_at, joined_at, user:profiles(*)')
            .eq('room_id', room.id);

          const members = (memberRows ?? []) as any[];

          const otherUser = room.type === 'direct'
            ? members.find((member) => member.user_id !== userId)?.user ?? null
            : null;

          const membership = membershipMap[room.id];

          return {
            ...room,
            last_message: lastMessage ?? null,
            members,
            other_user: otherUser,
            unread_count: membership?.unread_count ?? 0,
          };
        })
      );

      return roomsWithLastMessage;
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
  
  if (pathname.startsWith("/functions/v1/chat-get-rooms")) {
    pathname = pathname.replace("/functions/v1/chat-get-rooms", "");
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
    onError: ({ error, path, type }) => {
      console.error(`tRPC error on '${path}':`, error);
    },
  });
  
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  return response;
});

