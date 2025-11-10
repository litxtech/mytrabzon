import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const blockUserProcedure = protectedProcedure
  .input(
    z.object({
      blockedUserId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    if (userId === input.blockedUserId) {
      throw new Error('Cannot block yourself');
    }

    const { data: existing } = await ctx.supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', userId)
      .eq('blocked_id', input.blockedUserId)
      .single();

    if (existing) {
      throw new Error('User already blocked');
    }

    const { error } = await ctx.supabase
      .from('blocked_users')
      .insert({
        blocker_id: userId,
        blocked_id: input.blockedUserId,
      });

    if (error) {
      console.error('Error blocking user:', error);
      throw new Error('Failed to block user');
    }

    return { success: true };
  });

export const unblockUserProcedure = protectedProcedure
  .input(
    z.object({
      blockedUserId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { error } = await ctx.supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', input.blockedUserId);

    if (error) {
      console.error('Error unblocking user:', error);
      throw new Error('Failed to unblock user');
    }

    return { success: true };
  });
