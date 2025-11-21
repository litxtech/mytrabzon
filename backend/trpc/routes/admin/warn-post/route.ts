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

    // Sanitize warning inputs
    const sanitizedReason = input.warningReason.trim().slice(0, 500); // Max 500 chars
    const sanitizedMessage = input.warningMessage 
      ? input.warningMessage.trim().slice(0, 1000) // Max 1000 chars
      : `Bu içerik platform politikalarına uymuyor: ${sanitizedReason}`;
    
    // Uyarı oluştur
    const warningData: any = {
      warned_by: user.id,
      warning_reason: sanitizedReason,
      warning_message: sanitizedMessage,
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

