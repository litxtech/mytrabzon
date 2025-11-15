import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const markAsReadProcedure = protectedProcedure
    .input(
      z.object({
        notification_id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', input.notification_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    });

export const deleteNotificationProcedure = protectedProcedure
    .input(
      z.object({
        notification_id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('notifications')
        .update({ is_deleted: true })
        .eq('id', input.notification_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    });

export const markAllAsReadProcedure = protectedProcedure
    .mutation(async ({ ctx }) => {
      const { supabase, user } = ctx;
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .is('read_at', null);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    });

export const deleteAllNotificationsProcedure = protectedProcedure
    .mutation(async ({ ctx }) => {
      const { supabase, user } = ctx;
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase
        .from('notifications')
        .update({ is_deleted: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    });

