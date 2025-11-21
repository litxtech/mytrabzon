import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

export const sendNotificationProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string().uuid().optional(), // Tek kullanıcı için
      title: z.string().min(1).max(100),
      body: z.string().min(1).max(500),
      type: z.enum(['SYSTEM', 'EVENT', 'MESSAGE', 'RESERVATION', 'FOOTBALL']).optional().default('SYSTEM'),
      data: z.record(z.string(), z.any()).optional(),
      mediaUrl: z.string().optional(), // URL veya file URI olabilir
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

    // Admin kontrolü
    const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
    let isAdmin = false;

    if (user.id === SPECIAL_ADMIN_ID) {
      isAdmin = true;
    } else {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (adminUser) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Unauthorized: Admin access required',
      });
    }

    // Kullanıcıları belirle
    let targetUserIds: string[] = [];

    if (input.userId) {
      // Tek kullanıcı
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', input.userId)
        .single();

      if (!targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' });
      }

      targetUserIds = [targetUser.id];
    } else {
      // Tüm aktif kullanıcılar
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id')
        .not('id', 'is', null);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      targetUserIds = allUsers?.map((u) => u.id) || [];
    }

    if (targetUserIds.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Hedef kullanıcı bulunamadı' });
    }

    // Bildirim kayıtlarını oluştur
    // body alanı NOT NULL olduğu için boş olamaz
    if (!input.body || input.body.trim().length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Mesaj içeriği (body) boş olamaz',
      });
    }
    
    // Sanitize notification inputs
    const sanitizedTitle = input.title.trim().slice(0, 100); // Max 100 chars
    const bodyText = input.body.trim().slice(0, 500); // Max 500 chars
    
    // Data objesini oluştur (medya URL'i varsa ekle)
    const notificationData: any = { ...(input.data || {}) };
    if (input.mediaUrl && input.mediaUrl.trim() && !input.mediaUrl.startsWith('file://')) {
      // Sadece geçerli URL'leri kabul et (file:// URI'leri frontend'de yüklenmeli)
      notificationData.mediaUrl = input.mediaUrl.trim();
    }

    // Admin bildirimleri mytrabzonteam adıyla gönderilir
    const adminTitle = input.type === 'SYSTEM' ? `MyTrabzonTeam: ${sanitizedTitle}` : sanitizedTitle;
    
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      type: input.type,
      title: adminTitle,
      body: bodyText, // notifications tablosunda body kolonu var
      data: {
        ...notificationData,
        sender: 'mytrabzonteam',
        sender_name: 'MyTrabzonTeam',
      },
      push_sent: false,
      is_deleted: false,
    }));

    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id, user_id');

    if (insertError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Bildirimler oluşturulamadı: ${insertError.message}`,
      });
    }

    // Push token'ları al ve push bildirimleri gönder
    const pushTokens: string[] = [];
    const userIdToTokenMap = new Map<string, string>();

    for (const userId of targetUserIds) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (profile?.push_token) {
        pushTokens.push(profile.push_token);
        userIdToTokenMap.set(userId, profile.push_token);
      }
    }

    // Expo Push API ile bildirim gönder
    if (pushTokens.length > 0) {
      try {
        const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
        const pushTitle = input.type === 'SYSTEM' ? `MyTrabzonTeam: ${sanitizedTitle}` : sanitizedTitle;
        const messages = pushTokens.map((token) => ({
          to: token,
          sound: 'default',
          title: pushTitle,
          body: bodyText,
          data: {
            ...(input.data || {}),
            sender: 'mytrabzonteam',
            sender_name: 'MyTrabzonTeam',
          },
          badge: 1,
        }));

        // Batch gönderim (100'lük gruplar halinde)
        const batchSize = 100;
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = messages.slice(i, i + batchSize);
          const response = await fetch(expoPushUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(batch),
          });

          if (!response.ok) {
            // Log error only in development
            if (process.env.NODE_ENV === 'development') {
              console.error('Push notification error:', await response.text());
            }
          }
        }

        // Başarılı gönderimleri işaretle
        if (insertedNotifications) {
          const sentNotificationIds = insertedNotifications.map((n) => n.id);
          await supabase
            .from('notifications')
            .update({ push_sent: true })
            .in('id', sentNotificationIds);
        }
      } catch (pushError) {
        // Log error only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Push notification error:', pushError);
        }
        // Push hatası olsa bile bildirimler kaydedildi, devam et
      }
    }

    return {
      success: true,
      sentCount: targetUserIds.length,
      pushSentCount: pushTokens.length,
    };
  });

