import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

export const createTicketProcedure = protectedProcedure
  .input(
    z.object({
      subject: z.string().min(3).max(200),
      message: z.string().min(10).max(2000),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) {
      throw new TRPCError({ 
        code: 'UNAUTHORIZED',
        message: 'Giriş yapmanız gerekiyor'
      });
    }

    // Support ticket oluştur
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: input.subject,
        message: input.message,
        status: 'open',
        priority: 'medium',
      })
      .select()
      .single();

    if (error) {
      console.error('Create support ticket error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Destek başvurusu oluşturulamadı'
      });
    }

    return ticket;
  });

