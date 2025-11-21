import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const updateProfileProcedure = protectedProcedure
  .input(
    z.object({
      full_name: z.string().optional(),
      bio: z.string().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
      age: z.number().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      phone: z.string().nullable().optional(),
      address: z.string().optional(),
      height: z.number().optional(),
      weight: z.number().optional(),
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/).optional(),
      social_media: z
        .object({
          instagram: z.string().optional(),
          twitter: z.string().optional(),
          facebook: z.string().optional(),
          linkedin: z.string().optional(),
          tiktok: z.string().optional(),
          youtube: z.string().optional(),
        })
        .optional(),
      privacy_settings: z
        .object({
          show_age: z.boolean().optional(),
          show_gender: z.boolean().optional(),
          show_phone: z.boolean().optional(),
          show_email: z.boolean().optional(),
          show_address: z.boolean().optional(),
          show_height: z.boolean().optional(),
          show_weight: z.boolean().optional(),
          show_social_media: z.boolean().optional(),
        })
        .optional(),
      show_in_directory: z.boolean().optional(),
      email: z.string().nullable().optional(),
      avatar_url: z.string().nullable().optional(),
      location_opt_in: z.boolean().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    if (!user) {
      throw new Error("Unauthorized");
    }

    const updateData: Record<string, unknown> = {};

    // Username validation ve availability check
    if (input.username !== undefined) {
      const trimmedUsername = input.username.trim().toLowerCase();
      
      // Validation kuralları
      if (trimmedUsername.length < 3) {
        throw new Error("Kullanıcı adı en az 3 karakter olmalıdır");
      }
      if (trimmedUsername.length > 30) {
        throw new Error("Kullanıcı adı en fazla 30 karakter olabilir");
      }
      if (!/^[a-zA-Z0-9._]+$/.test(trimmedUsername)) {
        throw new Error("Kullanıcı adı sadece harf, rakam, nokta ve alt çizgi içerebilir");
      }
      if (trimmedUsername.startsWith('.') || trimmedUsername.endsWith('.')) {
        throw new Error("Kullanıcı adı nokta ile başlayamaz veya bitemez");
      }
      if (trimmedUsername.includes('..')) {
        throw new Error("Kullanıcı adı ardışık nokta içeremez");
      }

      // Availability check (RPC function kullan)
      const { data: isAvailable, error: checkError } = await supabase.rpc('is_username_available', {
        p_username: trimmedUsername,
        p_user_id: user.id,
      });

      if (checkError) {
        console.error("Username availability check error:", checkError);
        throw new Error("Kullanıcı adı kontrolü sırasında bir hata oluştu");
      }

      if (!isAvailable) {
        throw new Error("Bu kullanıcı adı zaten kullanılıyor");
      }

      updateData.username = trimmedUsername;
    }

    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.district !== undefined) updateData.district = input.district;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.age !== undefined) updateData.age = input.age;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.phone !== undefined) {
      // null veya boş string ise null olarak kaydet
      updateData.phone = input.phone === null || input.phone === '' ? null : input.phone;
    }
    if (input.address !== undefined) updateData.address = input.address;
    if (input.height !== undefined) updateData.height = input.height;
    if (input.weight !== undefined) updateData.weight = input.weight;
    if (input.social_media !== undefined)
      updateData.social_media = input.social_media;
    if (input.privacy_settings !== undefined)
      updateData.privacy_settings = input.privacy_settings;
    if (input.show_in_directory !== undefined)
      updateData.show_in_directory = input.show_in_directory;
    if (input.email !== undefined) {
      // null veya boş string ise null olarak kaydet
      updateData.email = input.email === null || input.email === '' ? null : input.email;
    }
    if (input.avatar_url !== undefined)
      updateData.avatar_url = input.avatar_url;
    if (input.location_opt_in !== undefined)
      updateData.location_opt_in = input.location_opt_in;

    updateData.updated_at = new Date().toISOString();

    console.log('Updating profile with data:', JSON.stringify(updateData, null, 2));
    console.log('User ID:', user.id);

    // Email güncelleme (eğer değiştiyse)
    if (input.email && input.email !== user.email) {
      const { error: updateError } = await supabase.auth.updateUser({ email: input.email });
      if (updateError) {
        throw new Error(`Email güncelleme hatası: ${updateError.message}`);
      }
      updateData.email = input.email;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("❌ Profil güncelleme hatası:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Profile update failed: ${error.message} (${error.code})`);
    }

    if (!data) {
      console.error("❌ Profile update returned no data");
      throw new Error('Profile update returned no data');
    }

    console.log('✅ Profile updated successfully:', data.id);
    
    // Response'u serialize edilebilir hale getir - tüm Date objelerini ve null değerleri düzgün handle et
    const serializedData: any = {};
    
    // Tüm alanları serialize et
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        serializedData[key] = null;
      } else if (value instanceof Date) {
        serializedData[key] = value.toISOString();
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Nested objeleri (social_media, privacy_settings gibi) olduğu gibi bırak
        serializedData[key] = value;
      } else {
        serializedData[key] = value;
      }
    }
    
    // Özellikle Date alanlarını kontrol et
    if (data.created_at) {
      serializedData.created_at = data.created_at instanceof Date 
        ? data.created_at.toISOString() 
        : (typeof data.created_at === 'string' ? data.created_at : new Date(data.created_at).toISOString());
    } else {
      serializedData.created_at = null;
    }
    
    if (data.updated_at) {
      serializedData.updated_at = data.updated_at instanceof Date 
        ? data.updated_at.toISOString() 
        : (typeof data.updated_at === 'string' ? data.updated_at : new Date(data.updated_at).toISOString());
    } else {
      serializedData.updated_at = null;
    }
    
    return serializedData;
  });
