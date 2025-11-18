import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

interface RawMembership {
  room_id: string;
  unread_count: number;
  role: 'admin' | 'member';
  last_read_at: string | null;
}

interface RawRoom {
  id: string;
  name: string | null;
  avatar_url: string | null;
  type: 'direct' | 'group' | 'district';
  district: string | null;
  last_message_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface RawMemberWithProfile {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  unread_count: number;
  last_read_at: string | null;
  joined_at: string;
  user: unknown;
}

export const getRoomsProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    // Log kaldırıldı - egress optimizasyonu

    const { data: membershipRows, error: membershipError } = await ctx.supabase
      .from('chat_members')
      .select('room_id, unread_count, role, last_read_at')
      .eq('user_id', userId);

    if (membershipError) {
      console.error('Failed to fetch user chat memberships', {
        message: membershipError.message,
        details: membershipError.details,
        hint: membershipError.hint,
        code: membershipError.code,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Chat odaları yüklenemedi: ${membershipError.message ?? 'Üyelik bilgisi alınamadı'}`,
      });
    }

    const memberships = (membershipRows ?? []) as RawMembership[];

    if (memberships.length === 0) {
      console.log('No chat memberships found for user', { userId });
      return [];
    }

    const membershipMap = memberships.reduce<Record<string, RawMembership>>((acc, membership) => {
      acc[membership.room_id] = membership;
      return acc;
    }, {});

    const roomIds = memberships.map((membership) => membership.room_id);

    const { data: roomsData, error: roomsError } = await ctx.supabase
      .from('chat_rooms')
      .select('id, name, avatar_url, type, district, last_message_at, created_by, created_at')
      .in('id', roomIds);

    if (roomsError) {
      console.error('Failed to fetch chat rooms list', {
        message: roomsError.message,
        details: roomsError.details,
        hint: roomsError.hint,
        code: roomsError.code,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Chat odaları yüklenemedi: ${roomsError.message ?? 'Sohbet listesi alınamadı'}`,
      });
    }

    const sortedRooms = ((roomsData ?? []) as RawRoom[]).sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });

    const paginatedRooms = sortedRooms.slice(input.offset, input.offset + input.limit);

    // Optimize: Tüm last message'ları tek query'de al
    const roomIds = paginatedRooms.map(r => r.id);
    const { data: lastMessagesData } = await ctx.supabase
      .from('messages')
      .select('room_id, id, content, created_at, user:profiles(id, full_name, avatar_url)')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false });

    // Her room için en son mesajı bul
    const lastMessagesMap = new Map<string, any>();
    const processedRooms = new Set<string>();
    (lastMessagesData || []).forEach((msg: any) => {
      if (!processedRooms.has(msg.room_id)) {
        lastMessagesMap.set(msg.room_id, {
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          user: msg.user ? {
            id: msg.user.id,
            full_name: msg.user.full_name,
            avatar_url: msg.user.avatar_url,
          } : null,
        });
        processedRooms.add(msg.room_id);
      }
    });

    // Optimize: Tüm members'ları tek query'de al
    const { data: allMembersData } = await ctx.supabase
      .from('chat_members')
      .select('room_id, user_id, role, user:profiles(id, full_name, avatar_url, username)')
      .in('room_id', roomIds);

    // Room'a göre members'ları grupla
    const membersMap = new Map<string, any[]>();
    (allMembersData || []).forEach((member: any) => {
      if (!membersMap.has(member.room_id)) {
        membersMap.set(member.room_id, []);
      }
      membersMap.get(member.room_id)!.push({
        user_id: member.user_id,
        role: member.role,
        user: member.user ? {
          id: member.user.id,
          full_name: member.user.full_name,
          avatar_url: member.user.avatar_url,
          username: member.user.username,
        } : null,
      });
    });

    // Minimal response oluştur
    const roomsWithLastMessage = paginatedRooms.map((room) => {
      const members = membersMap.get(room.id) || [];
      const otherUser = room.type === 'direct'
        ? members.find((member: any) => member.user_id !== userId)?.user ?? null
        : null;
      const membership = membershipMap[room.id];

      return {
        id: room.id,
        name: room.name,
        avatar_url: room.avatar_url,
        type: room.type,
        district: room.district,
        last_message: lastMessagesMap.get(room.id) ?? null,
        other_user: otherUser,
        unread_count: membership?.unread_count ?? 0,
        // Members sadece direct chat için minimal
        members: room.type === 'direct' ? members : [],
      };
    });

    // Log kaldırıldı - egress optimizasyonu

    return roomsWithLastMessage;
  });
