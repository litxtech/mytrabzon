import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const sendMessageProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string(),
      content: z.string(),
      mediaUrl: z.string().optional(),
      mediaType: z.enum(['image', 'video', 'audio', 'file']).optional(),
      replyTo: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('Unauthorized');
    }
    const userId = ctx.user.id;

    const { data: member, error: memberError } = await ctx.supabase
      .from('chat_members')
      .select('*')
      .eq('room_id', input.roomId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      throw new Error('Not a member of this room');
    }

    const { data: message, error } = await ctx.supabase
      .from('messages')
      .insert({
        room_id: input.roomId,
        user_id: userId,
        content: input.content,
        media_url: input.mediaUrl || null,
        media_type: input.mediaType || null,
        reply_to: input.replyTo || null,
      })
      .select('*, user:profiles(*)')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }

    await ctx.supabase
      .from('chat_rooms')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', input.roomId);

    // Mesaj bildirimi oluştur
    try {
      const { data: room } = await ctx.supabase
        .from('chat_rooms')
        .select('type')
        .eq('id', input.roomId)
        .single();

      if (room?.type === 'direct') {
        // Direct mesaj için diğer kullanıcıya bildirim gönder
        const { data: members } = await ctx.supabase
          .from('chat_members')
          .select('user_id')
          .eq('room_id', input.roomId)
          .neq('user_id', userId);

        if (members && members.length > 0) {
          const targetUserId = members[0].user_id;
          const { data: senderProfile } = await ctx.supabase
            .from('profiles')
            .select('full_name, verified')
            .eq('id', userId)
            .single();

          const senderName = senderProfile?.full_name || 'Bir kullanıcı';
          const { data: notification } = await ctx.supabase
            .from('notifications')
            .insert({
              user_id: targetUserId,
              type: 'MESSAGE',
              title: 'Yeni Mesaj',
              body: `${senderName}: ${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}`,
              data: {
                type: 'MESSAGE',
                room_id: input.roomId,
                sender_id: userId,
                sender_name: senderName,
                sender_verified: senderProfile?.verified || false,
              },
              push_sent: false,
            })
            .select()
            .single();

          // Push bildirimi gönder
          if (notification) {
            const { data: targetProfile } = await ctx.supabase
              .from('profiles')
              .select('push_token')
              .eq('id', targetUserId)
              .maybeSingle();

            if (targetProfile?.push_token) {
              try {
                const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
                await fetch(expoPushUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                  },
                  body: JSON.stringify({
                    to: targetProfile.push_token,
                    sound: 'default',
                    title: senderName,
                    body: input.content.substring(0, 100),
                    data: {
                      type: 'MESSAGE',
                      roomId: input.roomId,
                    },
                    badge: 1,
                  }),
                });

                await ctx.supabase
                  .from('notifications')
                  .update({ push_sent: true })
                  .eq('id', notification.id);
              } catch (pushError) {
                console.error('Message push notification error:', pushError);
              }
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Message notification error:', notificationError);
      // Bildirim hatası olsa bile mesaj işlemi başarılı, devam et
    }

    return message;
  });
