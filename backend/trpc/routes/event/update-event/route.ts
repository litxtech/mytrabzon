import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

export const updateEventProcedure = protectedProcedure
  .input(
    z.object({
      eventId: z.string().uuid(),
      title: z.string().min(3).max(200).optional(),
      description: z.string().optional(),
      category: z.enum([
        'trafik', 'kaza', 'mac_hareketlendi', 'sahil_kalabalik',
        'firtina_yagmur', 'etkinlik', 'konser', 'polis_kontrol',
        'pazar_yogunlugu', 'kampanya_indirim', 'güvenlik', 'yol_kapanmasi',
        'sel_riski', 'ciddi_olay', 'normal_trafik', 'esnaf_duyuru'
      ]).optional(),
      severity: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).optional(),
      district: z.string().optional().nullable(),
      city: z.enum(['Trabzon', 'Giresun']).optional(),
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

    const { eventId, ...updateData } = input;

    // Event'i bul ve kullanıcının kendi event'i olduğunu kontrol et
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !event) {
      throw new TRPCError({ 
        code: 'NOT_FOUND', 
        message: 'Olay bulunamadı veya yetkisiz erişim' 
      });
    }

    // Update data'yı hazırla
    const updatePayload: any = {};

    if (updateData.title !== undefined) updatePayload.title = updateData.title;
    if (updateData.description !== undefined) updatePayload.description = updateData.description;
    if (updateData.category !== undefined) updatePayload.category = updateData.category;
    if (updateData.severity !== undefined) updatePayload.severity = updateData.severity;
    if (updateData.district !== undefined) {
      // "Tümü" seçildiyse null yap
      updatePayload.district = updateData.district === 'Tümü' ? null : updateData.district;
    }
    if (updateData.city !== undefined) updatePayload.city = updateData.city;
    if (updateData.latitude !== undefined) updatePayload.latitude = updateData.latitude;
    if (updateData.longitude !== undefined) updatePayload.longitude = updateData.longitude;
    if (updateData.media_urls !== undefined) updatePayload.media_urls = updateData.media_urls;
    if (updateData.audio_url !== undefined) updatePayload.audio_url = updateData.audio_url;
    if (updateData.expires_at !== undefined) {
      updatePayload.expires_at = new Date(updateData.expires_at).toISOString();
    }

    // updated_at'i güncelle
    updatePayload.updated_at = new Date().toISOString();

    // Event'i güncelle
    const { data: updatedEvent, error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new TRPCError({ 
        code: 'INTERNAL_SERVER_ERROR', 
        message: error.message 
      });
    }

    return updatedEvent;
  });

