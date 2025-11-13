import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';

export const getProfileProcedure = protectedProcedure
  .input(
    z
      .object({
        userId: z.string().uuid().optional(),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    const requesterId = ctx.user.id;
    const targetUserId = input?.userId ?? requesterId;

    if (!targetUserId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Profil bilgisi alınamadı' });
    }

    console.log('Fetching user profile', {
      requesterId,
      targetUserId,
    });

    const { data, error } = await ctx.supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch user profile', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Profil yüklenemedi: ${error.message ?? 'Bilinmeyen hata'}`,
      });
    }

    if (!data) {
      console.warn('User profile not found', {
        targetUserId,
      });

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil bulunamadı',
      });
    }

    return data;
  });
