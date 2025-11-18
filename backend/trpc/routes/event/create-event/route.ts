import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

export const createEventProcedure = protectedProcedure
    .input(
      z.object({
        title: z.string().min(3).max(200),
        description: z.string().optional(),
        category: z.enum([
          'trafik', 'kaza', 'mac_hareketlendi', 'sahil_kalabalik',
          'firtina_yagmur', 'etkinlik', 'konser', 'polis_kontrol',
          'pazar_yogunlugu', 'kampanya_indirim', 'güvenlik', 'yol_kapanmasi',
          'sel_riski', 'ciddi_olay', 'normal_trafik', 'esnaf_duyuru'
        ]),
        severity: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
        district: z.string().optional().nullable(),
        city: z.enum(['Trabzon', 'Giresun']).default('Trabzon'),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        media_urls: z.array(z.string()).optional(),
        audio_url: z.string().optional(),
        expires_at: z.string().optional(), // ISO string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Expires_at hesapla (varsayılan 2 saat)
      const expiresAt = input.expires_at 
        ? new Date(input.expires_at)
        : new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 saat sonra

      // Event oluştur - start_date şu anki zaman olarak ayarla
      const now = new Date();
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description,
          category: input.category,
          severity: input.severity,
          district: input.district || null,
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
          media_urls: input.media_urls,
          audio_url: input.audio_url,
          start_date: now.toISOString(), // start_date eklendi
          expires_at: expiresAt.toISOString(),
          is_active: true, // Açıkça set et
          is_deleted: false, // Açıkça set et
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: error.message 
        });
      }

      // Algoritma: Etkilenecek kullanıcıları bul ve bildirim oluştur
      // Bu işlem Supabase Edge Function'da yapılabilir, şimdilik basit versiyon
      console.log('📢 Event created:', event.id, 'Severity:', input.severity);
      try {
        await createNotificationsForEvent(supabase, event, input.severity, input.district || '', input.city);
      } catch (notificationError) {
        console.error('❌ Notification creation failed:', notificationError);
        // Bildirim hatası olsa bile event oluşturuldu, devam et
      }

      return event;
    });

// Algoritma: Severity bazlı kullanıcı filtreleme
async function createNotificationsForEvent(
  supabase: any,
  event: any,
  severity: string,
  district: string,
  city: string
) {
  let targetUsers: any[] = [];

  if (severity === 'CRITICAL') {
    // Tüm şehir
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('city', city)
      .eq('is_active', true)
      .neq('id', event.user_id); // Event oluşturan kullanıcıyı hariç tut
    if (error) {
      console.error('❌ CRITICAL severity query error:', error);
    }
    targetUsers = data || [];
    console.log('📢 CRITICAL: Found', targetUsers.length, 'users in', city);
  } else if (severity === 'HIGH') {
    // Sadece ilçe - eğer district null veya boş ise tüm şehre gönder
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('city', city)
      .eq('is_active', true)
      .neq('id', event.user_id);
    
    if (district && district.trim() !== '' && district !== 'Tümü') {
      query = query.eq('district', district);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('❌ HIGH severity query error:', error);
    }
    targetUsers = data || [];
    console.log('📢 HIGH: Found', targetUsers.length, 'users in', district || 'all districts', city);
  } else if (severity === 'NORMAL') {
    // İlçe + ilgi alanları - eğer district null veya boş ise tüm şehre gönder
    let districtQuery = supabase
      .from('profiles')
      .select('id')
      .eq('city', city)
      .eq('is_active', true);
    
    if (district && district.trim() !== '' && district !== 'Tümü') {
      districtQuery = districtQuery.eq('district', district);
    }
    
    const { data: districtUsers } = await districtQuery;

    const { data: interestUsers } = await supabase
      .from('user_interests')
      .select('user_id')
      .eq('category', event.category);

    const districtUserIds = (districtUsers || []).map((u: any) => u.id);
    const interestUserIds = (interestUsers || []).map((u: any) => u.user_id);
    const allUserIds = [...new Set([...districtUserIds, ...interestUserIds])];

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .in('id', allUserIds)
      .eq('is_active', true)
      .neq('id', event.user_id); // Event oluşturan kullanıcıyı hariç tut
    if (error) {
      console.error('❌ NORMAL severity query error:', error);
    }
    targetUsers = data || [];
    console.log('📢 NORMAL: Found', targetUsers.length, 'users (district:', districtUserIds.length, 'interest:', interestUserIds.length, ')');
  }
  // LOW severity için push bildirim yok, sadece feed'de görünür

  // Her kullanıcı için bildirim oluştur
  console.log('📢 Target users found:', targetUsers.length, 'Severity:', severity);
  
  if (targetUsers.length > 0 && severity !== 'LOW') {
    const notifications = targetUsers.map((user: any) => ({
      user_id: user.id,
      event_id: event.id,
      type: 'EVENT',
      title: event.title,
      message: event.description || `${event.category} - ${district}`, // body yerine message kullan
      data: { event_id: event.id, severity, category: event.category },
      push_sent: false,
    }));

    console.log('📢 Creating notifications:', notifications.length);
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id, user_id');

    if (insertError) {
      console.error('❌ Notification insert error:', insertError);
      // Bildirim hatası olsa bile event oluşturuldu, devam et
    } else {
      console.log('✅ Notifications created:', insertedNotifications?.length || 0);
    }

    // Push bildirimleri gönder (Expo Push API)
    if (insertedNotifications && insertedNotifications.length > 0) {
      try {
        // Push token'ları al
        const userIds = insertedNotifications.map((n: any) => n.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, push_token')
          .in('id', userIds);

        const pushTokens: string[] = [];
        const notificationIdToTokenMap = new Map<string, string>();

        if (profiles) {
          for (const profile of profiles) {
            if (profile.push_token) {
              pushTokens.push(profile.push_token);
              // Her notification için token bul
              const notification = insertedNotifications.find((n: any) => n.user_id === profile.id);
              if (notification) {
                notificationIdToTokenMap.set(notification.id, profile.push_token);
              }
            }
          }
        }

        // Expo Push API ile bildirim gönder
        if (pushTokens.length > 0) {
          const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
          const messages = insertedNotifications
            .filter((n: any) => notificationIdToTokenMap.has(n.id))
            .map((n: any) => {
              const token = notificationIdToTokenMap.get(n.id);
              if (!token) return null;
              return {
                to: token,
                sound: 'default',
                title: event.title,
                body: event.description || `${event.category} - ${district}`,
                data: { 
                  type: 'EVENT',
                  event_id: event.id, 
                  severity, 
                  category: event.category 
                },
                badge: 1,
              };
            })
            .filter((m: any) => m !== null);

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
              console.error('Push notification error:', await response.text());
            }
          }

          // Başarılı gönderimleri işaretle
          const sentNotificationIds = insertedNotifications
            .filter((n: any) => notificationIdToTokenMap.has(n.id))
            .map((n: any) => n.id);

          if (sentNotificationIds.length > 0) {
            await supabase
              .from('notifications')
              .update({ push_sent: true })
              .in('id', sentNotificationIds);
          }
        }
      } catch (pushError) {
        console.error('Push notification error:', pushError);
        // Push hatası olsa bile bildirimler kaydedildi, devam et
      }
    }
  }
}

