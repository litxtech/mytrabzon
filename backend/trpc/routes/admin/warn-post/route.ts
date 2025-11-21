import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { ensureAdmin } from '../utils';

export const warnPostProcedure = protectedProcedure
  .input(
    z.object({
      postId: z.string().uuid().optional(),
      commentId: z.string().uuid().optional(),
      eventId: z.string().uuid().optional(),
      warningReason: z.string().min(1, 'Uyarı nedeni gerekli'),
      warningMessage: z.string().optional(), // Kullanıcıya gösterilecek mesaj
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');
    
    await ensureAdmin(supabase, user.id);

    // En az bir ID olmalı
    if (!input.postId && !input.commentId && !input.eventId) {
      throw new Error('Post, comment veya event ID gerekli');
    }

    // Content type belirle
    let contentType: 'post' | 'comment' | 'event';
    let contentId: string;
    
    if (input.postId) {
      contentType = 'post';
      contentId = input.postId;
      
      // Post var mı kontrol et
      const { data: post } = await supabase
        .from('posts')
        .select('id')
        .eq('id', input.postId)
        .single();
      
      if (!post) {
        throw new Error('Gönderi bulunamadı');
      }
    } else if (input.commentId) {
      contentType = 'comment';
      contentId = input.commentId;
      
      // Comment var mı kontrol et
      const { data: comment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', input.commentId)
        .single();
      
      if (!comment) {
        throw new Error('Yorum bulunamadı');
      }
    } else {
      contentType = 'event';
      contentId = input.eventId!;
      
      // Event var mı kontrol et
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('id', input.eventId)
        .single();
      
      if (!event) {
        throw new Error('Etkinlik bulunamadı');
      }
    }

    // Uyarı oluştur
    const warningData: any = {
      warned_by: user.id,
      warning_reason: input.warningReason,
      warning_message: input.warningMessage || `Bu içerik platform politikalarına uymuyor: ${input.warningReason}`,
      content_type: contentType,
      is_resolved: false,
    };

    if (input.postId) {
      warningData.post_id = input.postId;
    }
    if (input.commentId) {
      warningData.comment_id = input.commentId;
    }
    if (input.eventId) {
      warningData.event_id = input.eventId;
    }

    const { data, error } = await supabase
      .from('post_warnings')
      .insert(warningData)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Uyarı oluşturulamadı');
    }

    return { success: true, warning: data };
  });

