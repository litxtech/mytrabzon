import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const reportUserProcedure = protectedProcedure
  .input(
    z.object({
      reported_user_id: z.string().uuid(),
      reason: z.enum(['spam', 'harassment', 'inappropriate', 'fake', 'other']),
      description: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    // Kendi kendini şikayet edemez
    if (user.id === input.reported_user_id) {
      throw new Error('Kendi kendinizi şikayet edemezsiniz');
    }

    // Şikayet oluştur
    const { data, error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: input.reported_user_id,
        report_type: input.reason,
        description: input.description || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Report user error:', error);
      throw new Error(error.message || 'Şikayet oluşturulamadı');
    }

    return { success: true, report: data };
  });

