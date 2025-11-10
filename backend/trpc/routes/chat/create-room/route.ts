import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const createRoomProcedure = protectedProcedure
  .input(
    z.object({
      type: z.enum(['direct', 'group', 'district']),
      name: z.string().optional(),
      memberIds: z.array(z.string()),
      district: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    if (input.type === 'direct' && input.memberIds.length !== 1) {
      throw new Error('Direct chat requires exactly one other member');
    }

    if (input.type === 'direct') {
      const otherUserId = input.memberIds[0];
      
      const { data: existingRoom } = await ctx.supabase
        .from('chat_members')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', userId)
        .eq('chat_rooms.type', 'direct');

      if (existingRoom) {
        for (const room of existingRoom) {
          const { data: members } = await ctx.supabase
            .from('chat_members')
            .select('user_id')
            .eq('room_id', room.room_id);

          const memberUserIds = (members || []).map((m: any) => m.user_id);
          if (
            memberUserIds.length === 2 &&
            memberUserIds.includes(userId) &&
            memberUserIds.includes(otherUserId)
          ) {
            return room.chat_rooms;
          }
        }
      }
    }

    const { data: room, error: roomError } = await ctx.supabase
      .from('chat_rooms')
      .insert({
        type: input.type,
        name: input.name || null,
        district: input.district || null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (roomError || !room) {
      console.error('Error creating room:', roomError);
      throw new Error('Failed to create room');
    }

    const allMemberIds = [userId, ...input.memberIds];
    const memberInserts = allMemberIds.map((memberId, index) => ({
      room_id: room.id,
      user_id: memberId,
      role: index === 0 ? 'admin' : 'member',
    }));

    const { error: membersError } = await ctx.supabase
      .from('chat_members')
      .insert(memberInserts);

    if (membersError) {
      console.error('Error adding members:', membersError);
      await ctx.supabase.from('chat_rooms').delete().eq('id', room.id);
      throw new Error('Failed to add members to room');
    }

    return room;
  });
