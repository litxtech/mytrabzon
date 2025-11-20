// Supabase Edge Function for tRPC
// Deno runtime compatible - Complete implementation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, publicProcedure, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";
import { TRPCError } from "npm:@trpc/server@^11.7.1";

// Helper function to extract hashtags
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\wşığüçöŞİĞÜÇÖ]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

// Helper to convert base64 to Uint8Array for Deno
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function generateCallChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `call_${sorted[0]}_${sorted[1]}`;
}

const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: publicProcedure.query(() => {
      return { message: "Hello from Supabase Edge Functions!" };
    }),
  }),

  user: createTRPCRouter({
    updateProfile: protectedProcedure
      .input(
        z.object({
          full_name: z.string().optional(),
          bio: z.string().optional(),
          district: z.string().optional(),
          city: z.string().optional(),
          age: z.number().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          height: z.number().optional(),
          weight: z.number().optional(),
          username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/).optional(),
          social_media: z.object({
            instagram: z.string().optional(),
            twitter: z.string().optional(),
            facebook: z.string().optional(),
            linkedin: z.string().optional(),
            tiktok: z.string().optional(),
            youtube: z.string().optional(),
          }).optional(),
          privacy_settings: z.object({
            show_age: z.boolean().optional(),
            show_gender: z.boolean().optional(),
            show_phone: z.boolean().optional(),
            show_email: z.boolean().optional(),
            show_address: z.boolean().optional(),
            show_height: z.boolean().optional(),
            show_weight: z.boolean().optional(),
            show_social_media: z.boolean().optional(),
            notifications: z.object({
              push: z.boolean().optional(),
              email: z.boolean().optional(),
              sms: z.boolean().optional(),
              likes: z.boolean().optional(),
              comments: z.boolean().optional(),
              follows: z.boolean().optional(),
              messages: z.boolean().optional(),
            }).optional(),
            privacy: z.object({
              profileVisible: z.boolean().optional(),
              showOnline: z.boolean().optional(),
              allowMessages: z.boolean().optional(),
              allowTagging: z.boolean().optional(),
              showGenderIcon: z.boolean().optional(),
            }).optional(),
          }).optional(),
          show_in_directory: z.boolean().optional(),
          email: z.string().optional(),
          avatar_url: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        const updateData: Record<string, unknown> = {};

        if (!user) throw new Error("Unauthorized");

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
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.address !== undefined) updateData.address = input.address;
        if (input.height !== undefined) updateData.height = input.height;
        if (input.weight !== undefined) updateData.weight = input.weight;
        if (input.social_media !== undefined) updateData.social_media = input.social_media;
        if (input.privacy_settings !== undefined) updateData.privacy_settings = input.privacy_settings;
        if (input.show_in_directory !== undefined) updateData.show_in_directory = input.show_in_directory;
        if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url;
        if (input.location_opt_in !== undefined) updateData.location_opt_in = input.location_opt_in;

        updateData.updated_at = new Date().toISOString();

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
          console.error("Profile update error:", error);
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error("Profile update failed: No data returned");
        }

        // Response'u serialize edilebilir hale getir
        return {
          ...data,
          created_at: data.created_at ? new Date(data.created_at).toISOString() : null,
          updated_at: data.updated_at ? new Date(data.updated_at).toISOString() : null,
        };
      }),

    checkUsername: publicProcedure
      .input(z.object({ username: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        const trimmedUsername = input.username.trim().toLowerCase();

        // Validation
        if (trimmedUsername.length < 3) {
          return { available: false, valid: false, message: "Kullanıcı adı en az 3 karakter olmalıdır" };
        }
        if (trimmedUsername.length > 30) {
          return { available: false, valid: false, message: "Kullanıcı adı en fazla 30 karakter olabilir" };
        }
        if (!/^[a-zA-Z0-9._]+$/.test(trimmedUsername)) {
          return { available: false, valid: false, message: "Kullanıcı adı sadece harf, rakam, nokta ve alt çizgi içerebilir" };
        }
        if (trimmedUsername.startsWith('.') || trimmedUsername.endsWith('.')) {
          return { available: false, valid: false, message: "Kullanıcı adı nokta ile başlayamaz veya bitemez" };
        }
        if (trimmedUsername.includes('..')) {
          return { available: false, valid: false, message: "Kullanıcı adı ardışık nokta içeremez" };
        }

        // Availability check
        const { data: isAvailable, error } = await supabase.rpc('is_username_available', {
          p_username: trimmedUsername,
          p_user_id: user?.id || null,
        });

        if (error) {
          console.error("Username availability check error:", error);
          return { available: false, valid: true, message: "Kontrol sırasında bir hata oluştu" };
        }

        return {
          available: isAvailable || false,
          valid: true,
          message: isAvailable ? "Bu kullanıcı adı müsait" : "Bu kullanıcı adı zaten kullanılıyor",
        };
      }),

    suggestUsername: publicProcedure
      .input(z.object({ base: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        const base = input.base?.trim() || 'user';

        const { data: suggestions, error } = await supabase.rpc('suggest_username', {
          p_base_username: base,
        });

        if (error) {
          console.error("Username suggestion error:", error);
          return { suggestions: [] };
        }

        return { suggestions: suggestions || [] };
      }),

    uploadAvatar: protectedProcedure
      .input(z.object({
        base64Data: z.string(),
        fileType: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const fileData = base64ToUint8Array(input.base64Data);
        const filePath = `${user.id}/${Date.now()}-${input.fileName}`;

        const { data: existingFiles } = await supabase.storage
          .from("avatars")
          .list(user.id);

        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map((file) => `${user.id}/${file.name}`);
          await supabase.storage.from("avatars").remove(filesToDelete);
        }

        const { data, error } = await supabase.storage
          .from("avatars")
          .upload(filePath, fileData, {
            contentType: input.fileType,
            upsert: false,
          });

        if (error) {
          console.error("Avatar upload error:", error);
          throw new Error(error.message);
        }

        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(data.path);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);

        if (updateError) throw new Error(updateError.message);

        return { url: publicUrl, path: data.path };
      }),

    getProfile: protectedProcedure
      .input(z.object({ userId: z.string().uuid().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const targetUserId = input?.userId ?? user.id;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          throw new Error(error.message);
        }

        if (!data) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil bulunamadı',
          });
        }

        return data;
      }),

    getAllUsers: publicProcedure
      .input(
        z.object({
          search: z.string().optional(),
          gender: z.enum(['male', 'female', 'other', 'all']).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        const { search, gender } = input;

        console.log('getAllUsers called with:', { search, gender });

        // Sadece show_in_directory = true olan kullanıcıları göster
        let query = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, city, district, created_at, gender, public_id, username, verified', { count: 'exact' })
          .eq('show_in_directory', true)
          .order('created_at', { ascending: false });

        // Cinsiyet filtresi: sadece 'all' değilse filtrele
        if (gender && gender !== 'all') {
          query = query.eq('gender', gender);
        }

        // Arama filtresi - email için auth.users tablosuna join yapmamız gerekiyor
        if (search && search.trim()) {
          const searchTerm = search.trim().toLowerCase();
          // Önce profiles'da arama yap
          query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);
        }

        const { data, error, count } = await query;

        // Log kaldırıldı - egress optimizasyonu

        if (error) {
          console.error('Error fetching users:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Kullanıcılar yüklenirken bir hata oluştu: ${error.message}`,
          });
        }

        // Email araması için - auth.users tablosuna direkt erişim yok, bu yüzden sadece profiles'da arama yapıyoruz
        // Email araması için kullanıcıların email'lerini başka bir yöntemle almak gerekir
        // Şimdilik sadece name, username ve bio'da arama yapıyoruz
        let usersWithEmail = data || [];

        // Response'u serialize edilebilir hale getir - TÜM KULLANICILARI GÖSTER
        const serializedUsers = usersWithEmail
          .map((user: any) => ({
            id: user.id,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            city: user.city,
            district: user.district,
            created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
            verified: false, // verified column yok, her zaman false döndür
            gender: user.gender,
            public_id: user.public_id,
            username: user.username || null,
          }));

        // Log kaldırıldı - egress optimizasyonu

        return {
          users: serializedUsers,
          total: count || serializedUsers.length,
        };
      }),

    updateDirectoryVisibility: protectedProcedure
      .input(z.object({ show_in_directory: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { error } = await supabase
          .from('profiles')
          .update({ show_in_directory: input.show_in_directory })
          .eq('id', user.id);

        if (error) throw new Error(error.message);
        return { success: true };
      }),

    requestAccountDeletion: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 7);

        const { error } = await supabase
          .from("profiles")
          .update({
            deletion_requested_at: new Date().toISOString(),
            deletion_scheduled_at: deletionDate.toISOString(),
          })
          .eq("id", user.id);

        if (error) throw new Error(error.message);

        return {
          success: true,
          message: "Account deletion requested successfully",
          deletionDate: deletionDate.toISOString(),
        };
      }),

    cancelAccountDeletion: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { error } = await supabase
          .from("profiles")
          .update({
            deletion_requested_at: null,
            deletion_scheduled_at: null,
          })
          .eq("id", user.id);

        if (error) throw new Error(error.message);

        return { success: true, message: "Account deletion cancelled successfully" };
      }),

    // Takip et
    follow: protectedProcedure
      .input(z.object({ following_id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });

        if (user.id === input.following_id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Kendinizi takip edemezsiniz' });
        }

        // Kullanıcının var olup olmadığını kontrol et
        const { data: targetUser, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', input.following_id)
          .maybeSingle();

        if (userError || !targetUser) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' });
        }

        // Zaten takip ediliyor mu kontrol et
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', input.following_id)
          .maybeSingle();

        if (existingFollow) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bu kullanıcıyı zaten takip ediyorsunuz' });
        }

        // Takip kaydı oluştur
        const { data: follow, error: followError } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: input.following_id,
          })
          .select()
          .single();

        if (followError) {
          console.error('Follow error:', followError);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Takip işlemi başarısız oldu' });
        }

        try {
          const { data: followerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          const followerName = followerProfile?.full_name || 'Bir kullanıcı';
          const message = `${followerName} sizi takip etmeye başladı`;

          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              user_id: input.following_id,
              type: 'FOLLOW',
              title: 'Yeni Takipçi',
              message,
              data: {
                follower_id: user.id,
                follower_name: followerName,
              },
              push_sent: false,
            })
            .select()
            .single();

          if (notification) {
            const { data: targetProfile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', input.following_id)
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
                    title: 'Yeni Takipçi',
                    body: message,
                    data: {
                      type: 'FOLLOW',
                      follower_id: user.id,
                    },
                    badge: 1,
                  }),
                });

                await supabase
                  .from('notifications')
                  .update({ push_sent: true })
                  .eq('id', notification.id);
              } catch (pushError) {
                console.error('Follow push notification error:', pushError);
              }
            }
          }
        } catch (notificationError) {
          console.error('Follow notification error:', notificationError);
        }

        return { success: true, follow };
      }),

    // Takipten çık
    unfollow: protectedProcedure
      .input(z.object({ following_id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });

        // Takip kaydını sil
        const { error: unfollowError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', input.following_id);

        if (unfollowError) {
          console.error('Unfollow error:', unfollowError);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Takipten çıkma işlemi başarısız oldu' });
        }

        return { success: true };
      }),

    // Takip durumunu kontrol et
    checkFollowStatus: protectedProcedure
      .input(z.object({ user_id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;

        if (!user) {
          return { is_following: false };
        }

        // Takip durumunu kontrol et
        const { data: follow, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', input.user_id)
          .maybeSingle();

        if (error) {
          console.error('Check follow status error:', error);
          return { is_following: false };
        }

        return { is_following: !!follow };
      }),

    // Takipçileri getir
    getFollowers: publicProcedure
      .input(z.object({ 
        user_id: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        try {
          // Önce takipçi ID'lerini al
          const { data: followsData, error: followsError } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', input.user_id)
            .order('created_at', { ascending: false })
            .range(input.offset, input.offset + input.limit - 1);

          if (followsError) {
            console.error('Get followers error:', followsError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Takipçiler yüklenirken hata oluştu: ${followsError.message}`,
            });
          }

          // Eğer takipçi yoksa boş dizi döndür
          if (!followsData || followsData.length === 0) {
            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', input.user_id);

            return {
              followers: [],
              total: count || 0,
            };
          }

          // Takipçi ID'lerini al
          const followerIds = followsData.map((f: any) => f.follower_id);

          // Profil detaylarını al
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, verified, supporter_badge, supporter_badge_color, supporter_badge_visible')
            .in('id', followerIds);

          if (profilesError) {
            console.error('Get profiles error:', profilesError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Profil bilgileri yüklenirken hata oluştu: ${profilesError.message}`,
            });
          }

          // Profilleri ID'ye göre map'le
          const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

          // Toplam takipçi sayısı
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', input.user_id);

          return {
            followers: followerIds.map((id: string) => {
              const profile = profilesMap.get(id) as any;
              return {
                id,
                full_name: profile?.full_name || '',
                username: profile?.username || null,
                avatar_url: profile?.avatar_url || null,
                verified: profile?.verified || false,
                supporter_badge: profile?.supporter_badge || false,
                supporter_badge_color: profile?.supporter_badge_color || null,
                supporter_badge_visible: profile?.supporter_badge_visible || false,
              };
            }),
            total: count || 0,
          };
        } catch (error: any) {
          console.error('Get followers error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Takipçiler yüklenirken hata oluştu: ${error.message || error}`,
          });
        }
      }),

    // Takip edilenleri getir
    getFollowing: publicProcedure
      .input(z.object({ 
        user_id: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        try {
          // Önce takip edilen ID'lerini al
          const { data: followsData, error: followsError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', input.user_id)
            .order('created_at', { ascending: false })
            .range(input.offset, input.offset + input.limit - 1);

          if (followsError) {
            console.error('Get following error:', followsError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Takip edilenler yüklenirken hata oluştu: ${followsError.message}`,
            });
          }

          // Eğer takip edilen yoksa boş dizi döndür
          if (!followsData || followsData.length === 0) {
            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('follower_id', input.user_id);

            return {
              following: [],
              total: count || 0,
            };
          }

          // Takip edilen ID'lerini al
          const followingIds = followsData.map((f: any) => f.following_id);

          // Profil detaylarını al
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, verified, supporter_badge, supporter_badge_color, supporter_badge_visible')
            .in('id', followingIds);

          if (profilesError) {
            console.error('Get profiles error:', profilesError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Profil bilgileri yüklenirken hata oluştu: ${profilesError.message}`,
            });
          }

          // Profilleri ID'ye göre map'le
          const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

          // Toplam takip sayısı
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', input.user_id);

          return {
            following: followingIds.map((id: string) => {
              const profile = profilesMap.get(id) as any;
              return {
                id,
                full_name: profile?.full_name || '',
                username: profile?.username || null,
                avatar_url: profile?.avatar_url || null,
                verified: profile?.verified || false,
                supporter_badge: profile?.supporter_badge || false,
                supporter_badge_color: profile?.supporter_badge_color || null,
                supporter_badge_visible: profile?.supporter_badge_visible || false,
              };
            }),
            total: count || 0,
          };
        } catch (error: any) {
          console.error('Get following error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Takip edilenler yüklenirken hata oluştu: ${error.message || error}`,
          });
        }
      }),

    // Takip istatistiklerini getir
    getFollowStats: publicProcedure
      .input(z.object({ user_id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        const [followersResult, followingResult] = await Promise.all([
          supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', input.user_id),
          supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', input.user_id),
        ]);

        if (followersResult.error || followingResult.error) {
          console.error('Get follow stats error:', followersResult.error || followingResult.error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'Takip istatistikleri yüklenirken hata oluştu: ' + (followersResult.error?.message || followingResult.error?.message)
          });
        }

        return {
          followers_count: followersResult.count ?? 0,
          following_count: followingResult.count ?? 0,
        };
      }),

    // Politika onayları - user router'ına taşındı (frontend uyumluluğu için)
    getRequiredPolicies: publicProcedure
      .query(async ({ ctx }) => {
        const { supabase } = ctx;

        const requiredPolicyTypes = [
          'terms',
          'privacy',
          'community',
          'cookie',
          'child_safety',
          'payment',
          'moderation',
          'data_storage',
          'eula',
          'university',
          'event',
        ];

        const { data: policies, error } = await supabase
          .from('policies')
          .select('id, title, content, policy_type, display_order, updated_at')
          .eq('is_active', true)
          .in('policy_type', requiredPolicyTypes)
          .order('display_order', { ascending: true });

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        return { policies: policies || [] };
      }),

    consentToPolicies: publicProcedure
      .input(
        z.object({
          policyIds: z.array(z.string()),
          userId: z.string().uuid().optional(), // Opsiyonel: eğer authenticated değilse user_id gönderilebilir
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        // User ID'yi belirle: önce context'ten, sonra input'tan
        const userId = user?.id || input.userId;
        
        if (!userId) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED',
            message: 'Giriş yapmanız gerekiyor',
          });
        }

        // Politikaları al
        const { data: policies, error: policiesError } = await supabase
          .from('policies')
          .select('id, policy_type')
          .in('id', input.policyIds);

        if (policiesError || !policies || policies.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Geçersiz politika ID\'leri',
          });
        }

        // Onay kayıtlarını oluştur
        const consents = policies.map((policy) => ({
          user_id: userId,
          policy_id: policy.id,
          policy_type: policy.policy_type,
          consented: true,
          policy_version: 1, // Şimdilik 1, versiyon sistemi eklendiğinde güncellenecek
        }));

        const { error: insertError } = await supabase
          .from('user_policy_consents')
          .upsert(consents, {
            onConflict: 'user_id,policy_id,policy_version',
          });

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: insertError.message,
          });
        }

        return { success: true, consentedCount: consents.length };
      }),

    // ============================================
    // Yakındaki Kullanıcılar - Çift Onaylı Karşılaşma Sistemi
    // ============================================

    // Konum güncelle ve yakınlık kontrolü yap
    updateLocationAndCheckProximity: protectedProcedure
      .input(
        z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });

        // Kullanıcının location_opt_in durumunu kontrol et
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('location_opt_in')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Profil bulunamadı' });
        }

        // Konumu güncelle (opt-in olsun ya da olmasın, konum kaydedilir)
        const { error: locationError } = await supabase
          .from('user_locations')
          .upsert({
            user_id: user.id,
            lat: input.lat,
            lng: input.lng,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (locationError) {
          console.error('Location update error:', locationError);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Konum güncellenemedi' });
        }

        // Eğer location_opt_in = false ise, yakınlık kontrolü yapma
        if (!profile.location_opt_in) {
          return { nearbyCount: 0, newlyCreatedPairIds: [] };
        }

        // Kullanıcının mevcut konumunu al
        const currentUserGeom = `ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`;

        // 200 metre yarıçap içindeki diğer opt-in kullanıcıları bul
        // Son 10 dakika içinde konum güncellemiş olanları al (aktif kullanıcılar)
        const { data: nearbyUsers, error: nearbyError } = await supabase.rpc('find_nearby_users', {
          current_user_id: user.id,
          current_lat: input.lat,
          current_lng: input.lng,
          radius_meters: 200,
          max_age_minutes: 10,
        });

        // Eğer RPC fonksiyonu yoksa, manuel sorgu yap
        let nearbyUserIds: string[] = [];
        if (nearbyError) {
          // Fallback: Manuel PostGIS sorgusu
          const { data: manualNearby, error: manualError } = await supabase
            .from('user_locations')
            .select('user_id')
            .neq('user_id', user.id)
            .gt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

          if (!manualError && manualNearby) {
            // Her kullanıcı için mesafe kontrolü yap
            for (const loc of manualNearby) {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('location_opt_in')
                .eq('id', loc.user_id)
                .eq('location_opt_in', true)
                .single();

              if (userProfile) {
                // Mesafe kontrolü için kullanıcının konumunu al
                const { data: otherLocation } = await supabase
                  .from('user_locations')
                  .select('lat, lng')
                  .eq('user_id', loc.user_id)
                  .single();

                if (otherLocation) {
                  // Basit mesafe hesaplama (Haversine formülü yaklaşımı)
                  const distance = calculateDistanceKm(input.lat, input.lng, otherLocation.lat, otherLocation.lng) * 1000; // metre
                  if (distance <= 200) {
                    nearbyUserIds.push(loc.user_id);
                  }
                }
              }
            }
          }
        } else if (nearbyUsers) {
          nearbyUserIds = nearbyUsers.map((u: any) => u.user_id);
        }

        const newlyCreatedPairIds: string[] = [];

        // Her yakın kullanıcı için proximity_pair kontrolü yap
        for (const otherUserId of nearbyUserIds) {
          // Canonical pair oluştur (a < b)
          const userA = user.id < otherUserId ? user.id : otherUserId;
          const userB = user.id < otherUserId ? otherUserId : user.id;

          // Mevcut pair'i kontrol et
          const { data: existingPair, error: pairError } = await supabase
            .from('proximity_pairs')
            .select('*')
            .eq('user_a_id', userA)
            .eq('user_b_id', userB)
            .maybeSingle();

          if (pairError && pairError.code !== 'PGRST116') { // PGRST116 = not found, bu normal
            console.error('Proximity pair check error:', pairError);
            continue;
          }

          // Eğer pair yoksa veya durum uygunsa
          if (!existingPair) {
            // Yeni pair oluştur
            const { data: newPair, error: createError } = await supabase
              .from('proximity_pairs')
              .insert({
                user_a_id: userA,
                user_b_id: userB,
                status: 'pending',
                last_notified_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!createError && newPair) {
              newlyCreatedPairIds.push(newPair.id);
              
              // Her iki kullanıcı için bildirim oluştur
              await createProximityNotification(supabase, userA, userB, newPair.id);
            }
          } else {
            // Pair var, durum kontrolü yap
            const status = existingPair.status;

            // Eğer rejected veya blocked ise, hiçbir şey yapma
            if (status === 'rejected' || status === 'blocked') {
              continue;
            }

            // Eğer accepted ise, zaten eşleşmişler, hiçbir şey yapma
            if (status === 'accepted') {
              continue;
            }

            // Eğer pending/a_accepted/b_accepted ise ve son bildirim 24 saatten eskiyse
            const lastNotified = new Date(existingPair.last_notified_at);
            const hoursSinceNotification = (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);

            if (hoursSinceNotification >= 24) {
              // last_notified_at güncelle (ama MVP'de tek bildirim yeterli, bu yüzden şimdilik yapmıyoruz)
              // İsterseniz burada tekrar bildirim gönderebilirsiniz
            }
          }
        }

        return {
          nearbyCount: nearbyUserIds.length,
          newlyCreatedPairIds,
        };
      }),

    // Proximity pair'e cevap ver (accept/reject/block)
    respondToProximityPair: protectedProcedure
      .input(
        z.object({
          pairId: z.string().uuid(),
          action: z.enum(['accept', 'reject', 'block']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });

        // Pair'i bul ve kullanıcının bu pair'de olduğundan emin ol
        const { data: pair, error: pairError } = await supabase
          .from('proximity_pairs')
          .select('*')
          .eq('id', input.pairId)
          .single();

        if (pairError || !pair) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Eşleşme bulunamadı' });
        }

        // Kullanıcının bu pair'de olup olmadığını kontrol et
        if (pair.user_a_id !== user.id && pair.user_b_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu eşleşmeye erişim yetkiniz yok' });
        }

        let newStatus: 'pending' | 'a_accepted' | 'b_accepted' | 'accepted' | 'rejected' | 'blocked' = pair.status;

        if (input.action === 'block') {
          newStatus = 'blocked';
        } else if (input.action === 'reject') {
          newStatus = 'rejected';
        } else if (input.action === 'accept') {
          const isUserA = pair.user_a_id === user.id;

          if (pair.status === 'pending') {
            newStatus = isUserA ? 'a_accepted' : 'b_accepted';
          } else if (pair.status === 'a_accepted' && !isUserA) {
            newStatus = 'accepted';
          } else if (pair.status === 'b_accepted' && isUserA) {
            newStatus = 'accepted';
          }
        }

        // Status'u güncelle
        const { data: updatedPair, error: updateError } = await supabase
          .from('proximity_pairs')
          .update({ status: newStatus })
          .eq('id', input.pairId)
          .select()
          .single();

        if (updateError) {
          console.error('Proximity pair update error:', updateError);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Eşleşme güncellenemedi' });
        }

        // Eğer status 'accepted' olduysa, proximity_contacts tablosuna ekle
        if (newStatus === 'accepted') {
          // Her iki kullanıcı için de contact kaydı oluştur
          await supabase
            .from('proximity_contacts')
            .upsert([
              {
                user_id: pair.user_a_id,
                contact_user_id: pair.user_b_id,
                proximity_pair_id: pair.id,
              },
              {
                user_id: pair.user_b_id,
                contact_user_id: pair.user_a_id,
                proximity_pair_id: pair.id,
              },
            ], {
              onConflict: 'user_id,contact_user_id',
            });

          // Her iki kullanıcıya da "Eşleştiniz" bildirimi gönder
          await createMatchNotification(supabase, pair.user_a_id, pair.user_b_id, pair.id);
        }

        return {
          success: true,
          status: newStatus,
          pair: updatedPair,
        };
      }),

    // Bekleyen proximity pair'leri getir (kullanıcıya gösterilecek bildirimler)
    getPendingProximityPairs: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });

        // Kullanıcının dahil olduğu pending/a_accepted/b_accepted pair'leri getir
        const { data: pairs, error } = await supabase
          .from('proximity_pairs')
          .select('*')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .in('status', ['pending', 'a_accepted', 'b_accepted'])
          .order('last_notified_at', { ascending: false });

        if (error) {
          console.error('Get pending proximity pairs error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Eşleşmeler yüklenemedi' });
        }

        return {
          pairs: pairs || [],
        };
      }),

    // Kabul edilen proximity contacts'leri getir
    getProximityContacts: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });

        const { data: contacts, error } = await supabase
          .from('proximity_contacts')
          .select(`
            *,
            contact:profiles!proximity_contacts_contact_user_id_fkey(
              id,
              full_name,
              username,
              avatar_url,
              verified
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Get proximity contacts error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Kişiler yüklenemedi' });
        }

        return {
          contacts: contacts || [],
        };
      }),
  }),

  post: createTRPCRouter({
    createPost: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1).max(2000),
          media_urls: z.array(z.string()).max(5).optional(),
          visibility: z.enum(["public", "friends", "private"]).default("public"),
          district: z.string(),
          mentions: z.array(z.string().uuid()).optional(),
          room_id: z.string().uuid().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        if (input.room_id) {
          const { data: member, error: memberError } = await supabase
            .from('chat_members')
            .select('id')
            .eq('room_id', input.room_id)
            .eq('user_id', user.id)
            .single();

          if (memberError || !member) {
            throw new Error("Bu gruba gönderi oluşturma yetkiniz yok.");
          }
          input.visibility = "public";
        }

        const hashtags = extractHashtags(input.content);
        
        let media = null;
        if (input.media_urls && input.media_urls.length > 0) {
          media = input.media_urls.map(url => ({
            type: url.toLowerCase().includes('video') ? 'video' : 'image',
            path: url
          }));
        }

        const { data, error } = await supabase
          .from("posts")
          .insert({
            author_id: user.id,
            content: input.content,
            media: media,
            hashtags: hashtags.length > 0 ? hashtags : null,
            mentions: input.mentions && input.mentions.length > 0 ? input.mentions : null,
            visibility: input.visibility,
            district: input.district,
            room_id: input.room_id,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            views_count: 0,
            is_pinned: false,
            edited: false,
            archived: false,
            is_deleted: false,
          })
          .select(`
            *,
            author:profiles!posts_author_id_fkey(*)
          `)
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),

    getPosts: publicProcedure
      .input(
        z.object({
          district: z.string().optional(),
          sort: z.enum(["new", "hot", "trending"]).default("new"),
          visibility: z.enum(["public", "friends", "private"]).optional(),
          archived: z.boolean().default(false),
          author_id: z.string().uuid().optional(),
          room_id: z.string().uuid().nullable().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;

        let query = supabase
          .from("posts")
          .select(
            `
            *,
            author:profiles!posts_author_id_fkey(
              id,
              full_name,
              username,
              avatar_url,
              verified,
              supporter_badge,
              supporter_badge_visible,
              supporter_badge_color
            )
          `,
            { count: "exact" }
          )
          .eq("archived", input.archived)
          .eq("is_deleted", false);

        if (input.room_id) {
          query = query.eq('room_id', input.room_id);
          if (user) {
            const { data: member } = await supabase
              .from('chat_members')
              .select('id')
              .eq('room_id', input.room_id)
              .eq('user_id', user.id)
              .single();

            if (!member) {
              throw new Error("Bu grubun gönderilerini görüntüleme yetkiniz yok.");
            }
          } else {
            throw new Error("Bu grubun gönderilerini görüntülemek için giriş yapmalısınız.");
          }
        } else {
          query = query.is('room_id', null);
        }

        if (input.district && input.district !== "all") {
          query = query.eq("district", input.district);
        }

        if (input.author_id) {
          query = query.eq("author_id", input.author_id);
          if (user && input.author_id === user.id) {
            // User viewing own posts - show all visibility levels
          } else {
            if (!input.visibility) {
              query = query.eq("visibility", "public");
            }
          }
        } else {
          if (input.visibility) {
            query = query.eq("visibility", input.visibility);
          } else {
            query = query.eq("visibility", "public");
          }
        }

        if (input.sort === "new") {
          query = query.order("created_at", { ascending: false });
        } else if (input.sort === "hot") {
          // Hot: Son 24 saat içindeki engagement'e göre
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", oneDayAgo);
          // Engagement score: (like_count * 2 + comment_count * 3) / hours_since_post
          query = query.order("like_count", { ascending: false });
          query = query.order("comment_count", { ascending: false });
          query = query.order("created_at", { ascending: false });
        } else if (input.sort === "trending") {
          // Trending: Son 7 gün içindeki engagement'e göre - en çok beğeni ve yorum alan videolar önce
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", oneWeekAgo);
          // Engagement score: like_count + comment_count * 1.5
          query = query.order("like_count", { ascending: false });
          query = query.order("comment_count", { ascending: false });
          query = query.order("created_at", { ascending: false });
        }

        query = query.range(input.offset, input.offset + input.limit - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error("Error fetching posts:", error);
          throw new Error(error.message);
        }

        let postsWithLikes = data || [];
        
        // Trending için video post'ları önce sırala (en çok beğeni/yorum alan videolar)
        if (input.sort === "trending" && postsWithLikes.length > 0) {
          const videoPosts: any[] = [];
          const nonVideoPosts: any[] = [];
          
          postsWithLikes.forEach((post: any) => {
            const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
            const isVideo = firstMedia && (firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i));
            
            if (isVideo) {
              videoPosts.push(post);
            } else {
              nonVideoPosts.push(post);
            }
          });
          
          // Video post'ları engagement'e göre sırala (beğeni + yorum * 1.5)
          videoPosts.sort((a: any, b: any) => {
            const aScore = (a.like_count || 0) + (a.comment_count || 0) * 1.5;
            const bScore = (b.like_count || 0) + (b.comment_count || 0) * 1.5;
            return bScore - aScore;
          });
          
          // Önce videolar, sonra diğerleri
          postsWithLikes = [...videoPosts, ...nonVideoPosts];
        }
        
        if (user) {
          const postIds = postsWithLikes.map((p: any) => p.id);
          if (postIds.length > 0) {
            const { data: likes } = await supabase
              .from("post_likes")
              .select("post_id")
              .in("post_id", postIds)
              .eq("user_id", user.id);

            const likedPostIds = new Set(likes?.map((l: any) => l.post_id) || []);
            postsWithLikes = postsWithLikes.map((post: any) => ({
              ...post,
              is_liked: likedPostIds.has(post.id)
            }));
          }
        }

        return {
          posts: postsWithLikes,
          total: count || 0,
        };
      }),

    likePost: protectedProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data: existing } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", input.postId)
          .eq("user_id", user.id)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", input.postId)
            .eq("user_id", user.id);

          if (error) throw new Error(error.message);
          return { liked: false };
        }

        const { error } = await supabase
          .from("post_likes")
          .insert({
            post_id: input.postId,
            user_id: user.id,
          });

        if (error) throw new Error(error.message);

        // Beğeni bildirimi oluştur
        try {
          const { data: post } = await supabase
            .from('posts')
            .select('author_id, author:profiles!posts_author_id_fkey(full_name)')
            .eq('id', input.postId)
            .single();

          if (post && post.author_id && post.author_id !== user.id) {
            const { data: likerProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();

            const likerName = likerProfile?.full_name || 'Bir kullanıcı';
            const { data: notification } = await supabase
              .from('notifications')
              .insert({
                user_id: post.author_id,
                type: 'SYSTEM',
                title: 'Yeni Beğeni',
                body: `${likerName} gönderinizi beğendi`,
                data: {
                  type: 'LIKE',
                  post_id: input.postId,
                  liker_id: user.id,
                  liker_name: likerName,
                },
                push_sent: false,
              })
              .select()
              .single();

            // Push bildirimi gönder
            if (notification) {
              const { data: targetProfile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('id', post.author_id)
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
                      title: 'Yeni Beğeni',
                      body: `${likerName} gönderinizi beğendi`,
                      data: {
                        type: 'LIKE',
                        postId: input.postId,
                      },
                      badge: 1,
                    }),
                  });

                  await supabase
                    .from('notifications')
                    .update({ push_sent: true })
                    .eq('id', notification.id);
                } catch (pushError) {
                  console.error('Like push notification error:', pushError);
                }
              }
            }
          }
        } catch (notificationError) {
          console.error('Like notification error:', notificationError);
          // Bildirim hatası olsa bile beğeni işlemi başarılı, devam et
        }

        return { liked: true };
      }),

    deletePost: protectedProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data: post, error: fetchError } = await supabase
          .from("posts")
          .select("*")
          .eq("id", input.postId)
          .eq("author_id", user.id)
          .single();

        if (fetchError || !post) {
          throw new Error("Post bulunamadı veya yetkisiz erişim");
        }

        const { count: shareCount } = await supabase
          .from('post_shares')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', input.postId);

        if (shareCount && shareCount > 0) {
          const { error: softDeleteError } = await supabase
            .from('posts')
            .update({ is_deleted: true, archived: true })
            .eq('id', input.postId);

          if (softDeleteError) throw new Error(softDeleteError.message);
          return { success: true, message: "Gönderi paylaşıldığı için arşivlendi." };
        }

        if (post.media && Array.isArray(post.media)) {
          for (const mediaItem of post.media) {
            if (mediaItem.path) {
              const path = mediaItem.path.split("/storage/v1/object/public/posts/")[1] || 
                           mediaItem.path.split("posts/")[1];
              if (path) {
                await supabase.storage.from("posts").remove([path]);
              }
            }
          }
        }

        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", input.postId)
          .eq("author_id", user.id);

        if (error) throw new Error(error.message);
        return { success: true };
      }),

    updatePost: protectedProcedure
      .input(
        z.object({
          postId: z.string().uuid(),
          content: z.string().min(1).max(2000).optional(),
          district: z.string().optional(),
          media_urls: z.array(z.string()).max(5).optional(),
          visibility: z.enum(["public", "friends", "private"]).optional(),
          mentions: z.array(z.string().uuid()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data: existingPost, error: fetchError } = await supabase
          .from("posts")
          .select("*")
          .eq("id", input.postId)
          .eq("author_id", user.id)
          .single();

        if (fetchError || !existingPost) {
          throw new Error("Post bulunamadı veya yetkisiz erişim");
        }

        const updateData: any = {
          updated_at: new Date().toISOString(),
          edited: true,
        };

        if (input.content !== undefined) {
          updateData.content = input.content;
          updateData.hashtags = extractHashtags(input.content);
        }

        if (input.district !== undefined) updateData.district = input.district;

        if (input.media_urls !== undefined) {
          if (input.media_urls.length > 0) {
            updateData.media = input.media_urls.map((url: string) => ({
              type: url.toLowerCase().includes('video') ? 'video' : 'image',
              path: url
            }));
          } else {
            updateData.media = null;
          }
        }

        if (input.visibility !== undefined) updateData.visibility = input.visibility;
        if (input.mentions !== undefined) updateData.mentions = input.mentions.length > 0 ? input.mentions : null;

        const { data, error } = await supabase
          .from("posts")
          .update(updateData)
          .eq("id", input.postId)
          .eq("author_id", user.id)
          .select(`
            *,
            author:profiles!posts_author_id_fkey(*)
          `)
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),

    uploadMedia: protectedProcedure
      .input(z.object({
        base64Data: z.string(),
        fileType: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const fileData = base64ToUint8Array(input.base64Data);
        const filePath = `${user.id}/${Date.now()}-${input.fileName}`;

        const { data, error } = await supabase.storage
          .from("posts")
          .upload(filePath, fileData, {
            contentType: input.fileType,
            upsert: false,
          });

        if (error) throw new Error(error.message);

        const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(data.path);

        return { url: publicUrl, path: data.path };
      }),

    getPostDetail: publicProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;

        const { data: post, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!posts_author_id_fkey(
              id,
              full_name,
              username,
              avatar_url,
              verified,
              supporter_badge,
              supporter_badge_visible,
              supporter_badge_color
            )
          `)
          .eq('id', input.postId)
          .eq('is_deleted', false)
          .single();

        if (error) throw new Error(error.message);

        let is_liked = false;
        if (user) {
          const { data: liked } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", input.postId)
            .eq("user_id", user.id)
            .single();
          
          is_liked = !!liked;
        }

        return {
          ...post,
          is_liked,
        };
      }),

    addComment: protectedProcedure
      .input(
        z.object({
          post_id: z.string().uuid(),
          content: z.string().min(1).max(1000),
          mentions: z.array(z.string().uuid()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        // Önce posts tablosunda kontrol et
        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('id')
          .eq('id', input.post_id)
          .eq('is_deleted', false)
          .single();

        // Eğer post bulunamazsa, event'lerde kontrol et
        if (postError || !post) {
          const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id')
            .eq('id', input.post_id)
            .eq('is_deleted', false)
            .single();

          if (eventError || !event) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Gönderi bulunamadı' });
          }
          // Event bulundu, devam et (event'ler için de yorum eklenebilir)
        }

        const { data, error } = await supabase
          .from("comments")
          .insert({
            post_id: input.post_id,
            user_id: user.id,
            content: input.content,
            likes_count: 0,
          })
          .select(`
            *,
            user:profiles!comments_user_id_fkey(*)
          `)
          .single();

        if (error) throw new Error(error.message);

        // Yorum bildirimi oluştur
        try {
          // Post veya event'in sahibini bul
          let postAuthorId: string | null = null;
          const { data: post } = await supabase
            .from('posts')
            .select('author_id')
            .eq('id', input.post_id)
            .single();

          if (post) {
            postAuthorId = post.author_id;
          } else {
            const { data: event } = await supabase
              .from('events')
              .select('user_id')
              .eq('id', input.post_id)
              .single();
            if (event) {
              postAuthorId = event.user_id;
            }
          }

          if (postAuthorId && postAuthorId !== user.id) {
            const { data: commenterProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();

            const commenterName = commenterProfile?.full_name || 'Bir kullanıcı';
            const { data: notification } = await supabase
              .from('notifications')
              .insert({
                user_id: postAuthorId,
                type: 'SYSTEM',
                title: 'Yeni Yorum',
                body: `${commenterName} gönderinize yorum yaptı: ${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}`,
                data: {
                  type: 'COMMENT',
                  post_id: input.post_id,
                  comment_id: data.id,
                  commenter_id: user.id,
                  commenter_name: commenterName,
                },
                push_sent: false,
              })
              .select()
              .single();

            // Push bildirimi gönder
            if (notification) {
              const { data: targetProfile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('id', postAuthorId)
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
                      title: 'Yeni Yorum',
                      body: `${commenterName} gönderinize yorum yaptı`,
                      data: {
                        type: 'COMMENT',
                        postId: input.post_id,
                      },
                      badge: 1,
                    }),
                  });

                  await supabase
                    .from('notifications')
                    .update({ push_sent: true })
                    .eq('id', notification.id);
                } catch (pushError) {
                  console.error('Comment push notification error:', pushError);
                }
              }
            }
          }
        } catch (notificationError) {
          console.error('Comment notification error:', notificationError);
          // Bildirim hatası olsa bile yorum işlemi başarılı, devam et
        }

        return data;
      }),

    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
        }

        const { data: comment, error: fetchError } = await supabase
          .from("comments")
          .select("*")
          .eq("id", input.commentId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !comment) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Yorum bulunamadı veya yetkisiz erişim' 
          });
        }

        const { error } = await supabase
          .from("comments")
          .delete()
          .eq("id", input.commentId)
          .eq("user_id", user.id);

        if (error) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: error.message 
          });
        }

        return { success: true };
      }),

    updateComment: protectedProcedure
      .input(
        z.object({
          commentId: z.string().uuid(),
          content: z.string().min(1).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
        }

        // Yorumun kullanıcıya ait olduğunu ve post'un hala var olduğunu kontrol et
        const { data: comment, error: fetchError } = await supabase
          .from("comments")
          .select("*, post_id")
          .eq("id", input.commentId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !comment) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Yorum bulunamadı veya yetkisiz erişim' 
          });
        }

        // Post'un hala var olduğunu kontrol et (posts veya events tablosunda)
        const { data: post, error: postError } = await supabase
          .from("posts")
          .select("id")
          .eq("id", comment.post_id)
          .eq("is_deleted", false)
          .single();

        // Eğer posts'ta yoksa events'te kontrol et
        let postExists = !!post;
        if (postError || !post) {
          const { data: event } = await supabase
            .from("events")
            .select("id")
            .eq("id", comment.post_id)
            .eq("is_deleted", false)
            .single();
          postExists = !!event;
        }

        if (!postExists) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Gönderi bulunamadı veya silinmiş' 
          });
        }

        // Sadece content ve updated_at güncelle (foreign key'leri değiştirme)
        const { data, error } = await supabase
          .from("comments")
          .update({
            content: input.content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.commentId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: error.message 
          });
        }

        return data;
      }),

    getComments: publicProcedure
      .input(
        z.object({
          post_id: z.string().uuid(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;

        const { data, error, count } = await supabase
          .from("comments")
          .select(
            `
            *,
            user:profiles!comments_user_id_fkey(
              id,
              full_name,
              username,
              avatar_url,
              verified,
              supporter_badge,
              supporter_badge_visible,
              supporter_badge_color
            )
          `,
            { count: "exact" }
          )
          .eq("post_id", input.post_id)
          .order("created_at", { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) throw new Error(error.message);

        let commentsWithLikes = data || [];
        
        if (user) {
          const commentIds = commentsWithLikes.map((c: any) => c.id);
          if (commentIds.length > 0) {
            const { data: likes } = await supabase
              .from("comment_likes")
              .select("comment_id")
              .in("comment_id", commentIds)
              .eq("user_id", user.id);

            const likedCommentIds = new Set(likes?.map((l: any) => l.comment_id) || []);
            commentsWithLikes = commentsWithLikes.map((comment: any) => ({
              ...comment,
              is_liked: likedCommentIds.has(comment.id)
            }));
          }
        }

        return {
          comments: commentsWithLikes,
          total: count || 0,
        };
      }),

    toggleCommentLike: protectedProcedure
      .input(z.object({ comment_id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data: existing } = await supabase
          .from("comment_likes")
          .select("id")
          .eq("comment_id", input.comment_id)
          .eq("user_id", user.id)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("comment_likes")
            .delete()
            .eq("comment_id", input.comment_id)
            .eq("user_id", user.id);

          if (error) throw new Error(error.message);
          return { liked: false };
        }

        const { error } = await supabase
          .from("comment_likes")
          .insert({
            comment_id: input.comment_id,
            user_id: user.id,
          });

        if (error) throw new Error(error.message);
        return { liked: true };
      }),

    sharePost: protectedProcedure
      .input(z.object({ 
        post_id: z.string().uuid(),
        share_to: z.enum(["feed", "story", "external"]).default("feed"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data, error } = await supabase
          .from("post_shares")
          .insert({
            post_id: input.post_id,
            user_id: user.id,
            share_to: input.share_to,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),

    getPersonalizedFeed: protectedProcedure
      .input(
        z.object({
          district: z.string().optional(),
          sort: z.enum(["new", "hot", "trending"]).default("new"),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        // Önce takip edilen kullanıcıları al
        const { data: following } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = following?.map(f => f.following_id) || [];
        const authorFilterIds = Array.from(new Set([...followingIds, user.id]));
        const hasFollowing = authorFilterIds.length > 1;

        // Post sorgusu oluştur
        let query = supabase
          .from("posts")
          .select(
            `
            *,
            author:profiles!posts_author_id_fkey(*)
          `,
            { count: "exact" }
          )
          .eq("archived", false)
          .eq("is_deleted", false)
          .is('room_id', null)
          .eq("visibility", "public");

        // Takip edilen kullanıcılar varsa sadece onları göster, yoksa herkese açık feed'i kullan
        if (hasFollowing) {
          query = query.in("author_id", authorFilterIds);
        }

        // District filtresi
        if (input.district && input.district !== "all") {
          query = query.eq("district", input.district);
        }

        // Sorting
        if (input.sort === "new") {
          query = query.order("created_at", { ascending: false });
        } else if (input.sort === "hot" || input.sort === "trending") {
          query = query.order("like_count", { ascending: false });
          query = query.order("created_at", { ascending: false });
        }

        query = query.range(input.offset, input.offset + input.limit - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error("Error fetching personalized feed:", error);
          throw new Error(error.message);
        }

        // Like durumlarını kontrol et
        let postsWithLikes = data || [];
        const postIds = postsWithLikes.map((p: any) => p.id);
        if (postIds.length > 0) {
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .in("post_id", postIds)
            .eq("user_id", user.id);

          const likedPostIds = new Set(likes?.map((l: any) => l.post_id) || []);
          postsWithLikes = postsWithLikes.map((post: any) => ({
            ...post,
            is_liked: likedPostIds.has(post.id)
          }));
        }

        return {
          posts: postsWithLikes,
          total: count || 0,
        };
      }),

    getReelsFeed: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data, error } = await supabase.rpc('get_reels_feed', {
          p_user_id: user.id,
          p_limit: input.limit,
          p_offset: input.offset,
        });

        if (error) {
          console.error("Error fetching reels feed:", error);
          throw new Error(error.message);
        }

        return data || [];
      }),

    trackPostView: protectedProcedure
      .input(z.object({ 
        post_id: z.string().uuid(),
        view_started_at: z.string().optional(),
        view_completed_at: z.string().optional(),
        view_duration_seconds: z.number().optional(),
        completion_rate: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { error } = await supabase
          .from('post_views')
          .insert({ 
            post_id: input.post_id, 
            user_id: user.id,
            view_started_at: input.view_started_at,
            view_completed_at: input.view_completed_at,
            view_duration_seconds: input.view_duration_seconds,
            completion_rate: input.completion_rate,
          });

        if (error) {
          console.error("Error tracking post view:", error);
        }
        return { success: true };
      }),

    uploadReel: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1).max(2000),
          video_url: z.string().url(),
          thumbnail_url: z.string().url().optional(),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
          duration_seconds: z.number().int().positive(), // Süre sınırı kaldırıldı
          tags: z.array(z.string()).optional(),
          district: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const hashtags = extractHashtags(input.content);

        const { data, error } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            type: 'reel',
            video_url: input.video_url,
            thumbnail_url: input.thumbnail_url,
            content: input.content,
            duration_seconds: input.duration_seconds,
            width: input.width,
            height: input.height,
            hashtags: hashtags,
            district: input.district,
            visibility: 'public',
          })
          .select()
          .single();

        if (error) {
          console.error("Error uploading reel:", error);
          throw new Error(error.message);
        }
        return data;
      }),

    getReels: publicProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!posts_author_id_fkey(id, full_name, avatar_url)
          `)
          .eq('type', 'reel')
          .eq('is_deleted', false)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          console.error("Error fetching reels:", error);
          throw new Error(error.message);
        }
        return data || [];
      }),

    trackReelView: protectedProcedure
      .input(
        z.object({
          reel_id: z.string().uuid(),
          watch_start: z.string().optional(),
          watch_end: z.string().optional(),
          completed: z.boolean().default(false),
          duration_watched: z.number().int().min(0).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { error } = await supabase
          .from('reel_views')
          .insert({
            reel_id: input.reel_id,
            user_id: user.id,
            watch_start: input.watch_start,
            watch_end: input.watch_end,
            completed: input.completed,
            duration_watched: input.duration_watched,
          });

        if (error) {
          console.error("Error tracking reel view:", error);
        }
        return { success: true, view_id: '' };
      }),

    likeReel: protectedProcedure
      .input(z.object({ reel_id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data: existingLike, error: fetchError } = await supabase
          .from("reel_likes")
          .select("id")
          .eq("reel_id", input.reel_id)
          .eq("user_id", user.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw new Error(fetchError.message);
        }

        if (existingLike) {
          const { error: deleteError } = await supabase
            .from("reel_likes")
            .delete()
            .eq("id", existingLike.id);

          if (deleteError) throw new Error(deleteError.message);
          return { liked: false };
        }

        const { error: insertError } = await supabase
          .from("reel_likes")
          .insert({ reel_id: input.reel_id, user_id: user.id });

        if (insertError) throw new Error(insertError.message);
        return { liked: true };
      }),

    shareReel: protectedProcedure
      .input(z.object({ 
        reel_id: z.string().uuid(),
        platform: z.enum(['internal', 'instagram', 'whatsapp', 'external']).default('internal'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        // Reel'in var olup olmadığını kontrol et
        const { data: reel, error: reelError } = await supabase
          .from('posts')
          .select('id, is_deleted, type')
          .eq('id', input.reel_id)
          .eq('type', 'reel')
          .single();

        if (reelError || !reel || reel.is_deleted) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Paylaşılacak reel bulunamadı veya silinmiş.",
          });
        }

        // Daha önce paylaşılmış mı kontrol et
        const { data: existingShare } = await supabase
          .from('reel_shares')
          .select('id')
          .eq('reel_id', input.reel_id)
          .eq('user_id', user.id)
          .single();

        if (existingShare) {
          // Zaten paylaşılmış, mevcut kaydı döndür
          return existingShare;
        }

        // Yeni paylaşım oluştur
        const { data, error } = await supabase
          .from('reel_shares')
          .insert({ reel_id: input.reel_id, user_id: user.id, platform: input.platform })
          .select()
          .single();

        if (error) {
          // Unique constraint hatası ise, mevcut kaydı getir
          if (error.code === '23505') {
            const { data: existing } = await supabase
              .from('reel_shares')
              .select('*')
              .eq('reel_id', input.reel_id)
              .eq('user_id', user.id)
              .single();
            if (existing) return existing;
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || "Reel paylaşılırken bir hata oluştu.",
          });
        }
        
        return data;
      }),
  }),

  chat: createTRPCRouter({
    getRooms: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const { data: membershipRows, error: membershipError } = await ctx.supabase
          .from('chat_members')
          .select('room_id, unread_count, role, last_read_at')
          .eq('user_id', userId);

        if (membershipError) {
          console.error('Failed to fetch user chat memberships', membershipError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Chat odaları yüklenemedi: ${membershipError.message ?? 'Üyelik bilgisi alınamadı'}`,
          });
        }

        const memberships = (membershipRows ?? []) as any[];

        if (memberships.length === 0) {
          return [];
        }

        const membershipMap = memberships.reduce<Record<string, any>>((acc, membership) => {
          acc[membership.room_id] = membership;
          return acc;
        }, {});

        const roomIds = memberships.map((membership) => membership.room_id);

        const { data: roomsData, error: roomsError } = await ctx.supabase
          .from('chat_rooms')
          .select('id, name, avatar_url, type, district, last_message_at, created_by, created_at')
          .in('id', roomIds);

        if (roomsError) {
          console.error('Failed to fetch chat rooms list', roomsError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Chat odaları yüklenemedi: ${roomsError.message ?? 'Sohbet listesi alınamadı'}`,
          });
        }

        const sortedRooms = ((roomsData ?? []) as any[]).sort((a, b) => {
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return timeB - timeA;
        });

        const paginatedRooms = sortedRooms.slice(input.offset, input.offset + input.limit);

        const roomsWithLastMessage = await Promise.all(
          paginatedRooms.map(async (room) => {
            const { data: lastMessage } = await ctx.supabase
              .from('messages')
              .select('*, user:profiles(*)')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const { data: memberRows } = await ctx.supabase
              .from('chat_members')
              .select('id, room_id, user_id, role, unread_count, last_read_at, joined_at, user:profiles(*)')
              .eq('room_id', room.id);

            const members = (memberRows ?? []) as any[];

            const otherUser = room.type === 'direct'
              ? members.find((member) => member.user_id !== userId)?.user ?? null
              : null;

            const membership = membershipMap[room.id];

            return {
              ...room,
              last_message: lastMessage ?? null,
              members,
              other_user: otherUser,
              unread_count: membership?.unread_count ?? 0,
            };
          })
        );

        return roomsWithLastMessage;
      }),

    getMessages: protectedProcedure
      .input(
        z.object({
          roomId: z.string(),
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
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

        const { data: messages, error } = await ctx.supabase
          .from('messages')
          .select(`
            *,
            user:profiles(*),
            reply_to_message:messages!reply_to(
              id,
              content,
              user:profiles(full_name, avatar_url)
            )
          `)
          .eq('room_id', input.roomId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          console.error('Error fetching messages:', error);
          throw new Error('Failed to fetch messages');
        }

        return messages || [];
      }),

    sendMessage: protectedProcedure
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

        // Push notification gönder - mesajı alan diğer kullanıcılara
        try {
          // Oda üyelerini al (mesajı gönderen hariç)
          const { data: roomMembers, error: membersError } = await ctx.supabase
            .from('chat_members')
            .select('user_id')
            .eq('room_id', input.roomId)
            .neq('user_id', userId);

          if (!membersError && roomMembers && roomMembers.length > 0) {
            const recipientIds = roomMembers.map((m: any) => m.user_id);

            // Push token'ları al
            const { data: profiles, error: profilesError } = await ctx.supabase
              .from('profiles')
              .select('id, push_token, full_name')
              .in('id', recipientIds);

            if (!profilesError && profiles) {
              // Gönderen kullanıcının bilgisini al
              const { data: senderProfile } = await ctx.supabase
                .from('profiles')
                .select('full_name')
                .eq('id', userId)
                .maybeSingle();

              const senderName = senderProfile?.full_name || 'Birisi';
              const pushTokens = profiles
                .filter((p: any) => p.push_token)
                .map((p: any) => p.push_token);

              // Her token için push notification gönder
              if (pushTokens.length > 0) {
                const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
                const messages = pushTokens.map((token: string) => ({
                  to: token,
                  title: 'MyTrabzon',
                  body: 'Yeni mesajın var',
                  sound: 'default',
                  badge: 1,
                  data: {
                    type: 'NEW_MESSAGE',
                    conversationId: input.roomId,
                    senderId: userId,
                    senderName: senderName,
                  },
                }));

                const response = await fetch(expoPushUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                  },
                  body: JSON.stringify(messages),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('❌ [PushNotification] Expo Push API hatası:', errorText);
                } else {
                  const result = await response.json();
                  console.log('✅ [PushNotification] Push notification gönderildi:', {
                    successCount: result.data?.filter((r: any) => r.status === 'ok').length || 0,
                    totalCount: pushTokens.length,
                  });
                }
              }
            }
          }
        } catch (pushError: any) {
          // Push notification hatası mesaj göndermeyi engellemez
          console.error('❌ [PushNotification] Push notification gönderme hatası:', pushError);
        }

        return message;
      }),

    createRoom: protectedProcedure
      .input(
        z.object({
          type: z.enum(['direct', 'group', 'district']),
          name: z.string().optional(),
          memberIds: z.array(z.string()),
          district: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        if (input.type === 'direct' && input.memberIds.length !== 1) {
          throw new Error('Direct chat requires exactly one other member');
        }

        if (input.type === 'direct') {
          const otherUserId = input.memberIds[0];
          
          const { data: existingRoom } = await ctx.supabase
            .from('chat_members')
            .select('room_id, chat_rooms!inner(*)')
            .eq('user_id', userId)
            .eq('chat_rooms.type', 'direct');

          if (existingRoom) {
            for (const room of existingRoom) {
              const { data: members } = await ctx.supabase
                .from('chat_members')
                .select('user_id')
                .eq('room_id', room.room_id);

              const memberUserIds = (members || []).map((m: any) => m.user_id);
              if (
                memberUserIds.length === 2 &&
                memberUserIds.includes(userId) &&
                memberUserIds.includes(otherUserId)
              ) {
                return room.chat_rooms;
              }
            }
          }
        }

        const { data: room, error: roomError } = await ctx.supabase
          .from('chat_rooms')
          .insert({
            type: input.type,
            name: input.name || null,
            district: input.district || null,
            created_by: userId,
          })
          .select('*')
          .single();

        if (roomError || !room) {
          console.error('Error creating room:', roomError);
          throw new Error('Failed to create room');
        }

        const allMemberIds = [userId, ...input.memberIds];
        const memberInserts = allMemberIds.map((memberId, index) => ({
          room_id: room.id,
          user_id: memberId,
          role: index === 0 ? 'admin' : 'member',
        }));

        const { error: membersError } = await ctx.supabase
          .from('chat_members')
          .insert(memberInserts);

        if (membersError) {
          console.error('Error adding members:', membersError);
          await ctx.supabase.from('chat_rooms').delete().eq('id', room.id);
          throw new Error('Failed to add members to room');
        }

        return room;
      }),

    markAsRead: protectedProcedure
      .input(z.object({ roomId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const { error } = await ctx.supabase
          .from('chat_members')
          .update({
            unread_count: 0,
            last_read_at: new Date().toISOString(),
          })
          .eq('room_id', input.roomId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error marking as read:', error);
          throw new Error('Failed to mark messages as read');
        }

      return { success: true };
    }),

    addMembers: protectedProcedure
      .input(
        z.object({
          roomId: z.string(),
          memberIds: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // Room'un grup olduğunu ve kullanıcının üye olduğunu kontrol et
        const { data: room, error: roomError } = await ctx.supabase
          .from('chat_rooms')
          .select('type, created_by')
          .eq('id', input.roomId)
          .single();

        if (roomError || !room) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Grup bulunamadı',
          });
        }

        if (room.type !== 'group') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Bu işlem sadece gruplar için geçerlidir',
          });
        }

        // Kullanıcının grup üyesi olduğunu kontrol et
        const { data: member, error: memberError } = await ctx.supabase
          .from('chat_members')
          .select('role')
          .eq('room_id', input.roomId)
          .eq('user_id', userId)
          .single();

        if (memberError || !member) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Bu grubun üyesi değilsiniz',
          });
        }

        // Zaten üye olan kullanıcıları filtrele
        const { data: existingMembers } = await ctx.supabase
          .from('chat_members')
          .select('user_id')
          .eq('room_id', input.roomId)
          .in('user_id', input.memberIds);

        const existingMemberIds = existingMembers?.map(m => m.user_id) || [];
        const newMemberIds = input.memberIds.filter(id => !existingMemberIds.includes(id));

        if (newMemberIds.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seçilen kullanıcılar zaten grup üyesi',
          });
        }

        // Yeni üyeleri ekle
        const memberInserts = newMemberIds.map(memberId => ({
          room_id: input.roomId,
          user_id: memberId,
          role: 'member',
        }));

        const { error: insertError } = await ctx.supabase
          .from('chat_members')
          .insert(memberInserts);

        if (insertError) {
          console.error('Error adding members:', insertError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Üyeler eklenirken hata oluştu',
          });
        }

        return { success: true, addedCount: newMemberIds.length };
      }),

    deleteMessage: protectedProcedure
      .input(z.object({ messageId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const { data: message, error: fetchError } = await ctx.supabase
          .from('messages')
          .select('*')
          .eq('id', input.messageId)
          .single();

        if (fetchError || !message) {
          throw new Error('Message not found');
        }

        if (message.user_id !== userId) {
          throw new Error('Not authorized to delete this message');
        }

        const { error } = await ctx.supabase
          .from('messages')
          .delete()
          .eq('id', input.messageId);

        if (error) {
          console.error('Error deleting message:', error);
          throw new Error('Failed to delete message');
        }

        return { success: true };
      }),

    deleteAllMessages: protectedProcedure
      .input(z.object({ roomId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // Check if user is a member of the room
        const { data: member, error: memberError } = await ctx.supabase
          .from('chat_members')
          .select('room_id, role')
          .eq('room_id', input.roomId)
          .eq('user_id', userId)
          .single();

        if (memberError || !member) {
          throw new Error('Bu odaya erişim yetkiniz yok');
        }

        // Check if user is the room creator or has admin role
        const { data: room, error: roomError } = await ctx.supabase
          .from('chat_rooms')
          .select('created_by, type')
          .eq('id', input.roomId)
          .single();

        if (roomError || !room) {
          throw new Error('Oda bulunamadı');
        }

        // Only room creator or admin can delete all messages
        if (room.created_by !== userId && member.role !== 'admin') {
          throw new Error('Sadece oda kurucusu veya admin tüm mesajları silebilir');
        }

        // Delete all messages in the room
        const { error: deleteError } = await ctx.supabase
          .from('messages')
          .delete()
          .eq('room_id', input.roomId);

        if (deleteError) {
          throw new Error('Mesajlar silinemedi');
        }

        return { success: true, deletedCount: 'all' };
      }),

    startCall: protectedProcedure
      .input(
        z.object({
          roomId: z.string().uuid(),
          targetUserId: z.string().uuid(),
          callType: z.enum(['audio', 'video']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const callerId = ctx.user.id;
        const { supabase } = ctx;

        if (callerId === input.targetUserId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Kendinizi arayamazsınız',
          });
        }

        const { data: room, error: roomError } = await supabase
          .from('chat_rooms')
          .select('id, type')
          .eq('id', input.roomId)
          .single();

        if (roomError || !room) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Sohbet bulunamadı' });
        }

        if (room.type !== 'direct') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Sesli/görüntülü arama sadece bire bir sohbetlerde kullanılabilir',
          });
        }

        const { data: members, error: membersError } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('room_id', input.roomId);

        if (membersError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Sohbet üyeleri alınamadı',
          });
        }

        const memberIds = (members || []).map((m) => m.user_id);

        if (!memberIds.includes(callerId) || !memberIds.includes(input.targetUserId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Bu sohbet üzerinde arama başlatma yetkiniz yok',
          });
        }

        const channelName = generateCallChannelName(callerId, input.targetUserId);
        const [, user1Id, user2Id] = channelName.split('_');

        if (!user1Id || !user2Id) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Arama kanalı oluşturulamadı',
          });
        }

        const { data: activeSession } = await supabase
          .from('match_sessions')
          .select('*')
          .eq('channel_name', channelName)
          .is('ended_at', null)
          .maybeSingle();

        let session = activeSession;

        if (!session) {
          const { data: newSession, error: sessionError } = await supabase
            .from('match_sessions')
            .insert({
              user1_id: user1Id,
              user2_id: user2Id,
              channel_name: channelName,
              started_at: new Date().toISOString(),
            })
            .select('*')
            .single();

          if (sessionError || !newSession) {
            console.error('startCall session error:', sessionError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Arama oturumu oluşturulamadı',
            });
          }

          session = newSession;
        }

        const callMessage =
          input.callType === 'video' ? '📹 Görüntülü arama başlattı' : '📞 Sesli arama başlattı';

        await supabase
          .from('messages')
          .insert({
            room_id: input.roomId,
            user_id: callerId,
            content: callMessage,
          });

        await supabase
          .from('chat_rooms')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', input.roomId);

        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', callerId)
          .maybeSingle();

        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('id', input.targetUserId)
          .maybeSingle();

        if (targetProfile?.push_token) {
          const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
          const callTitle = input.callType === 'video' ? 'Görüntülü Arama' : 'Sesli Arama';
          const callBody = `${callerProfile?.full_name || 'Bir kullanıcı'} sizi ${
            input.callType === 'video' ? 'görüntülü' : 'sesli'
          } arıyor`;

          const payload = {
            to: targetProfile.push_token,
            sound: 'default',
            title: callTitle,
            body: callBody,
            data: {
              type: 'call',
              callType: input.callType,
              callerId,
              callerName: callerProfile?.full_name || '',
              callerAvatar: callerProfile?.avatar_url || '',
              sessionId: session.id,
              roomId: input.roomId,
              channelName,
            },
          };

          try {
            await fetch(expoPushUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
              },
              body: JSON.stringify(payload),
            });
          } catch (pushError) {
            console.error('Call push notification error:', pushError);
          }
        }

        return {
          sessionId: session.id,
          channelName,
        };
      }),

    leaveRoom: protectedProcedure
      .input(z.object({ roomId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // Kullanıcının üyeliğini sil
        const { error } = await ctx.supabase
          .from('chat_members')
          .delete()
          .eq('room_id', input.roomId)
          .eq('user_id', userId);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Odadan ayrılınamadı',
          });
        }

        return { success: true };
      }),

    deleteRoom: protectedProcedure
      .input(z.object({ roomId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // Odanın sahibi olup olmadığını kontrol et
        const { data: room, error: roomError } = await ctx.supabase
          .from('chat_rooms')
          .select('created_by, type')
          .eq('id', input.roomId)
          .single();

        if (roomError || !room) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Oda bulunamadı',
          });
        }

        if (room.created_by !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Sadece oda sahibi odayı silebilir',
          });
        }

        // Önce mesajları sil
        await ctx.supabase
          .from('messages')
          .delete()
          .eq('room_id', input.roomId);

        // Üyeleri sil
        await ctx.supabase
          .from('chat_members')
          .delete()
          .eq('room_id', input.roomId);

        // Odayı sil
        const { error: deleteError } = await ctx.supabase
          .from('chat_rooms')
          .delete()
          .eq('id', input.roomId);

        if (deleteError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Oda silinemedi',
          });
        }

        return { success: true };
      }),

    addReaction: protectedProcedure
      .input(
        z.object({
          messageId: z.string(),
          emoji: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const { data: message } = await ctx.supabase
          .from('messages')
          .select('room_id')
          .eq('id', input.messageId)
          .single();

        if (!message) {
          throw new Error('Message not found');
        }

        const { data: member } = await ctx.supabase
          .from('chat_members')
          .select('*')
          .eq('room_id', message.room_id)
          .eq('user_id', userId)
          .single();

        if (!member) {
          throw new Error('Not a member of this room');
        }

        const { data: existingReaction } = await ctx.supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', input.messageId)
          .eq('user_id', userId)
          .eq('emoji', input.emoji)
          .single();

        if (existingReaction) {
          const { error } = await ctx.supabase
            .from('message_reactions')
            .delete()
            .eq('id', existingReaction.id);

          if (error) throw new Error('Failed to remove reaction');
          
          return { removed: true };
        }

        const { error } = await ctx.supabase
          .from('message_reactions')
          .insert({
            message_id: input.messageId,
            user_id: userId,
            emoji: input.emoji,
          });

        if (error) {
          console.error('Error adding reaction:', error);
          throw new Error('Failed to add reaction');
        }

        return { added: true };
      }),

    blockUser: protectedProcedure
      .input(z.object({ blockedUserId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        if (userId === input.blockedUserId) {
          throw new Error('Cannot block yourself');
        }

        const { data: existing } = await ctx.supabase
          .from('blocked_users')
          .select('*')
          .eq('blocker_id', userId)
          .eq('blocked_id', input.blockedUserId)
          .single();

        if (existing) {
          throw new Error('User already blocked');
        }

        const { error } = await ctx.supabase
          .from('blocked_users')
          .insert({
            blocker_id: userId,
            blocked_id: input.blockedUserId,
          });

        if (error) {
          console.error('Error blocking user:', error);
          throw new Error('Failed to block user');
        }

        return { success: true };
      }),

    unblockUser: protectedProcedure
      .input(z.object({ blockedUserId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const { error } = await ctx.supabase
          .from('blocked_users')
          .delete()
          .eq('blocker_id', userId)
          .eq('blocked_id', input.blockedUserId);

        if (error) {
          console.error('Error unblocking user:', error);
          throw new Error('Failed to unblock user');
        }

        return { success: true };
      }),
  }),

  kyc: createTRPCRouter({
    create: protectedProcedure
      .input(
        z.object({
          fullName: z.string().min(1),
          nationalId: z.string().min(1),
          birthDate: z.string(),
          country: z.string().optional(),
          city: z.string().optional(),
          email: z.string().email().optional(),
          documents: z.array(
            z.object({
              type: z.enum(["id_front", "id_back", "selfie"]),
              fileUrl: z.string().url(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new Error("Unauthorized");
        
        const { data: existingRequest } = await supabase
          .from("kyc_requests")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .single();
        
        if (existingRequest) {
          throw new Error("Zaten bekleyen bir kimlik doğrulama başvurunuz var");
        }
        
        const { data: kycRequest, error: kycError } = await supabase
          .from("kyc_requests")
          .insert({
            user_id: user.id,
            status: "pending",
            full_name: input.fullName,
            national_id: input.nationalId,
            birth_date: input.birthDate,
            country: input.country,
            city: input.city,
            email: input.email,
          })
          .select()
          .single();
        
        if (kycError) throw new Error(kycError.message);
        
        const documents = input.documents.map((doc) => ({
          kyc_id: kycRequest.id,
          type: doc.type,
          file_url: doc.fileUrl,
        }));
        
        const { error: docsError } = await supabase
          .from("kyc_documents")
          .insert(documents);
        
        if (docsError) throw new Error(docsError.message);

        // Admin'e KYC başvurusu bildirimi gönder
        try {
          const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          const userName = userProfile?.full_name || 'Bir kullanıcı';
          
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              user_id: SPECIAL_ADMIN_ID,
              type: 'SYSTEM',
              title: 'Yeni KYC Başvurusu',
              body: `${userName} kimlik doğrulama başvurusu yaptı. Başvuruyu inceleyin.`,
              data: {
                type: 'KYC_REQUEST',
                kyc_id: kycRequest.id,
                user_id: user.id,
                user_name: userName,
              },
              push_sent: false,
            })
            .select()
            .single();

          // Push bildirimi gönder
          if (notification) {
            const { data: adminProfile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', SPECIAL_ADMIN_ID)
              .maybeSingle();

            if (adminProfile?.push_token) {
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
                    to: adminProfile.push_token,
                    sound: 'default',
                    title: 'Yeni KYC Başvurusu',
                    body: `${userName} kimlik doğrulama başvurusu yaptı.`,
                    data: {
                      type: 'KYC_REQUEST',
                      kycId: kycRequest.id,
                    },
                    badge: 1,
                  }),
                });

                await supabase
                  .from('notifications')
                  .update({ push_sent: true })
                  .eq('id', notification.id);
              } catch (pushError) {
                console.error('KYC request push notification error:', pushError);
              }
            }
          }
        } catch (notificationError) {
          console.error('KYC request notification error:', notificationError);
          // Bildirim hatası olsa bile KYC başvurusu başarılı, devam et
        }
        
        return {
          success: true,
          kycId: kycRequest.id,
        };
      }),

    get: protectedProcedure.query(async ({ ctx }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const { data: kycRequest, error } = await supabase
        .from("kyc_requests")
        .select("*, documents:kyc_documents(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(error.message);
      }

      return kycRequest || null;
    }),
  }),

  ktu: createTRPCRouter({
    // Fakülteleri getir
    getFaculties: publicProcedure.query(async ({ ctx }) => {
      const { supabase } = ctx;
      const { data, error } = await supabase
        .from('ktu_faculties')
        .select('*')
        .order('name');

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data || [];
    }),

    // Bölümleri getir
    getDepartments: publicProcedure
      .input(z.object({ faculty_id: z.string().uuid().optional() }))
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        let query = supabase
          .from('ktu_departments')
          .select('*')
          .order('name');

        if (input.faculty_id) {
          query = query.eq('faculty_id', input.faculty_id);
        }

        const { data, error } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        return data || [];
      }),

    // Öğrenci bilgilerini getir
    getStudentInfo: protectedProcedure.query(async ({ ctx }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const { data, error } = await supabase
        .from('ktu_students')
        .select(`
          *,
          faculty:ktu_faculties(*),
          department:ktu_departments(*)
        `)
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data || null;
    }),

    // Öğrenci doğrulama başvurusu
    verifyStudent: protectedProcedure
      .input(
        z.object({
          student_number: z.string().min(1),
          faculty_id: z.string().uuid(),
          department_id: z.string().uuid(),
          class_year: z.number().min(1).max(8),
          ktu_email: z.string().email().optional(),
          verification_document_url: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Öğrenci numarası kontrolü
        const { data: existing } = await supabase
          .from('ktu_students')
          .select('id')
          .eq('student_number', input.student_number)
          .single();

        if (existing && existing.id !== user.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Bu öğrenci numarası zaten kullanılıyor.',
          });
        }

        const { data, error } = await supabase
          .from('ktu_students')
          .upsert({
            id: user.id,
            student_number: input.student_number,
            faculty_id: input.faculty_id,
            department_id: input.department_id,
            class_year: input.class_year,
            ktu_email: input.ktu_email,
            verification_document_url: input.verification_document_url,
            verification_status: 'pending',
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        return data;
      }),

    // Duyuruları getir
    getAnnouncements: publicProcedure
      .input(
        z.object({
          category: z.enum(['general', 'faculty', 'department', 'club', 'event', 'exam', 'academic']).optional(),
          faculty_id: z.string().uuid().optional(),
          department_id: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        let query = supabase
          .from('ktu_announcements')
          .select(
            `
            *,
            author:profiles!ktu_announcements_author_id_fkey(id, full_name, avatar_url),
            faculty:ktu_faculties(*),
            department:ktu_departments(*)
          `,
            { count: 'exact' }
          )
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.category) {
          query = query.eq('category', input.category);
        }
        if (input.faculty_id) {
          query = query.eq('faculty_id', input.faculty_id);
        }
        if (input.department_id) {
          query = query.eq('department_id', input.department_id);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          announcements: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // Duyuru oluştur
    createAnnouncement: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(200),
          content: z.string().min(1),
          category: z.enum(['general', 'faculty', 'department', 'club', 'event', 'exam', 'academic']).default('general'),
          faculty_id: z.string().uuid().optional(),
          department_id: z.string().uuid().optional(),
          is_pinned: z.boolean().default(false),
          is_important: z.boolean().default(false),
          attachment_url: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Doğrulanmış öğrenci veya admin kontrolü
        const { data: student } = await supabase
          .from('ktu_students')
          .select('verification_status')
          .eq('id', user.id)
          .single();

        const { data: admin } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!student || (student.verification_status !== 'verified' && !admin)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Duyuru oluşturmak için öğrenci doğrulaması gereklidir.',
          });
        }

        const { data, error } = await supabase
          .from('ktu_announcements')
          .insert({
            ...input,
            author_id: user.id,
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        return data;
      }),

    // Etkinlikleri getir
    getEvents: publicProcedure
      .input(
        z.object({
          event_type: z.enum(['seminar', 'concert', 'sports', 'academic', 'social', 'club', 'general']).optional(),
          faculty_id: z.string().uuid().optional(),
          department_id: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        let query = supabase
          .from('ktu_events')
          .select(
            `
            *,
            organizer:profiles!ktu_events_organizer_id_fkey(id, full_name, avatar_url),
            faculty:ktu_faculties(*),
            department:ktu_departments(*)
          `,
            { count: 'exact' }
          )
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.event_type) {
          query = query.eq('event_type', input.event_type);
        }
        if (input.faculty_id) {
          query = query.eq('faculty_id', input.faculty_id);
        }
        if (input.department_id) {
          query = query.eq('department_id', input.department_id);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Kullanıcı katılım durumunu kontrol et
        const events = data || [];
        if (user) {
          const eventIds = events.map((e: any) => e.id);
          const { data: attendees } = await supabase
            .from('ktu_event_attendees')
            .select('event_id')
            .eq('user_id', user.id)
            .in('event_id', eventIds);

          const attendingEventIds = new Set(attendees?.map((a) => a.event_id) || []);
          events.forEach((event: any) => {
            event.is_attending = attendingEventIds.has(event.id);
          });
        }

        return {
          events: events,
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // Kulüpleri getir
    getClubs: publicProcedure
      .input(
        z.object({
          faculty_id: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        let query = supabase
          .from('ktu_clubs')
          .select(
            `
            *,
            president:profiles!ktu_clubs_president_id_fkey(id, full_name, avatar_url),
            faculty:ktu_faculties(*)
          `,
            { count: 'exact' }
          )
          .eq('is_active', true)
          .order('name')
          .range(input.offset, input.offset + input.limit - 1);

        if (input.faculty_id) {
          query = query.eq('faculty_id', input.faculty_id);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Kullanıcı üyelik durumunu kontrol et
        const clubs = data || [];
        if (user) {
          const clubIds = clubs.map((c: any) => c.id);
          const { data: members } = await supabase
            .from('ktu_club_members')
            .select('club_id, role')
            .eq('user_id', user.id)
            .in('club_id', clubIds);

          const membershipMap = new Map(members?.map((m) => [m.club_id, m.role]) || []);
          clubs.forEach((club: any) => {
            club.is_member = membershipMap.has(club.id);
            club.user_role = membershipMap.get(club.id);
          });
        }

        return {
          clubs: clubs,
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // Politika onayları
    getRequiredPolicies: publicProcedure
      .query(async ({ ctx }) => {
        const { supabase } = ctx;

        const requiredPolicyTypes = [
          'terms',
          'privacy',
          'community',
          'cookie',
          'child_safety',
          'payment',
          'moderation',
          'data_storage',
          'eula',
          'university',
          'event',
        ];

        const { data: policies, error } = await supabase
          .from('policies')
          .select('id, title, content, policy_type, display_order, updated_at')
          .eq('is_active', true)
          .in('policy_type', requiredPolicyTypes)
          .order('display_order', { ascending: true });

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        return { policies: policies || [] };
      }),

    checkPolicyConsents: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data: consents, error } = await supabase
          .from('user_policy_consents')
          .select('policy_type, policy_id, consented, consent_date')
          .eq('user_id', user.id)
          .eq('consented', true);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        const { data: requiredPolicies } = await supabase
          .from('policies')
          .select('id, policy_type')
          .eq('is_active', true)
          .in('policy_type', ['terms', 'privacy', 'community', 'cookie', 'child_safety']);

        const consentedTypes = new Set(consents?.map((c) => c.policy_type) || []);
        const requiredTypes = new Set(requiredPolicies?.map((p) => p.policy_type) || []);
        const missingPolicies = Array.from(requiredTypes).filter((type) => !consentedTypes.has(type));

        return {
          hasAllConsents: missingPolicies.length === 0,
          missingPolicies,
          consents: consents || [],
        };
      }),
  }),

  // ===================================================================
  // HALI SAHA UYGULAMASI ROUTER
  // ===================================================================
  football: createTRPCRouter({
    // 1. "Bugün maç var mı?" - Ana özellik
    getTodayMatches: publicProcedure
      .input(
        z.object({
          city: z.enum(['Trabzon', 'Giresun']).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        
        // Türkiye saatine göre bugünün tarihini al (UTC+3)
        const now = new Date();
        const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        const today = turkeyTime.toISOString().split('T')[0]; // YYYY-MM-DD formatında

        let query = supabase
          .from('matches')
          .select(`
            *,
            organizer_id,
            team1:teams!matches_team1_id_fkey(id, name, logo_url, jersey_color),
            team2:teams!matches_team2_id_fkey(id, name, logo_url, jersey_color),
            field:football_fields(id, name, district, address),
            organizer:profiles!matches_organizer_id_fkey(id, full_name, avatar_url)
          `, { count: 'exact' })
          .gte('match_date', today)
          .in('status', ['scheduled', 'looking_for_opponent', 'looking_for_players'])
          .order('match_date', { ascending: true })
          .order('start_time', { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        const currentTime = turkeyTime.toTimeString().slice(0, 8);
        query = query.or(
          `match_date.gt.${today},and(match_date.eq.${today},start_time.gte.${currentTime})`
        );
        if (input.city) {
          query = query.eq('city', input.city);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Tarih ve saati birleştirerek match_date_time oluştur
        const matchesWithDateTime = (data || []).map((match: any) => {
          // match_date (DATE) ve start_time (TIME) birleştir
          const matchDateTime = match.match_date && match.start_time 
            ? `${match.match_date}T${match.start_time}+03:00` // Türkiye saati (UTC+3)
            : null;
          
          return {
            ...match,
            match_date_time: matchDateTime, // Frontend için birleştirilmiş tarih-saat
          };
        });

        return {
          matches: matchesWithDateTime,
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // 2. Eksik oyuncu sistemi
    createMissingPlayerPost: protectedProcedure
      .input(
        z.object({
          match_id: z.string().uuid(),
          position_needed: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward', 'any']),
          city: z.enum(['Trabzon', 'Giresun']),
          district: z.string().optional(),
          field_name: z.string().optional(),
          match_time: z.string(),
          expires_at: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Maç bilgisini kontrol et
        const { data: match } = await supabase
          .from('matches')
          .select('id, organizer_id, match_date, start_time')
          .eq('id', input.match_id)
          .single();

        if (!match) throw new TRPCError({ code: 'NOT_FOUND', message: 'Maç bulunamadı' });

        const { data, error } = await supabase
          .from('missing_player_posts')
          .insert({
            match_id: input.match_id,
            posted_by: user.id,
            position_needed: input.position_needed,
            city: input.city,
            district: input.district,
            field_name: input.field_name,
            match_time: input.match_time,
            expires_at: input.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Maç durumunu güncelle
        await supabase
          .from('matches')
          .update({ status: 'looking_for_players', missing_players_count: 1 })
          .eq('id', input.match_id);

        return data;
      }),

    getMissingPlayerPosts: publicProcedure
      .input(
        z.object({
          city: z.enum(['Trabzon', 'Giresun']).optional(),
          position: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward', 'any']).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        let query = supabase
          .from('missing_player_posts')
          .select(`
            *,
            match:matches(id, match_date, start_time, field_id, team1_id),
            posted_by_user:profiles!missing_player_posts_posted_by_fkey(id, full_name, avatar_url),
            field:matches!missing_player_posts_match_id_fkey(football_fields(id, name, district, address))
          `, { count: 'exact' })
          .eq('is_filled', false)
          .gt('expires_at', new Date().toISOString())
          .gt('match_time', new Date().toISOString()) // Maç saati geçmemiş olanlar
          .order('match_time', { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.city) {
          query = query.eq('city', input.city);
        }
        if (input.position) {
          query = query.eq('position_needed', input.position);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        const posts = (data || []).map((post: any) => ({
          ...post,
          applications: [],
        }));

        if (posts.length > 0) {
          const postIds = posts.map((post: any) => post.id);
          const { data: applications, error: applicationsError } = await supabase
            .from('missing_player_applications')
            .select(`
              id,
              post_id,
              message,
              status,
              applied_at,
              applicant:profiles!missing_player_applications_applicant_id_fkey(id, full_name, avatar_url)
            `)
            .in('post_id', postIds)
            .order('applied_at', { ascending: false });

          if (!applicationsError && applications) {
            const grouped = new Map<string, any[]>();
            applications.forEach((application: any) => {
              const list = grouped.get(application.post_id) || [];
              list.push(application);
              grouped.set(application.post_id, list);
            });

            posts.forEach((post: any) => {
              post.applications = grouped.get(post.id) || [];
            });
          }
        }

        return {
          posts,
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    applyToMissingPlayerPost: protectedProcedure
      .input(
        z.object({
          post_id: z.string().uuid(),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // İlanı kontrol et
        const { data: post } = await supabase
          .from('missing_player_posts')
          .select('id, is_filled, match_id, position_needed')
          .eq('id', input.post_id)
          .single();

        if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'İlan bulunamadı' });
        if (post.is_filled) throw new TRPCError({ code: 'BAD_REQUEST', message: 'İlan zaten doldurulmuş' });

        // Başvuru oluştur
        const { data, error } = await supabase
          .from('missing_player_applications')
          .insert({
            post_id: input.post_id,
            applicant_id: user.id,
            message: input.message,
          })
          .select(`
            id,
            post_id,
            message,
            status,
            applied_at,
            applicant:profiles!missing_player_applications_applicant_id_fkey(id, full_name, avatar_url)
          `)
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Kullanıcıyı maça rezervasyon olarak ekle (varsa)
        if (post.match_id) {
          const { error: participantError } = await supabase
            .from('match_participants')
            .insert({
              match_id: post.match_id,
              user_id: user.id,
              position: post.position_needed || null,
              is_confirmed: false,
            })
            .select()
            .single();

          if (participantError && participantError.code !== '23505') {
            console.error('match_participants insert error:', participantError);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Rezervasyon oluşturulamadı' });
          }
        }

        // Organizatöre mesaj gönder ve bildirim gönder
        const { data: postDetails } = await supabase
          .from('missing_player_posts')
          .select('posted_by, match:matches(id, match_date, start_time, field:fields(name))')
          .eq('id', input.post_id)
          .single();

        if (postDetails?.posted_by && postDetails.posted_by !== user.id) {
          // Chat room oluştur veya mevcut olanı bul
          const { data: existingRoom } = await supabase
            .from('chat_members')
            .select('room_id, chat_rooms!inner(*)')
            .eq('user_id', user.id)
            .eq('chat_rooms.type', 'direct');

          let roomId: string | null = null;

          if (existingRoom) {
            for (const room of existingRoom) {
              const { data: members } = await supabase
                .from('chat_members')
                .select('user_id')
                .eq('room_id', room.room_id);

              const memberUserIds = (members || []).map((m: any) => m.user_id);
              if (
                memberUserIds.length === 2 &&
                memberUserIds.includes(user.id) &&
                memberUserIds.includes(postDetails.posted_by)
              ) {
                roomId = room.room_id;
                break;
              }
            }
          }

          if (!roomId) {
            const { data: newRoom, error: roomError } = await supabase
              .from('chat_rooms')
              .insert({
                type: 'direct',
                created_by: user.id,
              })
              .select('id')
              .single();

            if (!roomError && newRoom) {
              roomId = newRoom.id;
              // Her iki kullanıcıyı da ekle
              await supabase.from('chat_members').insert([
                { room_id: roomId, user_id: user.id, role: 'member' },
                { room_id: roomId, user_id: postDetails.posted_by, role: 'member' },
              ]);
            }
          }

          if (roomId) {
            // Mesaj gönder
            const matchInfo = postDetails.match;
            const messageContent = input.message || 
              `Merhaba! ${matchInfo?.field?.name || 'Halı saha'} için ${matchInfo?.match_date || ''} tarihinde ${matchInfo?.start_time?.substring(0, 5) || ''} saatinde rezervasyon yaptım. Rakibin hazır, hemen sohbete başlayalım!`;

            await supabase.from('messages').insert({
              room_id: roomId,
              user_id: user.id,
              content: messageContent,
            });

            await supabase
              .from('chat_rooms')
              .update({ last_message_at: new Date().toISOString() })
              .eq('id', roomId);
          }

          // Bildirim gönder
          const { data: organizerProfile } = await supabase
            .from('profiles')
            .select('push_token, full_name')
            .eq('id', postDetails.posted_by)
            .maybeSingle();

          const { data: applicantProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          if (organizerProfile?.push_token) {
            const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
            const payload = {
              to: organizerProfile.push_token,
              sound: 'default',
              title: 'Rezervasyon İsteği',
              body: `${applicantProfile?.full_name || 'Bir kullanıcı'} maçınıza rezervasyon yaptı. Rakibin hazır, hemen sohbete başlayın!`,
              data: {
                type: 'reservation',
                post_id: input.post_id,
                applicant_id: user.id,
                room_id: roomId,
              },
            };

            try {
              await fetch(expoPushUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(payload),
              });
            } catch (pushError) {
              console.error('Reservation push notification error:', pushError);
            }
          }
        }

        return data;
      }),

    acceptMissingPlayerApplication: protectedProcedure
      .input(
        z.object({
          application_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Başvuruyu kontrol et
        const { data: application } = await supabase
          .from('missing_player_applications')
          .select(`
            *,
            post:missing_player_posts(id, posted_by, match_id, is_filled)
          `)
          .eq('id', input.application_id)
          .single();

        if (!application) throw new TRPCError({ code: 'NOT_FOUND' });
        if (application.post.posted_by !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu ilanı yönetme yetkiniz yok' });
        }
        if (application.post.is_filled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'İlan zaten doldurulmuş' });
        }

        // Başvuruyu kabul et
        await supabase
          .from('missing_player_applications')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', input.application_id);

        // Diğer başvuruları reddet
        await supabase
          .from('missing_player_applications')
          .update({ status: 'rejected', responded_at: new Date().toISOString() })
          .eq('post_id', application.post.id)
          .neq('id', input.application_id)
          .eq('status', 'pending');

        // İlanı doldurulmuş olarak işaretle
        await supabase
          .from('missing_player_posts')
          .update({
            is_filled: true,
            filled_by: application.applicant_id,
            filled_at: new Date().toISOString(),
          })
          .eq('id', application.post.id);

        // Maça katılımcı olarak ekle
        await supabase
          .from('match_participants')
          .insert({
            match_id: application.post.match_id,
            user_id: application.applicant_id,
            is_confirmed: true,
            confirmed_at: new Date().toISOString(),
          });

        // Bildirim oluştur
        await supabase
          .from('football_notifications')
          .insert({
            user_id: application.applicant_id,
            type: 'application_accepted',
            title: 'Başvurunuz kabul edildi!',
            message: 'Eksik oyuncu ilanına başvurunuz kabul edildi. Maça katılabilirsiniz.',
            data: { match_id: application.post.match_id, post_id: application.post.id },
          });

        return { success: true };
      }),

    // 3. Takım sistemi
    createTeam: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          city: z.enum(['Trabzon', 'Giresun']),
          logo_url: z.string().optional(),
          jersey_color: z.string().optional(),
          description: z.string().optional(),
          is_university_team: z.boolean().default(false),
          university_id: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data, error } = await supabase
          .from('teams')
          .insert({
            name: input.name,
            city: input.city,
            logo_url: input.logo_url,
            jersey_color: input.jersey_color,
            description: input.description,
            captain_id: user.id,
            is_university_team: input.is_university_team,
            university_id: input.university_id,
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Kaptanı takım üyesi olarak ekle
        await supabase
          .from('team_members')
          .insert({
            team_id: data.id,
            user_id: user.id,
            role: 'captain',
            is_active: true,
          });

        return data;
      }),

    getTeams: publicProcedure
      .input(
        z.object({
          city: z.enum(['Trabzon', 'Giresun']).optional(),
          is_university_team: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        let query = supabase
          .from('teams')
          .select(`
            *,
            captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url)
          `, { count: 'exact' })
          .eq('is_active', true)
          .order('points', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.city) {
          query = query.eq('city', input.city);
        }
        if (input.is_university_team !== undefined) {
          query = query.eq('is_university_team', input.is_university_team);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          teams: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // 4. Rakip bulma
    createOpponentRequest: protectedProcedure
      .input(
        z.object({
          team_id: z.string().uuid(),
          field_id: z.string().uuid(),
          match_date: z.string(),
          start_time: z.string(),
          city: z.enum(['Trabzon', 'Giresun']),
          district: z.string().optional(),
          match_type: z.enum(['friendly', 'league', 'tournament']).default('friendly'),
          preferred_team_level: z.enum(['beginner', 'intermediate', 'advanced', 'any']).optional(),
          notes: z.string().optional(),
          expires_at: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Takım kaptanı kontrolü
        const { data: team } = await supabase
          .from('teams')
          .select('id, captain_id')
          .eq('id', input.team_id)
          .single();

        if (!team) throw new TRPCError({ code: 'NOT_FOUND', message: 'Takım bulunamadı' });
        if (team.captain_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece takım kaptanı rakip bulma ilanı açabilir' });
        }

        const { data, error } = await supabase
          .from('opponent_requests')
          .insert({
            team_id: input.team_id,
            posted_by: user.id,
            field_id: input.field_id,
            match_date: input.match_date,
            start_time: input.start_time,
            city: input.city,
            district: input.district,
            match_type: input.match_type,
            preferred_team_level: input.preferred_team_level,
            notes: input.notes,
            expires_at: input.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return data;
      }),

    getOpponentRequests: publicProcedure
      .input(
        z.object({
          city: z.enum(['Trabzon', 'Giresun']).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        let query = supabase
          .from('opponent_requests')
          .select(`
            *,
            team:teams(id, name, logo_url, jersey_color, city),
            field:football_fields(id, name, district, address),
            posted_by_user:profiles!opponent_requests_posted_by_fkey(id, full_name, avatar_url)
          `, { count: 'exact' })
          .eq('is_filled', false)
          .gt('expires_at', new Date().toISOString())
          .order('match_date', { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.city) {
          query = query.eq('city', input.city);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          requests: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // 5. Saha rehberi
    getFields: publicProcedure
      .input(
        z.object({
          city: z.enum(['Trabzon', 'Giresun']).optional(),
          district: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        let query = supabase
          .from('football_fields')
          .select('*', { count: 'exact' })
          .eq('is_active', true)
          .order('rating', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.city) {
          query = query.eq('city', input.city);
        }
        if (input.district) {
          query = query.eq('district', input.district);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          fields: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    getFieldDetails: publicProcedure
      .input(z.object({ field_id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        const { data, error } = await supabase
          .from('football_fields')
          .select(`
            *,
            reviews:field_reviews(rating, comment, created_at, user:profiles(id, full_name, avatar_url))
          `)
          .eq('id', input.field_id)
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        if (!data) throw new TRPCError({ code: 'NOT_FOUND' });

        return data;
      }),

    // 6. Oyuncu istatistikleri
    getPlayerStats: publicProcedure
      .input(
        z.object({
          user_id: z.string().uuid(),
          team_id: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        let query = supabase
          .from('player_stats')
          .select(`
            *,
            match:matches(id, match_date, team1_id, team2_id, team1_score, team2_score)
          `, { count: 'exact' })
          .eq('user_id', input.user_id)
          .order('match_date', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.team_id) {
          query = query.eq('team_id', input.team_id);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Toplam istatistikler
        const { data: totals } = await supabase
          .from('player_stats')
          .select('goals, assists, matches:match_id')
          .eq('user_id', input.user_id);

        const totalGoals = totals?.reduce((sum, stat) => sum + (stat.goals || 0), 0) || 0;
        const totalAssists = totals?.reduce((sum, stat) => sum + (stat.assists || 0), 0) || 0;
        const totalMatches = new Set(totals?.map(s => s.matches) || []).size;

        return {
          stats: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
          totals: {
            goals: totalGoals,
            assists: totalAssists,
            matches: totalMatches,
          },
        };
      }),

    // 7. Maç oluşturma
    createMatch: protectedProcedure
      .input(
        z.object({
          field_name: z.string(),
          city: z.enum(['Trabzon', 'Giresun']),
          district: z.string(),
          match_date: z.string(),
          match_type: z.enum(['looking_for_opponent', 'looking_for_players']).optional(), // Yeni: Maç tipi
          team1_name: z.string().optional(),
          team2_name: z.string().optional(),
          max_players: z.number().optional(),
          needed_players: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Field'ı bul veya oluştur - kullanıcı serbest yazıyor, her zaman yeni field oluştur
        let fieldId: string;
        
        // Önce aynı isimde field var mı kontrol et
        const { data: existingField } = await supabase
          .from('football_fields')
          .select('id')
          .eq('name', input.field_name.trim())
          .eq('city', input.city)
          .eq('district', input.district)
          .single();

        if (existingField) {
          fieldId = existingField.id;
        } else {
          // Yeni field oluştur - kullanıcının yazdığı isimle
          const { data: newField, error: fieldError } = await supabase
            .from('football_fields')
            .insert({
              name: input.field_name.trim(),
              city: input.city,
              district: input.district,
              owner_id: user.id,
              address: `${input.district}, ${input.city}`, // Varsayılan adres
            })
            .select()
            .single();

          if (fieldError) {
            console.error('Field creation error:', fieldError);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: fieldError.message });
          }
          fieldId = newField.id;
        }

        // Match oluştur
        // Frontend'den gelen tarih ISO formatında (örneğin: "2025-01-15T15:00:00.000Z" - UTC)
        // Frontend Türkiye saatinde (UTC+3) oluşturup UTC'ye çeviriyor, bu yüzden backend'de Türkiye saatine geri çevirmeliyiz
        const matchDateTime = new Date(input.match_date);
        
        // Türkiye saatine göre tarih ve saati al
        const turkeyYear = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', year: 'numeric' });
        const turkeyMonth = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', month: '2-digit' });
        const turkeyDay = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', day: '2-digit' });
        const turkeyHour = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false });
        const turkeyMinute = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', minute: '2-digit' });
        const turkeySecond = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', second: '2-digit' });
        
        const matchDate = `${turkeyYear}-${turkeyMonth}-${turkeyDay}`; // YYYY-MM-DD
        const matchTime = `${turkeyHour.padStart(2, '0')}:${turkeyMinute.padStart(2, '0')}:${turkeySecond.padStart(2, '0')}`; // HH:MM:SS
        
        console.log('Creating match:', { 
          inputDate: input.match_date, 
          matchDate, 
          matchTime,
          parsedUTC: matchDateTime.toISOString()
        });
        
        const { data, error } = await supabase
          .from('matches')
          .insert({
            field_id: fieldId,
            match_date: matchDate, // DATE formatı (YYYY-MM-DD)
            start_time: matchTime, // TIME formatı (HH:MM:SS)
            city: input.city,
            district: input.district,
            organizer_id: user.id,
            status: input.match_type || (input.needed_players && input.needed_players > 0 ? 'looking_for_players' : 'looking_for_opponent'), // Maç tipine göre status belirle
            missing_players_count: input.needed_players || 0,
            max_players: input.max_players || 10,
            is_public: true,
            match_type: 'friendly',
            // team1_id ve team2_id artık NULL olabilir (SQL'de düzenlendi)
            // Eğer kullanıcı takım adı girmişse, ileride takım oluşturulabilir
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Eğer "Oyuncu Aranıyor" durumundaysa, otomatik eksik oyuncu ilanı oluştur
        if (data.status === 'looking_for_players' && input.needed_players && input.needed_players > 0) {
          try {
            // Match time'ı ISO formatına çevir
            const matchDateTimeISO = new Date(`${matchDate}T${matchTime}+03:00`).toISOString();
            
            await supabase
              .from('missing_player_posts')
              .insert({
                match_id: data.id,
                posted_by: user.id,
                position_needed: 'any', // Varsayılan olarak herhangi bir pozisyon
                city: input.city,
                district: input.district,
                field_name: input.field_name,
                match_time: matchDateTimeISO,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 saat sonra
              });
            
            console.log('Missing player post created automatically for match:', data.id);
          } catch (missingPostError: any) {
            console.error('Failed to create missing player post:', missingPostError);
            // Hata olsa bile maç oluşturma başarılı sayılır
          }
        }

        return data;
      }),

    // 8. Maç düzenleme
    updateMatch: protectedProcedure
      .input(
        z.object({
          match_id: z.string().uuid(),
          field_name: z.string().optional(),
          city: z.enum(['Trabzon', 'Giresun']).optional(),
          district: z.string().optional(),
          match_date: z.string().optional(),
          match_time: z.string().optional(),
          match_type: z.enum(['looking_for_opponent', 'looking_for_players']).optional(),
          team1_name: z.string().optional(),
          team2_name: z.string().optional(),
          max_players: z.number().optional(),
          needed_players: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Maçı kontrol et ve organizatör kontrolü yap
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id, organizer_id, field_id')
          .eq('id', input.match_id)
          .single();

        if (!existingMatch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Maç bulunamadı' });
        if (existingMatch.organizer_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu maçı düzenleme yetkiniz yok' });
        }

        const updateData: any = {};

        // Field güncelleme
        if (input.field_name) {
          const { data: existingField } = await supabase
            .from('football_fields')
            .select('id')
            .eq('name', input.field_name.trim())
            .eq('city', input.city || 'Trabzon')
            .eq('district', input.district || '')
            .single();

          if (existingField) {
            updateData.field_id = existingField.id;
          } else {
            const { data: newField } = await supabase
              .from('football_fields')
              .insert({
                name: input.field_name.trim(),
                city: input.city || 'Trabzon',
                district: input.district || '',
                owner_id: user.id,
                address: `${input.district || ''}, ${input.city || 'Trabzon'}`,
              })
              .select()
              .single();
            if (newField) updateData.field_id = newField.id;
          }
        }

        // Tarih ve saat güncelleme
        if (input.match_date) {
          const matchDateTime = new Date(input.match_date);
          const turkeyYear = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', year: 'numeric' });
          const turkeyMonth = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', month: '2-digit' });
          const turkeyDay = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', day: '2-digit' });
          updateData.match_date = `${turkeyYear}-${turkeyMonth}-${turkeyDay}`;
        }

        if (input.match_time) {
          const matchDateTime = input.match_date ? new Date(input.match_date) : new Date();
          const turkeyHour = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false });
          const turkeyMinute = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', minute: '2-digit' });
          const turkeySecond = matchDateTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul', second: '2-digit' });
          updateData.start_time = `${turkeyHour.padStart(2, '0')}:${turkeyMinute.padStart(2, '0')}:${turkeySecond.padStart(2, '0')}`;
        }

        // Diğer alanlar
        if (input.city) updateData.city = input.city;
        if (input.district) updateData.district = input.district;
        if (input.match_type) updateData.status = input.match_type;
        if (input.max_players !== undefined) updateData.max_players = input.max_players;
        if (input.needed_players !== undefined) updateData.missing_players_count = input.needed_players;

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('matches')
          .update(updateData)
          .eq('id', input.match_id)
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return data;
      }),

    // 9. Maç silme
    deleteMatch: protectedProcedure
      .input(z.object({ match_id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Maçı kontrol et ve organizatör kontrolü yap
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id, organizer_id')
          .eq('id', input.match_id)
          .single();

        if (!existingMatch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Maç bulunamadı' });
        if (existingMatch.organizer_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu maçı silme yetkiniz yok' });
        }

        // Maçı sil (cascade ile ilgili kayıtlar da silinir)
        const { error } = await supabase
          .from('matches')
          .delete()
          .eq('id', input.match_id);

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return { success: true };
      }),

    // 10. Kullanıcının geçmiş maçlarını getir
    getUserMatches: publicProcedure
      .input(
        z.object({
          user_id: z.string().uuid(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        // Kullanıcının organize ettiği maçları getir (geçmiş ve gelecek)
        let query = supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey(id, name, logo_url),
            team2:teams!matches_team2_id_fkey(id, name, logo_url),
            field:football_fields(id, name, district, address),
            organizer:profiles!matches_organizer_id_fkey(id, full_name, avatar_url)
          `, { count: 'exact' })
          .eq('organizer_id', input.user_id)
          .order('match_date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Tarih ve saati birleştirerek match_date_time oluştur
        const matchesWithDateTime = (data || []).map((match: any) => {
          const matchDateTime = match.match_date && match.start_time 
            ? `${match.match_date}T${match.start_time}+03:00`
            : null;
          
          return {
            ...match,
            match_date_time: matchDateTime,
          };
        });

        return {
          matches: matchesWithDateTime,
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // 9. Takım detayı
    getTeamDetails: publicProcedure
      .input(z.object({ team_id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;

        const { data, error } = await supabase
          .from('teams')
          .select(`
            *,
            captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url),
            members:team_members(
              id,
              role,
              position,
              jersey_number,
              joined_at,
              is_active,
              user:profiles!team_members_user_id_fkey(id, full_name, avatar_url)
            )
          `)
          .eq('id', input.team_id)
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        if (!data) throw new TRPCError({ code: 'NOT_FOUND' });

        // Kullanıcının takım üyeliğini kontrol et
        if (user) {
          const { data: membership } = await supabase
            .from('team_members')
            .select('role, position, jersey_number')
            .eq('team_id', input.team_id)
            .eq('user_id', user.id)
            .single();
          
          data.user_membership = membership || null;
          data.is_captain = data.captain_id === user.id;
        }

        return data;
      }),

    // 9. Takım güncelleme
    updateTeam: protectedProcedure
      .input(
        z.object({
          team_id: z.string().uuid(),
          name: z.string().min(1).max(100).optional(),
          logo_url: z.string().optional(),
          jersey_color: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Kaptan kontrolü
        const { data: team } = await supabase
          .from('teams')
          .select('id, captain_id')
          .eq('id', input.team_id)
          .single();

        if (!team) throw new TRPCError({ code: 'NOT_FOUND' });
        if (team.captain_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece takım kaptanı güncelleyebilir' });
        }

        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.logo_url !== undefined) updateData.logo_url = input.logo_url;
        if (input.jersey_color !== undefined) updateData.jersey_color = input.jersey_color;
        if (input.description !== undefined) updateData.description = input.description;

        const { data, error } = await supabase
          .from('teams')
          .update(updateData)
          .eq('id', input.team_id)
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return data;
      }),

    // 10. Takıma üye ekle
    addTeamMember: protectedProcedure
      .input(
        z.object({
          team_id: z.string().uuid(),
          user_id: z.string().uuid().optional(), // Belirtilmezse kendini ekler
          role: z.enum(['member', 'vice_captain']).default('member'),
          position: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward', 'any']).optional(),
          jersey_number: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const targetUserId = input.user_id || user.id;

        // Kaptan kontrolü (kendini ekliyorsa kontrol yok)
        if (targetUserId !== user.id) {
          const { data: team } = await supabase
            .from('teams')
            .select('id, captain_id')
            .eq('id', input.team_id)
            .single();

          if (!team) throw new TRPCError({ code: 'NOT_FOUND' });
          if (team.captain_id !== user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece takım kaptanı üye ekleyebilir' });
          }
        }

        const { data, error } = await supabase
          .from('team_members')
          .insert({
            team_id: input.team_id,
            user_id: targetUserId,
            role: input.role,
            position: input.position,
            jersey_number: input.jersey_number,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new TRPCError({ code: 'CONFLICT', message: 'Kullanıcı zaten takımda' });
          }
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        // Bildirim gönder
        if (targetUserId !== user.id) {
          await supabase
            .from('football_notifications')
            .insert({
              user_id: targetUserId,
              type: 'team_invitation',
              title: 'Takıma davet edildiniz!',
              message: `Bir takıma üye olarak eklendiniz.`,
              data: { team_id: input.team_id },
            });
        }

        return data;
      }),

    // 11. Takımdan üye çıkar
    removeTeamMember: protectedProcedure
      .input(
        z.object({
          team_id: z.string().uuid(),
          user_id: z.string().uuid().optional(), // Belirtilmezse kendini çıkarır
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const targetUserId = input.user_id || user.id;

        // Kaptan kontrolü (kendini çıkarıyorsa kontrol yok)
        if (targetUserId !== user.id) {
          const { data: team } = await supabase
            .from('teams')
            .select('id, captain_id')
            .eq('id', input.team_id)
            .single();

          if (!team) throw new TRPCError({ code: 'NOT_FOUND' });
          if (team.captain_id !== user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece takım kaptanı üye çıkarabilir' });
          }
        }

        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', input.team_id)
          .eq('user_id', targetUserId);

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return { success: true };
      }),

    // 12. Rakip ilanına başvur
    applyToOpponentRequest: protectedProcedure
      .input(
        z.object({
          request_id: z.string().uuid(),
          team_id: z.string().uuid(),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Takım kaptanı kontrolü
        const { data: team } = await supabase
          .from('teams')
          .select('id, captain_id')
          .eq('id', input.team_id)
          .single();

        if (!team) throw new TRPCError({ code: 'NOT_FOUND', message: 'Takım bulunamadı' });
        if (team.captain_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece takım kaptanı başvurabilir' });
        }

        // İlanı kontrol et
        const { data: request } = await supabase
          .from('opponent_requests')
          .select('id, is_filled, team_id')
          .eq('id', input.request_id)
          .single();

        if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'İlan bulunamadı' });
        if (request.is_filled) throw new TRPCError({ code: 'BAD_REQUEST', message: 'İlan zaten doldurulmuş' });
        if (request.team_id === input.team_id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Kendi ilanınıza başvurulamaz' });
        }

        const { data, error } = await supabase
          .from('opponent_applications')
          .insert({
            request_id: input.request_id,
            team_id: input.team_id,
            message: input.message,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new TRPCError({ code: 'CONFLICT', message: 'Zaten başvuruda bulundunuz' });
          }
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        // Bildirim gönder
        const { data: requestOwner } = await supabase
          .from('opponent_requests')
          .select('posted_by')
          .eq('id', input.request_id)
          .single();

        if (requestOwner) {
          await supabase
            .from('football_notifications')
            .insert({
              user_id: requestOwner.posted_by,
              type: 'opponent_found',
              title: 'Yeni rakip başvurusu!',
              message: 'Rakip bulma ilanınıza bir takım başvurdu.',
              data: { request_id: input.request_id, team_id: input.team_id },
            });
        }

        return data;
      }),

    // 13. Rakip başvurusunu kabul et
    acceptOpponentApplication: protectedProcedure
      .input(
        z.object({
          application_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Başvuruyu kontrol et
        const { data: application } = await supabase
          .from('opponent_applications')
          .select(`
            *,
            request:opponent_requests(id, team_id, posted_by, is_filled, match_date, start_time, field_id)
          `)
          .eq('id', input.application_id)
          .single();

        if (!application) throw new TRPCError({ code: 'NOT_FOUND' });
        if (application.request.posted_by !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu ilanı yönetme yetkiniz yok' });
        }
        if (application.request.is_filled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'İlan zaten doldurulmuş' });
        }

        // Başvuruyu kabul et
        await supabase
          .from('opponent_applications')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', input.application_id);

        // Diğer başvuruları reddet
        await supabase
          .from('opponent_applications')
          .update({ status: 'rejected', responded_at: new Date().toISOString() })
          .eq('request_id', application.request.id)
          .neq('id', input.application_id)
          .eq('status', 'pending');

        // İlanı doldurulmuş olarak işaretle
        await supabase
          .from('opponent_requests')
          .update({
            is_filled: true,
            accepted_team_id: application.team_id,
            accepted_at: new Date().toISOString(),
          })
          .eq('id', application.request.id);

        // Maç oluştur
        const { data: match } = await supabase
          .from('matches')
          .insert({
            team1_id: application.request.team_id,
            team2_id: application.team_id,
            field_id: application.request.field_id,
            match_date: application.request.match_date,
            start_time: application.request.start_time,
            city: application.request.city,
            match_type: application.request.match_type,
            status: 'scheduled',
            organizer_id: user.id,
          })
          .select()
          .single();

        // Bildirim gönder
        const { data: acceptedTeam } = await supabase
          .from('teams')
          .select('captain_id')
          .eq('id', application.team_id)
          .single();

        if (acceptedTeam) {
          await supabase
            .from('football_notifications')
            .insert({
              user_id: acceptedTeam.captain_id,
              type: 'opponent_found',
              title: 'Başvurunuz kabul edildi!',
              message: 'Rakip bulma başvurunuz kabul edildi. Maç oluşturuldu.',
              data: { match_id: match?.id, request_id: application.request.id },
            });
        }

        return { success: true, match };
      }),

    // 14. Maç detayı
    getMatchDetails: publicProcedure
      .input(z.object({ match_id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;

        const { data, error } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey(id, name, logo_url, jersey_color),
            team2:teams!matches_team2_id_fkey(id, name, logo_url, jersey_color),
            field:football_fields(id, name, district, address, latitude, longitude),
            organizer:profiles!matches_organizer_id_fkey(id, full_name, avatar_url),
            participants:match_participants(
              id,
              position,
              is_confirmed,
              user:profiles!match_participants_user_id_fkey(id, full_name, avatar_url),
              team:teams(id, name, logo_url)
            )
          `)
          .eq('id', input.match_id)
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        if (!data) throw new TRPCError({ code: 'NOT_FOUND' });

        // Kullanıcının katılım durumunu kontrol et
        if (user) {
          const { data: participation } = await supabase
            .from('match_participants')
            .select('id, position, is_confirmed')
            .eq('match_id', input.match_id)
            .eq('user_id', user.id)
            .single();
          
          data.user_participation = participation || null;
          data.is_organizer = data.organizer_id === user.id;
        }

        return data;
      }),

    // 15. Maç sonucunu kaydet
    updateMatchResult: protectedProcedure
      .input(
        z.object({
          match_id: z.string().uuid(),
          team1_score: z.number().min(0),
          team2_score: z.number().min(0),
          status: z.enum(['completed', 'cancelled']).default('completed'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Organizatör kontrolü
        const { data: match } = await supabase
          .from('matches')
          .select('id, organizer_id, team1_id, team2_id, status')
          .eq('id', input.match_id)
          .single();

        if (!match) throw new TRPCError({ code: 'NOT_FOUND' });
        if (match.organizer_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece maç organizatörü sonuç girebilir' });
        }

        const updateData: Record<string, unknown> = {
          team1_score: input.team1_score,
          team2_score: input.team2_score,
          status: input.status,
        };

        // Takım istatistiklerini güncelle
        if (input.status === 'completed' && match.team1_id && match.team2_id) {
          const team1Won = input.team1_score > input.team2_score;
          const team2Won = input.team2_score > input.team1_score;
          const draw = input.team1_score === input.team2_score;

          // Team1 istatistikleri
          const { data: team1 } = await supabase
            .from('teams')
            .select('wins, draws, losses, goals_scored, goals_conceded, total_matches, points')
            .eq('id', match.team1_id)
            .single();

          if (team1) {
            await supabase
              .from('teams')
              .update({
                total_matches: (team1.total_matches || 0) + 1,
                wins: team1Won ? (team1.wins || 0) + 1 : (team1.wins || 0),
                draws: draw ? (team1.draws || 0) + 1 : (team1.draws || 0),
                losses: team2Won ? (team1.losses || 0) + 1 : (team1.losses || 0),
                goals_scored: (team1.goals_scored || 0) + input.team1_score,
                goals_conceded: (team1.goals_conceded || 0) + input.team2_score,
                points: team1Won ? (team1.points || 0) + 3 : draw ? (team1.points || 0) + 1 : (team1.points || 0),
              })
              .eq('id', match.team1_id);
          }

          // Team2 istatistikleri
          const { data: team2 } = await supabase
            .from('teams')
            .select('wins, draws, losses, goals_scored, goals_conceded, total_matches, points')
            .eq('id', match.team2_id)
            .single();

          if (team2) {
            await supabase
              .from('teams')
              .update({
                total_matches: (team2.total_matches || 0) + 1,
                wins: team2Won ? (team2.wins || 0) + 1 : (team2.wins || 0),
                draws: draw ? (team2.draws || 0) + 1 : (team2.draws || 0),
                losses: team1Won ? (team2.losses || 0) + 1 : (team2.losses || 0),
                goals_scored: (team2.goals_scored || 0) + input.team2_score,
                goals_conceded: (team2.goals_conceded || 0) + input.team1_score,
                points: team2Won ? (team2.points || 0) + 3 : draw ? (team2.points || 0) + 1 : (team2.points || 0),
              })
              .eq('id', match.team2_id);
          }
        }

        const { data, error } = await supabase
          .from('matches')
          .update(updateData)
          .eq('id', input.match_id)
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return data;
      }),

    // 16. Oyuncu istatistiği ekle
    addPlayerStats: protectedProcedure
      .input(
        z.object({
          match_id: z.string().uuid(),
          user_id: z.string().uuid(),
          goals: z.number().min(0).default(0),
          assists: z.number().min(0).default(0),
          yellow_cards: z.number().min(0).default(0),
          red_cards: z.number().min(0).default(0),
          saves: z.number().min(0).default(0),
          clean_sheets: z.number().min(0).default(0),
          man_of_the_match: z.boolean().default(false),
          rating: z.number().min(0).max(5).optional(),
          position: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward']).optional(),
          minutes_played: z.number().min(0).default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Organizatör kontrolü
        const { data: match } = await supabase
          .from('matches')
          .select('id, organizer_id, match_date, team1_id, team2_id')
          .eq('id', input.match_id)
          .single();

        if (!match) throw new TRPCError({ code: 'NOT_FOUND' });
        if (match.organizer_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece maç organizatörü istatistik ekleyebilir' });
        }

        // Kullanıcının maça katılıp katılmadığını kontrol et
        const { data: participation } = await supabase
          .from('match_participants')
          .select('id, team_id')
          .eq('match_id', input.match_id)
          .eq('user_id', input.user_id)
          .single();

        if (!participation) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Kullanıcı bu maça katılmamış' });
        }

        const { data, error } = await supabase
          .from('player_stats')
          .insert({
            user_id: input.user_id,
            team_id: participation.team_id,
            match_id: input.match_id,
            goals: input.goals,
            assists: input.assists,
            yellow_cards: input.yellow_cards,
            red_cards: input.red_cards,
            saves: input.saves,
            clean_sheets: input.clean_sheets,
            man_of_the_match: input.man_of_the_match,
            rating: input.rating,
            position: input.position,
            minutes_played: input.minutes_played,
            match_date: match.match_date,
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return data;
      }),

    // 17. Maça katıl
    joinMatch: protectedProcedure
      .input(
        z.object({
          match_id: z.string().uuid(),
          position: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward']).optional(),
          team_id: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Maç kontrolü
        const { data: match } = await supabase
          .from('matches')
          .select('id, max_players, current_players_count, status')
          .eq('id', input.match_id)
          .single();

        if (!match) throw new TRPCError({ code: 'NOT_FOUND' });
        if (match.status !== 'scheduled' && match.status !== 'looking_for_players') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bu maça katılamazsınız' });
        }
        if (match.current_players_count >= match.max_players) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maç dolu' });
        }

        const { data, error } = await supabase
          .from('match_participants')
          .insert({
            match_id: input.match_id,
            user_id: user.id,
            team_id: input.team_id,
            position: input.position,
            is_confirmed: false,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new TRPCError({ code: 'CONFLICT', message: 'Zaten bu maça katıldınız' });
          }
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return data;
      }),

    // 18. Maçtan ayrıl
    leaveMatch: protectedProcedure
      .input(z.object({ match_id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { error } = await supabase
          .from('match_participants')
          .delete()
          .eq('match_id', input.match_id)
          .eq('user_id', user.id);

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return { success: true };
      }),

    // 19. Saha rezervasyonu oluştur
    createReservation: protectedProcedure
      .input(
        z.object({
          field_id: z.string().uuid(),
          reservation_date: z.string(),
          start_time: z.string(),
          end_time: z.string(),
          match_id: z.string().uuid().optional(),
          price: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Sahanın o saatte kayıtlı bir slotu var mı kontrol et
        const { data: existing } = await supabase
          .from('field_reservations')
          .select('*')
          .eq('field_id', input.field_id)
          .eq('reservation_date', input.reservation_date)
          .eq('start_time', input.start_time)
          .maybeSingle();

        let reservationId: string;

        if (existing) {
          if (!existing.is_available && existing.reserved_by && existing.reserved_by !== user.id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Bu saat dilimi zaten rezerve edilmiş.',
            });
          }

          // Mevcut rezervasyon kaydını güncelle
          const { data, error } = await supabase
            .from('field_reservations')
            .update({
              is_available: false,
              reserved_by: user.id,
              match_id: input.match_id,
              price: input.price,
              notes: input.notes,
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
          if (!data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Rezervasyon güncellenemedi' });
          
          reservationId = data.id;
        } else {
          // Yeni rezervasyon kaydı oluştur
          const { data, error } = await supabase
            .from('field_reservations')
            .insert({
              field_id: input.field_id,
              reservation_date: input.reservation_date,
              start_time: input.start_time,
              end_time: input.end_time,
              is_available: false,
              reserved_by: user.id,
              match_id: input.match_id,
              price: input.price,
              notes: input.notes,
            })
            .select()
            .single();

          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
          if (!data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Rezervasyon oluşturulamadı' });
          
          reservationId = data.id;
        }

        // Rezervasyon yapıldığında organizatöre bildirim gönder ve chat oluştur
        if (input.match_id) {
          const { data: matchData } = await supabase
            .from('matches')
            .select('organizer_id, field:football_fields(name)')
            .eq('id', input.match_id)
            .single();

          if (matchData && matchData.organizer_id) {
            const { data: reservingUser } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();

            // Bildirim gönder - hem football_notifications hem de notifications tablosuna
            await supabase
              .from('football_notifications')
              .insert({
                user_id: matchData.organizer_id,
                type: 'reservation',
                title: 'Yeni Rezervasyon!',
                message: `${reservingUser?.full_name || 'Bir kullanıcı'} maçınız için rezervasyon yaptı. Mesaj gönderebilirsiniz.`,
                data: { 
                  match_id: input.match_id,
                  reservation_id: reservationId,
                  reserving_user_id: user.id,
                },
              });

            // Ana notifications tablosuna da ekle
            await supabase
              .from('notifications')
              .insert({
                user_id: matchData.organizer_id,
                type: 'RESERVATION',
                title: 'Yeni Rezervasyon!',
                body: `${reservingUser?.full_name || 'Bir kullanıcı'} maçınız için rezervasyon yaptı. Mesaj gönderebilirsiniz.`,
                data: { 
                  match_id: input.match_id,
                  reservation_id: reservationId,
                  reserving_user_id: user.id,
                },
              });

            // Chat odası oluştur (eğer yoksa)
            const { data: existingRoom } = await supabase
              .from('chat_rooms')
              .select('id')
              .eq('type', 'direct')
              .contains('member_ids', [matchData.organizer_id, user.id])
              .maybeSingle();

            if (!existingRoom) {
              await supabase
                .from('chat_rooms')
                .insert({
                  type: 'direct',
                  name: null,
                  member_ids: [matchData.organizer_id, user.id],
                  created_by: user.id,
                });
            }
          }
        }

        // Rezervasyon verisini döndür
        const { data: reservationData } = await supabase
          .from('field_reservations')
          .select('*')
          .eq('id', reservationId)
          .single();

        return reservationData;
      }),

    // 20. Rezervasyonları listele
    getReservations: publicProcedure
      .input(
        z.object({
          field_id: z.string().uuid().optional(),
          reservation_date: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        let query = supabase
          .from('field_reservations')
          .select(`
            *,
            field:football_fields(id, name, district, address),
            reserved_by_user:profiles!field_reservations_reserved_by_fkey(id, full_name, avatar_url),
            match:matches(id, team1_id, team2_id)
          `, { count: 'exact' })
          .order('reservation_date', { ascending: true })
          .order('start_time', { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.field_id) {
          query = query.eq('field_id', input.field_id);
        }
        if (input.reservation_date) {
          query = query.eq('reservation_date', input.reservation_date);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          reservations: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // 21. Saha yorumu ekle
    createFieldReview: protectedProcedure
      .input(
        z.object({
          field_id: z.string().uuid(),
          match_id: z.string().uuid().optional(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data, error } = await supabase
          .from('field_reviews')
          .insert({
            field_id: input.field_id,
            user_id: user.id,
            match_id: input.match_id,
            rating: input.rating,
            comment: input.comment,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new TRPCError({ code: 'CONFLICT', message: 'Bu saha için zaten yorum yaptınız' });
          }
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return data;
      }),

    // 22. Saha yorumlarını listele
    getFieldReviews: publicProcedure
      .input(
        z.object({
          field_id: z.string().uuid(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        const { data, error, count } = await supabase
          .from('field_reviews')
          .select(`
            *,
            user:profiles!field_reviews_user_id_fkey(id, full_name, avatar_url)
          `, { count: 'exact' })
          .eq('field_id', input.field_id)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          reviews: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // 23. Bildirimleri getir
    getNotifications: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          unread_only: z.boolean().default(false),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        let query = supabase
          .from('football_notifications')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.unread_only) {
          query = query.eq('is_read', false);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          notifications: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    // 24. Bildirimi okundu işaretle
    markNotificationAsRead: protectedProcedure
      .input(
        z.object({
          notification_id: z.string().uuid().optional(),
          mark_all_read: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        if (input.mark_all_read) {
          const { error } = await supabase
            .from('football_notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('is_read', false);

          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
          return { success: true };
        }

        if (!input.notification_id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'notification_id veya mark_all_read gerekli' });
        }

        const { error } = await supabase
          .from('football_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', input.notification_id)
          .eq('user_id', user.id);

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return { success: true };
      }),
  }),

  // ============================================
  // GÖRÜNTÜLÜ EŞLEŞME SİSTEMİ
  // ============================================
  match: createTRPCRouter({
    // Kuyruğa gir
    joinQueue: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Kullanıcı profilini al
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gender, city, district')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Profil bulunamadı',
          });
        }

        if (!profile.gender || (profile.gender !== 'male' && profile.gender !== 'female')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cinsiyet seçmelisiniz (erkek/kadın)',
          });
        }

        const ENFORCE_MATCH_LIMIT = false;

        if (ENFORCE_MATCH_LIMIT) {
          const { data: limitCheck } = await supabase.rpc('check_user_match_limit', {
            p_user_id: user.id,
            p_daily_limit: 50,
          });

          if (!limitCheck) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Günlük eşleşme limitiniz doldu veya hesabınız kısıtlandı',
            });
          }
        }

        // Önce mevcut aktif kuyruk kaydını kontrol et ve temizle
        await supabase
          .from('waiting_queue')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Eşleşme ara
        const { data: matchId, error: findMatchError } = await supabase.rpc('find_match', {
          p_user_id: user.id,
          p_gender: profile.gender,
          p_city: profile.city || null,
          p_district: profile.district || null,
        });

        if (findMatchError) {
          console.error('find_match error in joinQueue:', findMatchError);
          // Hata durumunda da kuyruğa ekle, kullanıcı bekleyebilsin
          const { data: queueId, error: queueError } = await supabase.rpc('join_waiting_queue', {
            p_user_id: user.id,
            p_gender: profile.gender,
            p_city: profile.city || null,
            p_district: profile.district || null,
          });

          if (queueError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Eşleşme aranırken hata oluştu: ${findMatchError.message}`,
            });
          }

          return {
            matched: false,
            queueId: queueId,
            message: 'Eşleşme aranıyor...',
          };
        }

        if (matchId) {
          // Eşleşme bulundu
          console.log('Match found in joinQueue, matchId:', matchId);
          
          // Kısa bir bekleme ekle (race condition'ı önlemek için)
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const { data: session, error: sessionError } = await supabase
            .from('match_sessions')
            .select('*')
            .eq('id', matchId)
            .maybeSingle();

          console.log('Session query result:', { session, sessionError });

          if (sessionError) {
            console.error('Session error:', sessionError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Eşleşme oturumu sorgulanamadı: ${sessionError.message}`,
            });
          }

          if (!session) {
            console.error('Session not found for matchId:', matchId);
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Eşleşme oturumu bulunamadı',
            });
          }

          // User bilgilerini ayrı sorgulardan al
          const [user1Data, user2Data] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', session.user1_id).maybeSingle(),
            supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', session.user2_id).maybeSingle(),
          ]);

          if (ENFORCE_MATCH_LIMIT) {
            await supabase.rpc('increment_daily_match_limit', { p_user_id: user.id });
          }

          return {
            matched: true,
            session: {
              ...session,
              user1: user1Data.data || null,
              user2: user2Data.data || null,
            },
          };
        }

        // Eşleşme bulunamadı, kuyruğa ekle
        const { data: queueId, error: queueError } = await supabase.rpc('join_waiting_queue', {
          p_user_id: user.id,
          p_gender: profile.gender,
          p_city: profile.city || null,
          p_district: profile.district || null,
        });

        if (queueError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: queueError.message,
          });
        }

        return {
          matched: false,
          queueId: queueId,
          message: 'Eşleşme aranıyor...',
        };
      }),

    // Kuyruktan çık
    leaveQueue: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { error } = await supabase.rpc('leave_waiting_queue', {
          p_user_id: user.id,
        });

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        return { success: true };
      }),

    // Eşleşme durumunu kontrol et (polling için)
    checkMatch: protectedProcedure
      .input(
        z.object({
          session_id: z.string().uuid().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Eğer session_id verilmişse, o session'ı getir
        if (input?.session_id) {
          const { data: session, error: sessionError } = await supabase
            .from('match_sessions')
            .select('*')
            .eq('id', input.session_id)
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();

          if (sessionError) {
            console.error('Session query error:', sessionError);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Session sorgulanamadı: ${sessionError.message}` });
          }

          if (session) {
            // User bilgilerini ayrı sorgulardan al
            const [user1Data, user2Data] = await Promise.all([
              supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', session.user1_id).maybeSingle(),
              supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', session.user2_id).maybeSingle(),
            ]);

            return {
              matched: !session.ended_at,
              session: {
                ...session,
                user1: user1Data.data || null,
                user2: user2Data.data || null,
              },
            };
          }
        }

        // Aktif eşleşme var mı kontrol et
        const { data: activeSession, error: activeSessionError } = await supabase
          .from('match_sessions')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSessionError) {
          console.error('Active session query error:', activeSessionError);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Aktif oturum sorgulanamadı: ${activeSessionError.message}` });
        }

        if (activeSession) {
          // User bilgilerini ayrı sorgulardan al
          const [user1Data, user2Data] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', activeSession.user1_id).maybeSingle(),
            supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', activeSession.user2_id).maybeSingle(),
          ]);

          return {
            matched: true,
            session: {
              ...activeSession,
              user1: user1Data.data || null,
              user2: user2Data.data || null,
            },
          };
        }

        // Kuyrukta beklerken eşleşme ara - önce kuyrukta olup olmadığını kontrol et
        const { data: queueCheck } = await supabase
          .from('waiting_queue')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!queueCheck) {
          // Kullanıcı kuyrukta değil, eşleşme yok
          return {
            matched: false,
            session: null,
          };
        }

        // Profil bilgilerini al
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gender, city, district')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Profile error in checkMatch:', profileError);
          return {
            matched: false,
            session: null,
          };
        }

        if (!profile?.gender || (profile.gender !== 'male' && profile.gender !== 'female')) {
          return {
            matched: false,
            session: null,
          };
        }

        // Eşleşme ara - sadece kuyrukta aktifse ara
        const { data: matchId, error: matchError } = await supabase.rpc('find_match', {
          p_user_id: user.id,
          p_gender: profile.gender,
          p_city: profile.city || null,
          p_district: profile.district || null,
        });

        if (matchError) {
          console.error('find_match error in checkMatch:', matchError);
          // Hata durumunda kuyrukta kalmaya devam et
          return {
            matched: false,
            session: null,
          };
        }

        if (matchId) {
          // Eşleşme bulundu!
          console.log('Match found in checkMatch, matchId:', matchId);
          
          const { data: newSession, error: newSessionError } = await supabase
            .from('match_sessions')
            .select('*')
            .eq('id', matchId)
            .maybeSingle();

          if (newSessionError) {
            console.error('New session query error:', newSessionError);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Yeni oturum sorgulanamadı: ${newSessionError.message}` });
          }

          if (newSession) {
            console.log('New session found:', newSession.id);
            
            // User bilgilerini ayrı sorgulardan al
            const [user1Data, user2Data] = await Promise.all([
              supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', newSession.user1_id).maybeSingle(),
              supabase.from('profiles').select('id, full_name, avatar_url, gender').eq('id', newSession.user2_id).maybeSingle(),
            ]);

            return {
              matched: true,
              session: {
                ...newSession,
                user1: user1Data.data || null,
                user2: user2Data.data || null,
              },
            };
          } else {
            console.error('Match ID found but session not found:', matchId);
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Eşleşme oturumu bulunamadı' });
          }
        }

        return {
          matched: false,
          session: null,
        };
      }),

    // Match session'ı güncelle (next, video/audio toggle)
    updateSession: protectedProcedure
      .input(
        z.object({
          session_id: z.string().uuid(),
          action: z.enum(['next', 'toggle_video', 'toggle_audio', 'end']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Session'ı kontrol et
        const { data: session } = await supabase
          .from('match_sessions')
          .select('*')
          .eq('id', input.session_id)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .is('ended_at', null)
          .single();

        if (!session) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Eşleşme bulunamadı',
          });
        }

        const isUser1 = session.user1_id === user.id;
        const updateData: any = {};

        if (input.action === 'next') {
          if (isUser1) {
            updateData.user1_next = true;
          } else {
            updateData.user2_next = true;
          }

          // Her iki taraf da next dediyse bitir
          if ((isUser1 && session.user2_next) || (!isUser1 && session.user1_next)) {
            updateData.ended_at = new Date().toISOString();
            updateData.disconnect_reason = 'next';
          }
        } else if (input.action === 'toggle_video') {
          if (isUser1) {
            updateData.user1_video_enabled = !session.user1_video_enabled;
          } else {
            updateData.user2_video_enabled = !session.user2_video_enabled;
          }
        } else if (input.action === 'toggle_audio') {
          if (isUser1) {
            updateData.user1_audio_enabled = !session.user1_audio_enabled;
          } else {
            updateData.user2_audio_enabled = !session.user2_audio_enabled;
          }
        } else if (input.action === 'end') {
          updateData.ended_at = new Date().toISOString();
          updateData.disconnect_reason = 'next';
        }

        const { data: updatedSession, error } = await supabase
          .from('match_sessions')
          .update(updateData)
          .eq('id', input.session_id)
          .select('*')
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        return { session: updatedSession };
      }),

    // Şikayet oluştur
    reportUser: protectedProcedure
      .input(
        z.object({
          reported_user_id: z.string().uuid(),
          match_session_id: z.string().uuid().optional(),
          reason: z.enum(['inappropriate', 'harassment', 'spam', 'fake', 'other']),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { error } = await supabase
          .from('match_reports')
          .insert({
            reporter_id: user.id,
            reported_user_id: input.reported_user_id,
            match_session_id: input.match_session_id,
            reason: input.reason,
            description: input.description,
          });

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        // 3 şikayet varsa kullanıcıyı kısıtla
        const { count } = await supabase
          .from('match_reports')
          .select('*', { count: 'exact', head: true })
          .eq('reported_user_id', input.reported_user_id);

        if (count && count >= 3) {
          await supabase
            .from('user_match_limits')
            .upsert({
              user_id: input.reported_user_id,
              is_restricted: true,
              restriction_reason: '3 veya daha fazla şikayet',
              restriction_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün
            });
        }

        return { success: true };
      }),

    // Günlük limiti kontrol et
    checkDailyLimit: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data: limits } = await supabase
          .from('user_match_limits')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!limits) {
          return {
            daily_matches: 0,
            daily_limit: 50,
            is_restricted: false,
            can_match: true,
          };
        }

        // Bugün mü kontrol et
        const today = new Date().toDateString();
        const lastReset = limits.last_reset_date ? new Date(limits.last_reset_date).toDateString() : null;

        const dailyMatches = today === lastReset ? limits.daily_matches : 0;

        return {
          daily_matches: dailyMatches,
          daily_limit: 50,
          is_restricted: limits.is_restricted || false,
          restriction_reason: limits.restriction_reason,
          restriction_until: limits.restriction_until,
          can_match: !limits.is_restricted && dailyMatches < 50,
        };
      }),

    // Agora token oluştur

    checkPolicyConsents: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Kullanıcının onayladığı politikaları kontrol et
        const { data: consents, error } = await supabase
          .from('user_policy_consents')
          .select('policy_type, policy_id, consented, consent_date')
          .eq('user_id', user.id)
          .eq('consented', true);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        // Zorunlu politikaları al
        const { data: requiredPolicies } = await supabase
          .from('policies')
          .select('id, policy_type')
          .eq('is_active', true)
          .in('policy_type', ['terms', 'privacy', 'community', 'cookie', 'child_safety']);

        const consentedTypes = new Set(consents?.map(c => c.policy_type) || []);
        const requiredTypes = new Set(requiredPolicies?.map(p => p.policy_type) || []);

        const missingPolicies = Array.from(requiredTypes).filter(type => !consentedTypes.has(type));

        return {
          hasAllConsents: missingPolicies.length === 0,
          missingPolicies,
          consents: consents || [],
        };
      }),

    consentToFeature: protectedProcedure
      .input(
        z.object({
          featureType: z.enum(['matching', 'video_call', 'audio_call', 'ai_chat', 'location_sharing']),
          ageVerified: z.boolean().optional(),
          kycVerified: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // 18+ özellikler için yaş ve KYC doğrulaması gerekli
        if (['matching', 'video_call', 'audio_call'].includes(input.featureType)) {
          if (!input.ageVerified || !input.kycVerified) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Bu özellik için yaş ve KYC doğrulaması gereklidir',
            });
          }
        }

        const { error } = await supabase
          .from('user_feature_consents')
          .upsert({
            user_id: user.id,
            feature_type: input.featureType,
            consented: true,
            age_verified: input.ageVerified || false,
            kyc_verified: input.kycVerified || false,
            revoked_date: null,
          }, {
            onConflict: 'user_id,feature_type',
          });

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        return { success: true };
      }),

    checkFeatureConsent: protectedProcedure
      .input(
        z.object({
          featureType: z.enum(['matching', 'video_call', 'audio_call', 'ai_chat', 'location_sharing']),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data: consent, error } = await supabase
          .from('user_feature_consents')
          .select('*')
          .eq('user_id', user.id)
          .eq('feature_type', input.featureType)
          .is('revoked_date', null)
          .maybeSingle();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        if (!consent || !consent.consented) {
          return { hasConsent: false, canUse: false };
        }

        // 18+ özellikler için yaş ve KYC kontrolü
        if (['matching', 'video_call', 'audio_call'].includes(input.featureType)) {
          const canUse = consent.age_verified && consent.kyc_verified;
          return {
            hasConsent: true,
            canUse,
            ageVerified: consent.age_verified,
            kycVerified: consent.kyc_verified,
          };
        }

        return { hasConsent: true, canUse: true };
      }),

    generateAgoraToken: protectedProcedure
      .input(
        z.object({
          channel_name: z.string(),
          uid: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Session'ı kontrol et - önce channel_name ile, sonra user ile
        let session = null;
        
        // Önce channel_name ile ara
        const { data: sessionByChannel, error: channelError } = await supabase
          .from('match_sessions')
          .select('*')
          .eq('channel_name', input.channel_name)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .is('ended_at', null)
          .maybeSingle();

        if (channelError) {
          console.error('Session query error by channel:', channelError);
        } else if (sessionByChannel) {
          session = sessionByChannel;
        } else {
          // Channel name ile bulunamadı, kullanıcının aktif session'ını ara
          const { data: activeSession, error: activeError } = await supabase
            .from('match_sessions')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeError) {
            console.error('Active session query error:', activeError);
          } else if (activeSession) {
            session = activeSession;
          }
        }

        if (!session) {
          console.error('No session found for user:', user.id, 'channel:', input.channel_name);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Eşleşme bulunamadı. Lütfen eşleşme sayfasından tekrar deneyin.',
          });
        }

        // Agora credentials - Supabase Edge Function secrets'tan al
        const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID') || Deno.env.get('EXPO_PUBLIC_AGORA_APP_ID') || 'd1e34b20cd2b4da69418f360039d254d';
        const AGORA_CERTIFICATE = Deno.env.get('AGORA_CERTIFICATE') || Deno.env.get('EXPO_PUBLIC_AGORA_CERTIFICATE') || 'd0c65c85891f40c680764c5cf0523433';
        
        // Agora bilgileri kontrolü
        if (!AGORA_APP_ID || AGORA_APP_ID === 'your_agora_app_id_here') {
          console.warn('AGORA_APP_ID not configured, using default value');
        }
        if (!AGORA_CERTIFICATE || AGORA_CERTIFICATE === 'your_agora_certificate_here') {
          console.warn('AGORA_CERTIFICATE not configured, using default value');
        }
        
        // Agora RTC Token Generation
        // Token süresi: 24 saat (86400 saniye)
        // Bu token 24 saat geçerli olacak, sonrasında yeni token alınması gerekir
        // NOT: Token otomatik yenilenmez, 24 saat sonra expire olur ve yeni token istenmelidir
        let token = '';
        
        if (AGORA_CERTIFICATE && AGORA_CERTIFICATE !== '' && AGORA_APP_ID && AGORA_APP_ID !== '') {
          try {
            // Token expire time: 24 saat (86400 saniye) - Unix timestamp
            const expireTime = Math.floor(Date.now() / 1000) + 86400;
            const issueTime = Math.floor(Date.now() / 1000);
            const nonce = Math.floor(Math.random() * 1000000000);
            
            // Privilege: 255 = tüm yetkiler (join channel, publish audio, publish video)
            const privilege = 255;
            
            // Signature için content oluştur
            // Format: appId:channel:uid:expireTime:issueTime:nonce:privilege
            const signatureContent = `${AGORA_APP_ID}:${input.channel_name}:${input.uid}:${expireTime}:${issueTime}:${nonce}:${privilege}`;
            
            // HMAC-SHA256 ile signature oluştur
            const encoder = new TextEncoder();
            const keyData = encoder.encode(AGORA_CERTIFICATE);
            const messageData = encoder.encode(signatureContent);
            
            const cryptoKey = await crypto.subtle.importKey(
              'raw',
              keyData,
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            
            const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
            
            // Signature'ı base64 encode et
            const signatureArray = new Uint8Array(signature);
            const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
            
            // Token oluştur: version:appId:channel:uid:expireTime:issueTime:nonce:privilege:signature
            // Version 1 = RTC token
            token = `1:${AGORA_APP_ID}:${input.channel_name}:${input.uid}:${expireTime}:${issueTime}:${nonce}:${privilege}:${signatureBase64}`;
            
            console.log(`Agora token generated successfully - expires in 24 hours (${new Date(expireTime * 1000).toISOString()})`);
          } catch (error: any) {
            console.error('Agora token generation error:', error);
            // Hata durumunda boş token döndür (test mode - token olmadan da çalışabilir)
            token = '';
          }
        } else {
          console.warn('Agora credentials missing, returning empty token (test mode)');
          token = '';
        }

        return {
          token: token, // Test mode için boş, production'da gerçek token
          channel_name: input.channel_name,
          uid: input.uid,
          app_id: AGORA_APP_ID,
        };
      }),
  }),

  admin: createTRPCRouter({
    checkAdmin: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
        }
        
        // Özel admin bypass
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id === SPECIAL_ADMIN_ID) {
          return {
            isAdmin: true,
            role: 'super_admin',
            permissions: {},
          };
        }
        
        const { data: adminUser, error } = await supabase
          .from("admin_users")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();
        
        if (error || !adminUser) {
          return { isAdmin: false, role: null };
        }
        
        return {
          isAdmin: true,
          role: adminUser.role,
          permissions: adminUser.permissions || {},
        };
      }),

    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        // Bugünkü kayıtlar
        let todayRegistrations = 0;
        try {
          const { data } = await supabase.rpc('get_today_registrations');
          todayRegistrations = data || 0;
        } catch (error) {
          console.error('get_today_registrations error:', error);
          todayRegistrations = 0;
        }
        
        // Bugünkü şikayetler
        let todayReports = 0;
        try {
          const { data } = await supabase.rpc('get_today_reports');
          todayReports = data || 0;
        } catch (error) {
          console.error('get_today_reports error:', error);
          todayReports = 0;
        }
        
        // Toplam kullanıcı
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        // Toplam gönderi
        const { count: totalPosts } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("is_deleted", false);
        
        // Toplam banlı kullanıcı
        const { count: bannedUsers } = await supabase
          .from("user_bans")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);
        
        // Toplam mavi tikli kullanıcı
        const { count: blueTickUsers } = await supabase
          .from("blue_ticks")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);
        
        // Bekleyen destek ticket'ları
        const { count: pendingTickets } = await supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "open");
        
        // Bekleyen şikayetler
        const { count: pendingReports } = await supabase
          .from("user_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        
        return {
          todayRegistrations: todayRegistrations || 0,
          todayReports: todayReports || 0,
          totalUsers: totalUsers || 0,
          totalPosts: totalPosts || 0,
          bannedUsers: bannedUsers || 0,
          blueTickUsers: blueTickUsers || 0,
          pendingTickets: pendingTickets || 0,
          pendingReports: pendingReports || 0,
        };
      }),

    getRideList: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(200).optional().default(50),
            status: z.enum(['active', 'full', 'cancelled', 'finished', 'expired']).optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        let query = supabase
          .from('ride_offers')
          .select(`
            *,
            driver:profiles(id, full_name, phone, avatar_url),
            bookings:ride_bookings(id, status)
          `)
          .order('created_at', { ascending: false })
          .limit(input?.limit ?? 50);

        if (input?.status) {
          query = query.eq('status', input.status);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Admin get ride list error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Yolculuklar alınamadı' });
        }

        return (data || []).map((ride: any) => ({
          id: ride.id,
          departure_title: ride.departure_title,
          destination_title: ride.destination_title,
          departure_time: ride.departure_time,
          status: ride.status,
          price_per_seat: ride.price_per_seat,
          total_seats: ride.total_seats,
          available_seats: ride.available_seats,
          driver_full_name: ride.driver_full_name,
          driver_phone: ride.driver_phone,
          vehicle_brand: ride.vehicle_brand,
          vehicle_model: ride.vehicle_model,
          vehicle_plate: ride.vehicle_plate,
          driver: ride.driver
            ? {
                id: ride.driver.id,
                full_name: ride.driver.full_name,
                phone: ride.driver.phone,
                avatar_url: ride.driver.avatar_url,
              }
            : null,
          bookings_count: ride.bookings?.length || 0,
          created_at: ride.created_at,
        }));
      }),

    getRideDetail: protectedProcedure
      .input(z.object({ ride_id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        const { data, error } = await supabase
          .from('ride_offers')
          .select(`
            *,
            driver:profiles(id, full_name, phone, avatar_url),
            bookings:ride_bookings(
              *,
              passenger:profiles(id, full_name, phone, avatar_url)
            )
          `)
          .eq('id', input.ride_id)
          .single();

        if (error || !data) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Yolculuk bulunamadı' });
        }

        const bookings = (data.bookings || []).map((booking: any) => ({
          id: booking.id,
          passenger_id: booking.passenger_id,
          passenger_name: booking.passenger?.full_name || 'Bilinmiyor',
          passenger_phone: booking.passenger_phone,
          seats_requested: booking.seats_requested,
          status: booking.status,
          notes: booking.notes,
          created_at: booking.created_at,
        }));

        return {
          ride: {
            id: data.id,
            departure_title: data.departure_title,
            departure_description: data.departure_description,
            destination_title: data.destination_title,
            destination_description: data.destination_description,
            departure_time: data.departure_time,
            total_seats: data.total_seats,
            available_seats: data.available_seats,
            price_per_seat: data.price_per_seat,
            status: data.status,
            vehicle_brand: data.vehicle_brand,
            vehicle_model: data.vehicle_model,
            vehicle_color: data.vehicle_color,
            vehicle_plate: data.vehicle_plate,
            driver_full_name: data.driver_full_name,
            driver_phone: data.driver_phone,
            notes: data.notes,
            created_at: data.created_at,
          },
          driver: data.driver
            ? {
                id: data.driver.id,
                full_name: data.driver.full_name,
                phone: data.driver.phone,
                avatar_url: data.driver.avatar_url,
              }
            : null,
          bookings,
        };
      }),

    // Politika yönetimi
    getPolicies: publicProcedure
      .query(async ({ ctx }) => {
        const { supabase } = ctx;
        
        const { data, error } = await supabase
          .from("policies")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return data || [];
      }),

    getAllPolicies: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        const { data, error } = await supabase
          .from("policies")
          .select("*")
          .order("display_order", { ascending: true });
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return data || [];
      }),

    createPolicy: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().min(1),
          policyType: z.enum(["terms", "privacy", "community", "cookie", "refund", "child_safety", "payment", "moderation", "data_storage", "eula", "university", "event", "other"]),
          displayOrder: z.number().default(0),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        let adminUser: any;
        if (user.id === SPECIAL_ADMIN_ID) {
          adminUser = { id: SPECIAL_ADMIN_ID, role: 'super_admin' };
        } else {
          const { data } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!data) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
          adminUser = data;
        }
        
        const { data, error } = await supabase
          .from("policies")
          .insert({
            title: input.title,
            content: input.content,
            policy_type: input.policyType,
            display_order: input.displayOrder,
            is_active: input.isActive,
            created_by: adminUser.id,
          })
          .select()
          .single();
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return data;
      }),

    updatePolicy: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          title: z.string().min(1).optional(),
          content: z.string().min(1).optional(),
          policyType: z.enum(["terms", "privacy", "community", "cookie", "refund", "child_safety", "payment", "moderation", "data_storage", "eula", "university", "event", "other"]).optional(),
          displayOrder: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        let adminUser: any;
        if (user.id === SPECIAL_ADMIN_ID) {
          adminUser = { id: SPECIAL_ADMIN_ID, role: 'super_admin' };
        } else {
          const { data } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!data) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
          adminUser = data;
        }
        
        const updateData: any = {
          updated_by: adminUser.id,
          updated_at: new Date().toISOString(),
        };
        
        if (input.title !== undefined) updateData.title = input.title;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.policyType !== undefined) updateData.policy_type = input.policyType;
        if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;
        if (input.isActive !== undefined) updateData.is_active = input.isActive;
        
        const { data, error } = await supabase
          .from("policies")
          .update(updateData)
          .eq("id", input.id)
          .select()
          .single();
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return data;
      }),

    deletePolicy: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        const { error } = await supabase
          .from("policies")
          .delete()
          .eq("id", input.id);
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return { success: true };
      }),

    // Kullanıcı yönetimi
    getUsers: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          filter: z.enum(['all', 'today', 'banned', 'blueTick', 'hidden', 'live']).default('all'),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        const [
          { count: totalUsers },
          { count: liveUsers },
          { count: bannedUsers },
          { count: hiddenUsers },
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_online", true),
          supabase.from("user_bans").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("hidden_users").select("id", { count: "exact", head: true }),
        ]);

        let query = supabase
          .from("profiles")
          .select("*", { count: "exact" });
        
        // Filtreler
        if (input.filter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          query = query.gte('created_at', today.toISOString());
        } else if (input.filter === 'banned') {
          // Banlı kullanıcıları bulmak için subquery kullan
          const { data: bannedUserIds } = await supabase
            .from('user_bans')
            .select('user_id')
            .eq('is_active', true);
          
          if (bannedUserIds && bannedUserIds.length > 0) {
            const userIds = bannedUserIds.map(b => b.user_id);
            query = query.in('id', userIds);
          } else {
            // Banlı kullanıcı yoksa boş sonuç döndür
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else if (input.filter === 'blueTick') {
          // Mavi tikli kullanıcıları bulmak için subquery kullan
          const { data: blueTickUserIds } = await supabase
            .from('blue_ticks')
            .select('user_id')
            .eq('is_active', true);
          
          if (blueTickUserIds && blueTickUserIds.length > 0) {
            const userIds = blueTickUserIds.map(b => b.user_id);
            query = query.in('id', userIds);
          } else {
            // Mavi tikli kullanıcı yoksa boş sonuç döndür
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else if (input.filter === 'hidden') {
          const { data: hiddenUserIds } = await supabase
            .from('hidden_users')
            .select('user_id');

          if (hiddenUserIds && hiddenUserIds.length > 0) {
            const userIds = hiddenUserIds.map((h) => h.user_id);
            query = query.in('id', userIds);
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else if (input.filter === 'live') {
          query = query.eq('is_online', true);
        }
        
        if (input.search) {
          query = query.or(`full_name.ilike.%${input.search}%,email.ilike.%${input.search}%`);
        }
        
        query = query
          .order("created_at", { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);
        
        const { data, error, count } = await query;
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        // Manuel olarak blue_ticks, user_bans ve hidden_users verilerini ekle
        const userIds = (data || []).map((u: any) => u.id);
        
        const [blueTicksData, userBansData, hiddenUsersData] = await Promise.all([
          userIds.length > 0 ? supabase
            .from('blue_ticks')
            .select('user_id, id, verified_at, verification_type, is_active')
            .in('user_id', userIds)
            .eq('is_active', true)
            .then(({ data }) => data || []) : Promise.resolve([]),
          userIds.length > 0 ? supabase
            .from('user_bans')
            .select('user_id, id, reason, ban_type, ban_until, is_active')
            .in('user_id', userIds)
            .eq('is_active', true)
            .then(({ data }) => data || []) : Promise.resolve([]),
          userIds.length > 0 ? supabase
            .from('hidden_users')
            .select('user_id, id, hidden_at')
            .in('user_id', userIds)
            .then(({ data }) => data || []) : Promise.resolve([]),
        ]);
        
        // Verileri birleştir
        const usersWithRelations = (data || []).map((user: any) => {
          const blueTicks = blueTicksData.filter((bt: any) => bt.user_id === user.id);
          const userBans = userBansData.filter((ub: any) => ub.user_id === user.id);
          const hiddenUsers = hiddenUsersData.filter((hu: any) => hu.user_id === user.id);
          
          return {
            ...user,
            blue_ticks: blueTicks.length > 0 ? blueTicks : null,
            user_bans: userBans.length > 0 ? userBans : null,
            hidden_users: hiddenUsers.length > 0 ? hiddenUsers : null,
          };
        });
        
        return {
          users: usersWithRelations,
          total: count || 0,
          stats: {
            totalUsers: totalUsers ?? 0,
            liveUsers: liveUsers ?? 0,
            bannedUsers: bannedUsers ?? 0,
            hiddenUsers: hiddenUsers ?? 0,
          },
        };
      }),

    banUser: protectedProcedure
      .input(
        z.object({
          userId: z.string().uuid(),
          reason: z.string().min(1),
          banType: z.enum(["temporary", "permanent"]),
          banUntil: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        let adminUserId: string;
        if (user.id === SPECIAL_ADMIN_ID) {
          const { data: adminUserRecord } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          adminUserId = adminUserRecord?.id || user.id;
        } else {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
          adminUserId = adminUser.id;
        }
        
        const banData: any = {
          user_id: input.userId,
          banned_by: adminUserId,
          reason: input.reason,
          ban_type: input.banType,
          is_active: true,
        };
        
        if (input.banType === "temporary" && input.banUntil) {
          banData.ban_until = input.banUntil;
        }
        
        const { data, error } = await supabase
          .from("user_bans")
          .insert(banData)
          .select()
          .single();
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return data;
      }),

    unbanUser: protectedProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        const { error } = await supabase
          .from("user_bans")
          .update({ is_active: false })
          .eq("user_id", input.userId)
          .eq("is_active", true);
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return { success: true };
      }),

    giveBlueTick: protectedProcedure
      .input(
        z.object({
          userId: z.string().uuid(),
          verificationType: z.enum(["manual", "automatic", "celebrity"]).default("manual"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        let adminUserId: string;
        if (user.id === SPECIAL_ADMIN_ID) {
          const { data: adminUserRecord } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          adminUserId = adminUserRecord?.id || user.id;
        } else {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
          adminUserId = adminUser.id;
        }
        
        // Mevcut blue tick var mı kontrol et
        const { data: existing } = await supabase
          .from("blue_ticks")
          .select("id")
          .eq("user_id", input.userId)
          .maybeSingle();
        
        let blueTickRecord;
        if (existing) {
          const { data, error } = await supabase
            .from("blue_ticks")
            .update({
              is_active: true,
              verified_by: adminUserId,
              verification_type: input.verificationType,
            })
            .eq("id", existing.id)
            .select()
            .single();
          
          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
          blueTickRecord = data;
        } else {
          const { data, error } = await supabase
            .from("blue_ticks")
            .insert({
              user_id: input.userId,
              verified_by: adminUserId,
              verification_type: input.verificationType,
              is_active: true,
            })
            .select()
            .single();
          
          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
          blueTickRecord = data;
        }

        await supabase
          .from("profiles")
          .update({ verified: true })
          .eq("id", input.userId);

        return blueTickRecord;
      }),

    removeBlueTick: protectedProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        const { error } = await supabase
          .from("blue_ticks")
          .update({ is_active: false })
          .eq("user_id", input.userId)
          .eq("is_active", true);
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        // Profiles tablosundaki verified alanını false yap
        await supabase
          .from("profiles")
          .update({ verified: false })
          .eq("id", input.userId);

        return { success: true };
      }),

    // KYC Yönetimi
    getKycRequests: protectedProcedure
      .input(
        z.object({
          status: z.enum(['pending', 'approved', 'rejected']).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        // Önce toplam sayıyı al
        let countQuery = supabase
          .from("kyc_requests")
          .select("*", { count: "exact", head: true });
        
        if (input.status) {
          countQuery = countQuery.eq("status", input.status);
        }
        
        const { count } = await countQuery;
        
        // KYC isteklerini al
        let query = supabase
          .from("kyc_requests")
          .select("*");
        
        if (input.status) {
          query = query.eq("status", input.status);
        }
        
        query = query
          .order("created_at", { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);
        
        const { data: requestsData, error } = await query;
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        // Manuel olarak user ve documents verilerini ekle
        const userIds = (requestsData || []).map((r: any) => r.user_id);
        const requestIds = (requestsData || []).map((r: any) => r.id);
        
        const [usersData, documentsData] = await Promise.all([
          userIds.length > 0 ? supabase
            .from('profiles')
            .select('id, full_name, avatar_url, username, email')
            .in('id', userIds)
            .then(({ data }) => data || []) : Promise.resolve([]),
          requestIds.length > 0 ? supabase
            .from('kyc_documents')
            .select('*')
            .in('kyc_request_id', requestIds)
            .then(({ data }) => data || []) : Promise.resolve([]),
        ]);
        
        // Verileri birleştir
        const requestsWithRelations = (requestsData || []).map((request: any) => {
          const user = usersData.find((u: any) => u.id === request.user_id) || null;
          const documents = documentsData.filter((d: any) => d.kyc_request_id === request.id);
          
          return {
            ...request,
            user,
            documents,
          };
        });
        
        return {
          requests: requestsWithRelations,
          total: count || 0,
        };
      }),

    approveKyc: protectedProcedure
      .input(z.object({ kycId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        let adminUserId: string;
        if (user.id === SPECIAL_ADMIN_ID) {
          const { data: adminUserRecord } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          adminUserId = adminUserRecord?.id || user.id;
        } else {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
          adminUserId = adminUser.id;
        }
        
        // KYC request'i güncelle
        const { data: kycRequest, error: fetchError } = await supabase
          .from("kyc_requests")
          .select("user_id, full_name")
          .eq("id", input.kycId)
          .single();
        
        if (fetchError || !kycRequest) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'KYC başvurusu bulunamadı' });
        }
        
        const { data, error } = await supabase
          .from("kyc_requests")
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUserId,
          })
          .eq("id", input.kycId)
          .select()
          .single();
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        // Profile'ı güncelle (trigger otomatik yapacak ama emin olmak için)
        await supabase
          .from("profiles")
          .update({ is_verified: true, verified: true })
          .eq("id", kycRequest.user_id);

        // KYC onay bildirimi gönder
        try {
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              user_id: kycRequest.user_id,
              type: 'SYSTEM',
              title: 'Kimlik Doğrulama Onaylandı',
              body: `Kimlik doğrulama başvurunuz onaylandı. Artık doğrulanmış kullanıcı olarak işaretlendiniz.`,
              data: {
                type: 'KYC_APPROVED',
                kyc_id: input.kycId,
              },
              push_sent: false,
            })
            .select()
            .single();

          // Push bildirimi gönder
          if (notification) {
            const { data: targetProfile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', kycRequest.user_id)
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
                    title: 'Kimlik Doğrulama Onaylandı',
                    body: 'Kimlik doğrulama başvurunuz onaylandı.',
                    data: {
                      type: 'KYC_APPROVED',
                      kycId: input.kycId,
                    },
                    badge: 1,
                  }),
                });

                await supabase
                  .from('notifications')
                  .update({ push_sent: true })
                  .eq('id', notification.id);
              } catch (pushError) {
                console.error('KYC approval push notification error:', pushError);
              }
            }
          }
        } catch (notificationError) {
          console.error('KYC approval notification error:', notificationError);
        }
        
        return data;
      }),

    rejectKyc: protectedProcedure
      .input(
        z.object({
          kycId: z.string().uuid(),
          reviewNotes: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        let adminUserId: string;
        if (user.id === SPECIAL_ADMIN_ID) {
          const { data: adminUserRecord } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          adminUserId = adminUserRecord?.id || user.id;
        } else {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
          adminUserId = adminUser.id;
        }
        
        // KYC request'i güncelle
        const { data: kycRequest, error: fetchError } = await supabase
          .from("kyc_requests")
          .select("user_id, full_name")
          .eq("id", input.kycId)
          .single();
        
        if (fetchError || !kycRequest) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'KYC başvurusu bulunamadı' });
        }
        
        const { data, error } = await supabase
          .from("kyc_requests")
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUserId,
            review_notes: input.reviewNotes,
          })
          .eq("id", input.kycId)
          .select()
          .single();
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        // Profile'ı güncelle (trigger otomatik yapacak ama emin olmak için)
        await supabase
          .from("profiles")
          .update({ is_verified: false, verified: false })
          .eq("id", kycRequest.user_id);

        // KYC red bildirimi gönder
        try {
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              user_id: kycRequest.user_id,
              type: 'SYSTEM',
              title: 'Kimlik Doğrulama Reddedildi',
              body: `Kimlik doğrulama başvurunuz reddedildi. Sebep: ${input.reviewNotes}`,
              data: {
                type: 'KYC_REJECTED',
                kyc_id: input.kycId,
                review_notes: input.reviewNotes,
              },
              push_sent: false,
            })
            .select()
            .single();

          // Push bildirimi gönder
          if (notification) {
            const { data: targetProfile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', kycRequest.user_id)
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
                    title: 'Kimlik Doğrulama Reddedildi',
                    body: `Kimlik doğrulama başvurunuz reddedildi.`,
                    data: {
                      type: 'KYC_REJECTED',
                      kycId: input.kycId,
                    },
                    badge: 1,
                  }),
                });

                await supabase
                  .from('notifications')
                  .update({ push_sent: true })
                  .eq('id', notification.id);
              } catch (pushError) {
                console.error('KYC rejection push notification error:', pushError);
              }
            }
          }
        } catch (notificationError) {
          console.error('KYC rejection notification error:', notificationError);
        }
        
        return data;
      }),

    // Gönderi yönetimi
    getAllPosts: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        let query = supabase
          .from("posts")
          .select(`
            *,
            author:profiles!posts_author_id_fkey(id, full_name, avatar_url, username),
            post_media(*)
          `, { count: "exact" })
          .eq("is_deleted", false);
        
        if (input.search) {
          query = query.or(`content.ilike.%${input.search}%`);
        }
        
        query = query
          .order("created_at", { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);
        
        const { data, error, count } = await query;
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return {
          posts: data || [],
          total: count || 0,
        };
      }),

    // Yorum yönetimi
    getAllComments: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        let query = supabase
          .from("comments")
          .select(`
            *,
            user:profiles!comments_user_id_fkey(id, full_name, avatar_url, username),
            post:posts!comments_post_id_fkey(id, content)
          `, { count: "exact" });
        
        if (input.search) {
          query = query.or(`content.ilike.%${input.search}%`);
        }
        
        query = query
          .order("created_at", { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);
        
        const { data, error, count } = await query;
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        return {
          comments: data || [],
          total: count || 0,
        };
      }),

    // Kullanıcı detay bilgileri
    getUserDetail: protectedProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        // Admin kontrolü
        const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
        if (user.id !== SPECIAL_ADMIN_ID) {
          const { data: adminUser } = await supabase
            .from("admin_users")
            .select("role, id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (!adminUser) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
          }
        }
        
        const { data: profile, error } = await supabase
          .from("profiles")
          .select(`
            *,
            blue_ticks!left(*),
            user_bans!left(*),
            supporter_badges!left(*)
          `)
          .eq("id", input.userId)
          .single();
        
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        
        // Kullanıcının gönderi sayısı
        const { count: postCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", input.userId)
          .eq("is_deleted", false);
        
        // Kullanıcının yorum sayısı
        const { count: commentCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", input.userId);
        
        return {
          profile,
          postCount: postCount || 0,
          commentCount: commentCount || 0,
        };
      }),

    // Bildirim gönderme
    sendNotification: protectedProcedure
      .input(
        z.object({
          userId: z.string().uuid().optional(), // Tek kullanıcı için
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
          type: z.enum(['SYSTEM', 'EVENT', 'MESSAGE', 'RESERVATION', 'FOOTBALL']).optional().default('SYSTEM'),
          data: z.record(z.string(), z.any()).optional(),
          mediaUrl: z.string().url().optional(),
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
        
        const bodyText = input.body.trim();
        
        // Data objesini oluştur (medya URL'i varsa ekle)
        const notificationData: any = { ...(input.data || {}) };
        if (input.mediaUrl) {
          notificationData.mediaUrl = input.mediaUrl;
        }
        
        // Admin bildirimleri mytrabzonteam adıyla gönderilir
        const adminTitle = input.type === 'SYSTEM' ? `MyTrabzonTeam: ${input.title}` : input.title;
        
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
            const adminTitle = input.type === 'SYSTEM' ? `MyTrabzonTeam: ${input.title}` : input.title;
            const messages = pushTokens.map((token) => ({
              to: token,
              sound: 'default',
              title: adminTitle,
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
                console.error('Push notification error:', await response.text());
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
            console.error('Push notification error:', pushError);
            // Push hatası olsa bile bildirimler kaydedildi, devam et
          }
        }

        return {
          success: true,
          sentCount: targetUserIds.length,
          pushSentCount: pushTokens.length,
        };
      }),
  }),

  // ===================================================================
  // OLAY VAR BİLDİRİM SİSTEMİ
  // ===================================================================
  event: createTRPCRouter({
    createEvent: protectedProcedure
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
          expires_at: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const now = new Date();
        const expiresAt = input.expires_at 
          ? new Date(input.expires_at)
          : new Date(Date.now() + 2 * 60 * 60 * 1000);

        // İlçe zorunlu - "Tümü" seçeneği kaldırıldı, sadece tek ilçe kabul ediliyor
        if (!input.district || input.district.trim() === '') {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'İlçe seçimi zorunludur' 
          });
        }

        // Sadece seçilen ilçe için event oluştur
        const eventToInsert = {
          user_id: user.id,
          title: input.title,
          description: input.description,
          category: input.category,
          severity: input.severity,
          district: input.district,
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
          media_urls: input.media_urls,
          audio_url: input.audio_url,
          start_date: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          is_deleted: false,
        };

        const { data: events, error } = await supabase
          .from('events')
          .insert([eventToInsert])
          .select();

        if (error) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: error.message 
          });
        }

        // İlk event'i döndür (bildirimler için)
        const firstEvent = events?.[0];
        if (!firstEvent) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'Event oluşturulamadı' 
          });
        }

        // Algoritma: Etkilenecek kullanıcıları bul ve bildirim oluştur
        try {
          await createNotificationsForEvent(
            supabase,
            firstEvent,
            input.severity,
            input.district,
            input.city
          );
        } catch (notificationError) {
          console.error('❌ Notification creation failed:', notificationError);
          // Bildirim hatası olsa bile event oluşturuldu, devam et
        }

        return firstEvent;
      }),

    getEvents: publicProcedure
      .input(
        z.object({
          district: z.string().optional(),
          city: z.enum(['Trabzon', 'Giresun']).optional(),
          category: z.string().optional(),
          severity: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        // Log kaldırıldı - egress optimizasyonu
        
        let query = supabase
          .from('events')
          .select(`*`, { count: 'exact' })
          .eq('is_active', true)
          .eq('is_deleted', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.district && input.district.trim() !== '') {
          // Sadece belirli bir district seçildiyse filtrele
          query = query.eq('district', input.district);
        }
        // District belirtilmediyse tüm district'lerden event'leri getir
        if (input.city) {
          query = query.eq('city', input.city);
        }
        if (input.category) {
          query = query.eq('category', input.category);
        }
        if (input.severity) {
          query = query.eq('severity', input.severity);
        }

        const { data, error, count } = await query;

        if (error) {
          // Log kaldırıldı - egress optimizasyonu
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        let events = data || [];

        if (events.length > 0) {
          const userIds = [...new Set(events.map((event: any) => event.user_id).filter(Boolean))];
          
          if (userIds.length > 0) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, username, verified')
              .in('id', userIds);
            
            if (profileError) {
              console.error('❌ getEvents profile load error:', profileError);
            } else if (profileData) {
              const profileMap = new Map(profileData.map((profile: any) => [profile.id, profile]));
              events = events.map((event: any) => ({
                ...event,
                user: profileMap.get(event.user_id) || null,
              }));
            }
          }
        }

        // Log kaldırıldı - egress optimizasyonu

        // Event like durumlarını kontrol et
        const { user: currentUser } = ctx;
        if (currentUser && events.length > 0) {
          const eventIds = events.map((e: any) => e.id);
          const { data: eventLikes } = await supabase
            .from('event_likes')
            .select('event_id')
            .in('event_id', eventIds)
            .eq('user_id', currentUser.id);

          const likedEventIds = new Set(eventLikes?.map((l: any) => l.event_id) || []);
          events = events.map((event: any) => ({
            ...event,
            is_liked: likedEventIds.has(event.id),
            like_count: event.like_count || 0,
            comment_count: event.comment_count || 0,
          }));
        } else {
          events = events.map((event: any) => ({
            ...event,
            is_liked: false,
            like_count: event.like_count || 0,
            comment_count: event.comment_count || 0,
          }));
        }

        return {
          events,
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    likeEvent: protectedProcedure
      .input(z.object({ event_id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Mevcut like'ı kontrol et
        const { data: existing } = await supabase
          .from('event_likes')
          .select('id')
          .eq('event_id', input.event_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          // Unlike
          const { error } = await supabase
            .from('event_likes')
            .delete()
            .eq('id', existing.id);

          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

          // Like count'u azalt
          await supabase.rpc('decrement_event_likes', { event_id_param: input.event_id });

          return { liked: false };
        } else {
          // Like
          const { error } = await supabase
            .from('event_likes')
            .insert({
              event_id: input.event_id,
              user_id: user.id,
            });

          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

          // Like count'u artır
          await supabase.rpc('increment_event_likes', { event_id_param: input.event_id });

          return { liked: true };
        }
      }),

    addEventComment: protectedProcedure
      .input(
        z.object({
          event_id: z.string().uuid(),
          content: z.string().min(1).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) {
          console.error('addEventComment: User not found in context');
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Yorum yapmak için giriş yapmanız gerekiyor' 
          });
        }

        // Event'in varlığını kontrol et
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, is_deleted')
          .eq('id', input.event_id)
          .single();

        if (eventError || !eventData) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Olay bulunamadı' 
          });
        }

        if (eventData.is_deleted) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Bu olay silinmiş' 
          });
        }

        // User'ın varlığını kontrol et (profiles tablosunda)
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (userError || !userProfile) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Kullanıcı profili bulunamadı' 
          });
        }

        // Yorum ekle
        const { data, error } = await supabase
          .from('event_comments')
          .insert({
            event_id: input.event_id,
            user_id: user.id,
            content: input.content.trim(),
          })
          .select(`
            *,
            user:profiles!event_comments_user_id_fkey(id, full_name, avatar_url, username)
          `)
          .single();

        if (error) {
          console.error('Event comment insert error:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: error.message || 'Yorum eklenemedi' 
          });
        }

        // Comment count'u artır (RPC fonksiyonu yoksa manuel güncelle)
        try {
          const { error: rpcError } = await supabase.rpc('increment_event_comments', { 
            event_id_param: input.event_id 
          });
          
          if (rpcError) {
            // RPC fonksiyonu yoksa manuel güncelle
            console.warn('increment_event_comments RPC not found, updating manually:', rpcError);
            const { data: event } = await supabase
              .from('events')
              .select('comment_count')
              .eq('id', input.event_id)
              .single();
            
            if (event) {
              await supabase
                .from('events')
                .update({ comment_count: (event.comment_count || 0) + 1 })
                .eq('id', input.event_id);
            }
          }
        } catch (rpcErr: any) {
          console.warn('Failed to increment comment count:', rpcErr);
          // RPC hatası kritik değil, yorum zaten eklendi
        }

        return data;
      }),

    getEventComments: publicProcedure
      .input(
        z.object({
          event_id: z.string().uuid(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        const { data, error } = await supabase
          .from('event_comments')
          .select(`
            *,
            user:profiles!event_comments_user_id_fkey(id, full_name, avatar_url, username, verified)
          `)
          .eq('event_id', input.event_id)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return { comments: data || [] };
      }),

    deleteEvent: protectedProcedure
      .input(
        z.object({
          event_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Kullanıcının own olup olmadığını kontrol et
        const { data: existingEvent, error: fetchError } = await supabase
          .from('events')
          .select('id, user_id')
          .eq('id', input.event_id)
          .eq('is_deleted', false)
          .single();

        if (fetchError || !existingEvent) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Olay bulunamadı veya silinmiş' });
        }

        if (existingEvent.user_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu olayı silme yetkiniz yok' });
        }

        const { error: deleteError } = await supabase
          .from('events')
          .update({
            is_deleted: true,
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.event_id)
          .eq('user_id', user.id);

        if (deleteError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message });
        }

        return { success: true };
      }),
  }),

  notification: createTRPCRouter({
    getNotifications: protectedProcedure
      .input(
        z.object({
          type: z.enum(['EVENT', 'SYSTEM', 'MESSAGE', 'RESERVATION', 'FOOTBALL']).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        let query = supabase
          .from('notifications')
          .select(`
            *,
            event:events(id, title, category, severity, district, media_urls, description)
          `, { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.type) {
          query = query.eq('type', input.type);
        }

        const { data, error, count } = await query;

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return {
          notifications: data || [],
          total: count || 0,
          hasMore: count ? input.offset + input.limit < count : false,
        };
      }),

    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .is('read_at', null);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return { count: data?.length || 0 };
      }),

    markAsRead: protectedProcedure
      .input(
        z.object({
          notification_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data, error } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', input.notification_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return data;
      }),

    deleteNotification: protectedProcedure
      .input(
        z.object({
          notification_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data, error } = await supabase
          .from('notifications')
          .update({ is_deleted: true })
          .eq('id', input.notification_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return data;
      }),

    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { error } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .is('read_at', null);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return { success: true };
      }),

    deleteAllNotifications: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { error } = await supabase
          .from('notifications')
          .update({ is_deleted: true })
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return { success: true };
      }),
  }),

  // ===================================================================
  // YOLCULUK PAYLAŞIMI ROUTER
  // ===================================================================
  ride: createTRPCRouter({
    createRide: protectedProcedure
      .input(
        z.object({
          departure_title: z.string().min(1).max(200),
          departure_description: z.string().optional().nullable(),
          destination_title: z.string().min(1).max(200),
          destination_description: z.string().optional().nullable(),
          stops: z.array(z.string()).default([]),
          departure_time: z.string().datetime(),
          total_seats: z.number().int().min(1).max(10),
          price_per_seat: z.number().int().min(10).max(5000),
          notes: z.string().optional().nullable(),
          allow_pets: z.boolean().default(false),
          allow_smoking: z.boolean().default(false),
          vehicle_brand: z.string().min(2).max(120),
          vehicle_model: z.string().min(1).max(120),
          vehicle_color: z.string().min(2).max(60),
          vehicle_plate: z.string().min(4).max(20),
          driver_full_name: z.string().min(3).max(160),
          driver_phone: z.string().min(10).max(20),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Build raw fields
        const departure_raw = `${input.departure_title}${input.departure_description ? ' - ' + input.departure_description : ''}`.trim();
        const destination_raw = `${input.destination_title}${input.destination_description ? ' - ' + input.destination_description : ''}`.trim();
        const stops_raw = input.stops.length > 0 ? input.stops.join(' | ') : null;

        // Calculate expires_at (departure_time + 1 hour)
        const departureTime = new Date(input.departure_time);
        const expiresAt = new Date(departureTime.getTime() + 60 * 60 * 1000); // +1 hour

        // Insert ride offer
        const { data, error } = await supabase
          .from('ride_offers')
          .insert({
            driver_id: user.id,
            departure_title: input.departure_title,
            departure_description: input.departure_description || null,
            departure_raw,
            destination_title: input.destination_title,
            destination_description: input.destination_description || null,
            destination_raw,
            stops_text: input.stops,
            stops_raw,
            departure_time: departureTime.toISOString(),
            total_seats: input.total_seats,
            available_seats: input.total_seats,
            price_per_seat: input.price_per_seat,
            currency: 'TL',
            notes: input.notes || null,
            allow_pets: input.allow_pets,
            allow_smoking: input.allow_smoking,
          vehicle_brand: input.vehicle_brand,
          vehicle_model: input.vehicle_model,
          vehicle_color: input.vehicle_color,
          vehicle_plate: input.vehicle_plate,
          driver_full_name: input.driver_full_name,
          driver_phone: input.driver_phone.trim(),
            status: 'active',
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Create ride error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Yolculuk oluşturulamadı' });
        }

        return data;
      }),

    searchRides: publicProcedure
      .input(
        z.object({
          from_text: z.string().optional().nullable(),
          to_text: z.string().optional().nullable(),
          date: z.string().datetime().optional().nullable(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        await cleanupExpiredRides(supabase);

        const upcomingThreshold = new Date(Date.now() - UPCOMING_BUFFER_MINUTES * 60 * 1000).toISOString();

        let query = supabase
          .from('ride_offers')
          .select(`
            *,
            driver:profiles(id, full_name, avatar_url, verified)
          `)
          .eq('status', 'active')
          .gt('expires_at', upcomingThreshold)
          .gte('departure_time', upcomingThreshold)
          .gt('available_seats', 0);

        // Date filter
        if (input.date) {
          const selectedDate = new Date(input.date);
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);

          query = query
            .gte('departure_time', startOfDay.toISOString())
            .lte('departure_time', endOfDay.toISOString());
        }

        // From filter (departure or stops)
        if (input.from_text && input.from_text.trim()) {
          const fromText = `%${input.from_text.trim()}%`;
          query = query.or(`departure_raw.ilike.${fromText},stops_raw.ilike.${fromText}`);
        }

        // To filter (destination or stops)
        if (input.to_text && input.to_text.trim()) {
          const toText = `%${input.to_text.trim()}%`;
          query = query.or(`destination_raw.ilike.${toText},stops_raw.ilike.${toText}`);
        }

        // Order by departure_time ascending
        query = query.order('departure_time', { ascending: true });

        const { data, error } = await query;

        if (error) {
          console.error('Search rides error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Yolculuklar aranırken bir hata oluştu' });
        }

        const rides = (data || []).map((ride) => sanitizeRideForClient(ride));

        return { rides };
      }),

    getDriverRides: publicProcedure
      .input(
        z.object({
          driver_id: z.string().uuid(),
          includePast: z.boolean().optional().default(true),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        await cleanupExpiredRides(supabase);

        const { data, error } = await supabase
          .from('ride_offers')
          .select(`
            *
          `)
          .eq('driver_id', input.driver_id)
          .order('departure_time', { ascending: false });

        if (error) {
          console.error('Get driver rides error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Yolculuklar getirilemedi' });
        }

        const upcomingThreshold = new Date(Date.now() - UPCOMING_BUFFER_MINUTES * 60 * 1000);
        const rides = (data || []).map((ride) => ({
          ...sanitizeRideForClient(ride),
          is_past: new Date(ride.departure_time) < upcomingThreshold,
        }));

        const upcoming = rides.filter((ride) => !ride.is_past && ride.status === 'active');
        const past = input.includePast ? rides.filter((ride) => ride.is_past || ride.status !== 'active') : [];

        return { upcoming, past };
      }),

    getRideDetail: publicProcedure
      .input(z.object({ ride_id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        const userId = user?.id ?? null;

        const { data, error } = await supabase
          .from('ride_offers')
          .select(`
            *,
            driver:profiles(id, full_name, avatar_url, verified)
          `)
          .eq('id', input.ride_id)
          .single();

        if (error) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Yolculuk bulunamadı' });
        }

        let userBooking: any = null;
        if (userId) {
          const { data: userBookingRow } = await supabase
            .from('ride_bookings')
            .select('*')
            .eq('ride_offer_id', input.ride_id)
            .eq('passenger_id', userId)
            .order('created_at', { ascending: false })
            .maybeSingle();

          userBooking = userBookingRow || null;
        }

        let driverBookings: any[] = [];
        if (userId && data.driver_id === userId) {
          const { data: bookingRows } = await supabase
            .from('ride_bookings')
            .select(`
              *,
              passenger:profiles(id, full_name, avatar_url, verified, phone)
            `)
            .eq('ride_offer_id', input.ride_id)
            .order('created_at', { ascending: true });

          driverBookings = bookingRows ?? [];
        }

        const { data: reviewRows } = await supabase
          .from('ride_reviews')
          .select(`
            *,
            passenger:profiles(id, full_name, avatar_url)
          `)
          .eq('ride_offer_id', input.ride_id)
          .order('created_at', { ascending: false });

        const sanitizedReviews = (reviewRows || []).map(sanitizeReview);
        const userHasReview = userId
          ? sanitizedReviews.some((review) => review.passenger_id === userId)
          : false;

        const sanitizedRide = sanitizeRideForClient(data);
        const sanitizedUserBooking = sanitizeBookingForClient(userBooking);
        if (sanitizedUserBooking) {
          sanitizedUserBooking.has_review = userHasReview;
        }
        const sanitizedDriverBookings = (driverBookings || []).map((booking) =>
          sanitizeBookingForClient(booking)
        );

        return {
          ride: sanitizedRide,
          userBooking: sanitizedUserBooking,
          bookings: sanitizedDriverBookings,
          reviews: sanitizedReviews,
          isDriver: userId ? data.driver_id === userId : false,
        };
      }),

    bookRide: protectedProcedure
      .input(
        z.object({
          ride_offer_id: z.string().uuid(),
          seats_requested: z.number().int().min(1).max(5).default(1),
          notes: z.string().optional().nullable(),
          passenger_phone: z.string().min(10).max(20),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Check if ride exists and has available seats
        const { data: ride, error: rideError } = await supabase
          .from('ride_offers')
          .select('*, driver:profiles(id, full_name, avatar_url)')
          .eq('id', input.ride_offer_id)
          .eq('status', 'active')
          .single();

        if (rideError || !ride) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Yolculuk bulunamadı veya aktif değil' });
        }

        // Check if user is the driver
        if (ride.driver_id === user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Kendi yolculuğunuza rezervasyon yapamazsınız' });
        }

        // Check available seats
        if (ride.available_seats < input.seats_requested) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Sadece ${ride.available_seats} boş koltuk var` });
        }

        // Check if user already has a booking
        const { data: existingBooking } = await supabase
          .from('ride_bookings')
          .select('*')
          .eq('ride_offer_id', input.ride_offer_id)
          .eq('passenger_id', user.id)
          .maybeSingle();

        if (existingBooking) {
          if (existingBooking.status === 'pending') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bu yolculuk için zaten bekleyen bir rezervasyonunuz var' });
          }
          if (existingBooking.status === 'approved') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bu yolculuk için zaten onaylanmış bir rezervasyonunuz var' });
          }
        }

        // Create booking
        const passengerPhone = input.passenger_phone.trim();

        const { data: booking, error } = await supabase
          .from('ride_bookings')
          .insert({
            ride_offer_id: input.ride_offer_id,
            passenger_id: user.id,
            seats_requested: input.seats_requested,
            notes: input.notes || null,
            passenger_phone: passengerPhone,
            status: 'pending',
          })
          .select()
          .single();

        if (error) {
          console.error('Book ride error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Rezervasyon oluşturulamadı' });
        }

        // Get passenger profile
        const { data: passengerProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        // Create notification for driver
        const { data: notification } = await supabase
          .from('notifications')
          .insert({
            user_id: ride.driver_id,
            type: 'RIDE_BOOKING',
            title: 'Yeni Yolculuk Rezervasyonu',
            message: `${passengerProfile?.full_name || 'Bir kullanıcı'} yolculuğunuza ${input.seats_requested} koltuk için rezervasyon yaptı`,
            data: {
              ride_offer_id: input.ride_offer_id,
              booking_id: booking.id,
              passenger_id: user.id,
              seats_requested: input.seats_requested,
            },
            push_sent: false,
          })
          .select()
          .single();

        // Send push notification to driver
        if (notification) {
          try {
            const { data: driverProfile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', ride.driver_id)
              .single();

            if (driverProfile?.push_token) {
              const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
              await fetch(expoPushUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify({
                  to: driverProfile.push_token,
                  sound: 'default',
                  title: 'Yeni Yolculuk Rezervasyonu',
                  body: `${passengerProfile?.full_name || 'Bir kullanıcı'} yolculuğunuza ${input.seats_requested} koltuk için rezervasyon yaptı`,
                  data: {
                    type: 'RIDE_BOOKING',
                    ride_offer_id: input.ride_offer_id,
                    booking_id: booking.id,
                  },
                  badge: 1,
                }),
              });

              await supabase
                .from('notifications')
                .update({ push_sent: true })
                .eq('id', notification.id);
            }
          } catch (pushError) {
            console.error('Push notification error:', pushError);
          }
        }

        // Create or get chat room between driver and passenger
        try {
          const roomId = await ensureDirectChatRoom(supabase, ride.driver_id, user.id);
          await supabase
            .from('messages')
            .insert({
              room_id: roomId,
              user_id: user.id,
              content: `Merhaba! Yolculuğunuza ${input.seats_requested} koltuk için rezervasyon talebi bıraktım. ${input.notes ? `Notum: ${input.notes}` : 'Detayları konuşabilir miyiz?'}`,
            });
        } catch (chatError) {
          console.error('Chat room creation error:', chatError);
          // Chat hatası olsa bile rezervasyon oluşturuldu, devam et
        }

        return sanitizeBookingForClient(booking);
      }),

    createReview: protectedProcedure
      .input(
        z.object({
          booking_id: z.string().uuid(),
          rating: z.number().int().min(1).max(5),
          comment: z.string().max(1000).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data: booking, error: bookingError } = await supabase
          .from('ride_bookings')
          .select(`
            *,
            ride:ride_offers(id, driver_id, departure_time)
          `)
          .eq('id', input.booking_id)
          .single();

        if (bookingError || !booking) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Rezervasyon bulunamadı' });
        }

        if (booking.passenger_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu rezervasyon size ait değil' });
        }

        if (booking.status !== 'approved') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sadece onaylanan rezervasyonlar değerlendirilebilir' });
        }

        if (new Date(booking.ride.departure_time) > new Date()) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Yolculuk tamamlanmadan değerlendirme bırakılamaz' });
        }

        const { data: existingReview } = await supabase
          .from('ride_reviews')
          .select('id')
          .eq('booking_id', input.booking_id)
          .maybeSingle();

        if (existingReview) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bu yolculuk için zaten bir yorum bıraktınız' });
        }

        const { data: review, error } = await supabase
          .from('ride_reviews')
          .insert({
            ride_offer_id: booking.ride_offer_id,
            booking_id: booking.id,
            passenger_id: user.id,
            driver_id: booking.ride.driver_id,
            rating: input.rating,
            comment: input.comment || null,
          })
          .select(`
            *,
            passenger:profiles(id, full_name, avatar_url),
            ride:ride_offers(id, departure_title, destination_title, departure_time)
          `)
          .single();

        if (error) {
          console.error('Create review error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Yorum kaydedilemedi' });
        }

        return sanitizeReview(review);
      }),

    getDriverReviews: publicProcedure
      .input(
        z.object({
          driver_id: z.string().uuid(),
          limit: z.number().int().min(1).max(100).optional().default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;

        // Önce reviews'ları çek
        const { data: reviews, error: reviewsError } = await supabase
          .from('ride_reviews')
          .select('*')
          .eq('driver_id', input.driver_id)
          .order('created_at', { ascending: false })
          .limit(input.limit);

        if (reviewsError) {
          console.error('Get driver reviews error:', reviewsError);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reviewsError.message || 'Yorumlar getirilemedi' });
        }

        if (!reviews || reviews.length === 0) {
          return [];
        }

        // Passenger ve ride bilgilerini ayrı ayrı çek
        const passengerIds = [...new Set(reviews.map((r: any) => r.passenger_id).filter(Boolean))];
        const rideOfferIds = [...new Set(reviews.map((r: any) => r.ride_offer_id).filter(Boolean))];

        const [passengersResult, ridesResult] = await Promise.all([
          passengerIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', passengerIds)
            : Promise.resolve({ data: [], error: null }),
          rideOfferIds.length > 0
            ? supabase
                .from('ride_offers')
                .select('id, departure_title, destination_title, departure_time')
                .in('id', rideOfferIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        const passengerMap = new Map((passengersResult.data || []).map((p: any) => [p.id, p]));
        const rideMap = new Map((ridesResult.data || []).map((r: any) => [r.id, r]));

        // Reviews'ları passenger ve ride bilgileriyle birleştir
        const enrichedReviews = reviews.map((review: any) => ({
          ...review,
          passenger: review.passenger_id ? passengerMap.get(review.passenger_id) || null : null,
          ride: review.ride_offer_id ? rideMap.get(review.ride_offer_id) || null : null,
        }));

        return enrichedReviews.map(sanitizeReview);
      }),

    approveBooking: protectedProcedure
      .input(
        z.object({
          booking_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Get booking with ride info
        const { data: booking, error: bookingError } = await supabase
          .from('ride_bookings')
          .select('*, ride:ride_offers(driver_id, departure_title, destination_title, available_seats, departure_time)')
          .eq('id', input.booking_id)
          .single();

        if (bookingError || !booking) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Rezervasyon bulunamadı' });
        }

        // Check if user is the driver
        if (booking.ride.driver_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu rezervasyonu onaylama yetkiniz yok' });
        }

        // Update booking status
        const { data: updatedBooking, error: updateError } = await supabase
          .from('ride_bookings')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', input.booking_id)
          .select()
          .single();

        if (updateError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message });
        }

        // Reduce available seats
        const remainingSeats = Math.max(
          0,
          (booking.ride.available_seats ?? 0) - updatedBooking.seats_requested
        );
        await supabase
          .from('ride_offers')
          .update({ available_seats: remainingSeats })
          .eq('id', booking.ride_offer_id);

        // Create notification for passenger
        const { data: approvalNotification } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.passenger_id,
            type: 'RIDE_BOOKING_APPROVED',
            title: 'Rezervasyon Onaylandı',
            message: `Yolculuk rezervasyonunuz onaylandı! ${booking.ride.departure_title} → ${booking.ride.destination_title}`,
            data: {
              ride_offer_id: booking.ride_offer_id,
              booking_id: booking.id,
            },
            push_sent: false,
          })
          .select()
          .single();

        // Send push notification
        if (approvalNotification) {
          try {
            const { data: passengerProfileWithToken } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', booking.passenger_id)
              .single();

            if (passengerProfileWithToken?.push_token) {
              const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
              await fetch(expoPushUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify({
                  to: passengerProfileWithToken.push_token,
                  sound: 'default',
                  title: 'Rezervasyon Onaylandı',
                  body: `Yolculuk rezervasyonunuz onaylandı! ${booking.ride.departure_title} → ${booking.ride.destination_title}`,
                  data: {
                    type: 'RIDE_BOOKING_APPROVED',
                    ride_offer_id: booking.ride_offer_id,
                    booking_id: booking.id,
                  },
                  badge: 1,
                }),
              });

              await supabase
                .from('notifications')
                .update({ push_sent: true })
                .eq('id', approvalNotification.id);
            }
          } catch (pushError) {
            console.error('Push notification error:', pushError);
          }
        }

        // Get or create chat room and send message
        try {
          const roomId = await ensureDirectChatRoom(supabase, user.id, booking.passenger_id);
          await supabase
            .from('messages')
            .insert({
              room_id: roomId,
              user_id: user.id,
              content: `Rezervasyonunuzu onayladım! Yolculuk için hazırız. Detayları konuşalım.`,
            });
        } catch (chatError) {
          console.error('Chat room creation error:', chatError);
        }

        return updatedBooking;
      }),

    rejectBooking: protectedProcedure
      .input(
        z.object({
          booking_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Get booking with ride info
        const { data: booking, error: bookingError } = await supabase
          .from('ride_bookings')
          .select('*, ride:ride_offers(driver_id, departure_title, destination_title)')
          .eq('id', input.booking_id)
          .single();

        if (bookingError || !booking) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Rezervasyon bulunamadı' });
        }

        // Check if user is the driver
        if (booking.ride.driver_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu rezervasyonu reddetme yetkiniz yok' });
        }

        // Update booking status
        const { data: updatedBooking, error: updateError } = await supabase
          .from('ride_bookings')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', input.booking_id)
          .select()
          .single();

        if (updateError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message });
        }

        // Create notification for passenger
        const { data: rejectionNotification } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.passenger_id,
            type: 'RESERVATION',
            title: 'Rezervasyon Reddedildi',
            body: `Yolculuk rezervasyonunuz reddedildi. ${booking.ride.departure_title} → ${booking.ride.destination_title}`,
            data: {
              type: 'RIDE_BOOKING_REJECTED',
              ride_offer_id: booking.ride_offer_id,
              booking_id: booking.id,
            },
            push_sent: false,
          })
          .select()
          .single();

        // Send push notification
        if (rejectionNotification) {
          try {
            const { data: passengerProfile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', booking.passenger_id)
              .single();

            if (passengerProfile?.push_token) {
              const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
              await fetch(expoPushUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify({
                  to: passengerProfile.push_token,
                  sound: 'default',
                  title: 'Rezervasyon Reddedildi',
                  body: `Yolculuk rezervasyonunuz reddedildi.`,
                  data: {
                    type: 'RIDE_BOOKING_REJECTED',
                    ride_offer_id: booking.ride_offer_id,
                    booking_id: booking.id,
                  },
                  badge: 1,
                }),
              });

              await supabase
                .from('notifications')
                .update({ push_sent: true })
                .eq('id', rejectionNotification.id);
            }
          } catch (pushError) {
            console.error('Push notification error:', pushError);
          }
        }

        // Send chat message
        try {
          const roomId = await ensureDirectChatRoom(supabase, user.id, booking.passenger_id);
          await supabase
            .from('messages')
            .insert({
              room_id: roomId,
              user_id: user.id,
              content: `Merhaba, ${booking.ride.departure_title} → ${booking.ride.destination_title} yolculuğu için rezervasyon talebini bu sefer kabul edemiyorum.`,
            });
        } catch (chatError) {
          console.error('Chat message error:', chatError);
        }

        return updatedBooking;
      }),

    // Support Ticket Management
    getSupportTickets: protectedProcedure
      .input(
        z.object({
          status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        let query = supabase
          .from('support_tickets')
          .select(`
            *,
            user:profiles!support_tickets_user_id_fkey(id, full_name, username, avatar_url)
          `, { count: 'exact' })
          .order('created_at', { ascending: false });

        if (input?.status) {
          query = query.eq('status', input.status);
        }

        query = query.range(input?.offset || 0, (input?.offset || 0) + (input?.limit || 50) - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return {
          tickets: data || [],
          total: count || 0,
        };
      }),

    updateSupportTicket: protectedProcedure
      .input(
        z.object({
          ticketId: z.string().uuid(),
          status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
          admin_response: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        const updateData: any = {
          status: input.status,
          updated_at: new Date().toISOString(),
        };

        if (input.admin_response) {
          updateData.admin_response = input.admin_response;
        }

        const { data, error } = await supabase
          .from('support_tickets')
          .update(updateData)
          .eq('id', input.ticketId)
          .select(`
            *,
            user:profiles!support_tickets_user_id_fkey(id, full_name, username, avatar_url)
          `)
          .single();

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return data;
      }),

    // Telefon ve Email Yönetimi
    getUserContacts: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        // Tüm kullanıcıları getir (email/telefon olsun veya olmasın)
        let query = supabase
          .from('profiles')
          .select('id, full_name, email, phone, created_at, updated_at', { count: 'exact' })
          .order('updated_at', { ascending: false });

        if (input.search) {
          query = query.or(`full_name.ilike.%${input.search}%,email.ilike.%${input.search}%,phone.ilike.%${input.search}%`);
        }

        query = query.range(input.offset, input.offset + input.limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return {
          contacts: data || [],
          total: count || 0,
        };
      }),

    sendSMS: protectedProcedure
      .input(
        z.object({
          phone: z.string().min(10).max(20),
          message: z.string().min(1).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        // SMS gönderme işlemi burada yapılacak
        // Şimdilik log olarak kaydediyoruz
        const { error } = await supabase
          .from('admin_messages')
          .insert({
            admin_id: user.id,
            recipient_phone: input.phone,
            recipient_email: null,
            message: input.message,
            message_type: 'sms',
            status: 'sent',
          });

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return { success: true, message: 'SMS gönderildi' };
      }),

    sendEmail: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          subject: z.string().min(1).max(200),
          message: z.string().min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        // Email gönderme işlemi burada yapılacak
        // Şimdilik log olarak kaydediyoruz
        const { error } = await supabase
          .from('admin_messages')
          .insert({
            admin_id: user.id,
            recipient_phone: null,
            recipient_email: input.email,
            message: input.message,
            subject: input.subject,
            message_type: 'email',
            status: 'sent',
          });

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return { success: true, message: 'Email gönderildi' };
      }),

    getRecentProfileChanges: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        const { data, error } = await supabase
          .from('profile_change_logs')
          .select(`
            *,
            user:profiles!profile_change_logs_user_id_fkey(id, full_name, email, phone)
          `)
          .in('field_name', ['email', 'phone'])
          .order('changed_at', { ascending: false })
          .limit(input.limit);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return {
          changes: data || [],
        };
      }),

    // Yolculuk PDF Oluşturma
    generateRidePdf: protectedProcedure
      .input(
        z.object({
          ride_id: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        await ensureAdminAccess(supabase, user.id);

        // Yolculuk detaylarını getir
        const { data: rideData, error: rideError } = await supabase
          .from('ride_offers')
          .select(`
            *,
            driver:profiles(id, full_name, avatar_url, phone, email),
            bookings:ride_bookings(
              *,
              passenger:profiles(id, full_name, phone, email)
            )
          `)
          .eq('id', input.ride_id)
          .single();

        if (rideError || !rideData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Yolculuk bulunamadı',
          });
        }

        // PDF oluşturma için gerekli kütüphaneleri import et
        // Not: Edge Function'da pdf-lib kullanılamaz, bu yüzden basit bir PDF oluşturma yapacağız
        // veya base64 encoded PDF string döndüreceğiz
        
        // Şimdilik basit bir JSON response döndürelim
        // Gerçek PDF oluşturma için client-side'da yapılabilir veya başka bir servis kullanılabilir
        
        // Yolculuk bilgilerini formatla
        const pdfData = {
          rideId: rideData.id,
          driver: rideData.driver?.full_name || 'Bilinmeyen',
          driverPhone: rideData.driver?.phone || '-',
          driverEmail: rideData.driver?.email || '-',
          from: rideData.from_location || '-',
          to: rideData.to_location || '-',
          date: rideData.departure_date || '-',
          time: rideData.departure_time || '-',
          price: rideData.price || 0,
          seats: rideData.available_seats || 0,
          bookings: rideData.bookings || [],
          notes: rideData.notes || '',
        };

        // Supabase Storage'a kaydetmek yerine, client-side'da PDF oluşturulması için
        // veriyi döndürüyoruz
        return {
          pdfBase64: null,
          pdfUrl: null,
          fileName: `yolculuk-${input.ride_id}.pdf`,
          rideData: pdfData,
          message: 'PDF oluşturma için client-side kullanın',
        };
      }),
  }),

  support: createTRPCRouter({
    createTicket: protectedProcedure
      .input(
        z.object({
          subject: z.string().min(1).max(200),
          message: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data, error } = await supabase
          .from('support_tickets')
          .insert({
            user_id: user.id,
            subject: input.subject,
            message: input.message,
            status: 'open',
          })
          .select()
          .single();

        if (error) {
          console.error('Support ticket creation error:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return data;
      }),
  }),
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
      body: event.description || `${event.category} - ${district}`,
      data: { 
        event_id: event.id, 
        severity, 
        category: event.category,
        media_urls: event.media_urls || [], // Medya URL'lerini ekle
      },
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

// ============================================
// Helper Functions for Proximity System
// ============================================

// Mesafe hesaplama (Haversine formülü - kilometre cinsinden)
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Proximity bildirimi oluştur
async function createProximityNotification(
  supabase: any,
  userAId: string,
  userBId: string,
  pairId: string
) {
  try {
    // Kullanıcı bilgilerini al
    const [userAProfile, userBProfile] = await Promise.all([
      supabase.from('profiles').select('full_name, push_token').eq('id', userAId).single(),
      supabase.from('profiles').select('full_name, push_token').eq('id', userBId).single(),
    ]);

    const userAName = userAProfile.data?.full_name || 'Bir kullanıcı';
    const userBName = userBProfile.data?.full_name || 'Bir kullanıcı';

    // Her iki kullanıcı için de bildirim oluştur
    const notifications = [
      {
        user_id: userAId,
        type: 'SYSTEM',
        title: 'Yakınında bir MyTrabzon kullanıcısı var',
        body: `${userBName} yakınında (≈200 m içinde). Bağlanmak istiyor musun?`,
        data: {
          type: 'PROXIMITY',
          pair_id: pairId,
          other_user_id: userBId,
          other_user_name: userBName,
        },
        push_sent: false,
        is_deleted: false,
      },
      {
        user_id: userBId,
        type: 'SYSTEM',
        title: 'Yakınında bir MyTrabzon kullanıcısı var',
        body: `${userAName} yakınında (≈200 m içinde). Bağlanmak istiyor musun?`,
        data: {
          type: 'PROXIMITY',
          pair_id: pairId,
          other_user_id: userAId,
          other_user_name: userAName,
        },
        push_sent: false,
        is_deleted: false,
      },
    ];

    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id, user_id');

    if (insertError) {
      console.error('Create proximity notification insert error:', insertError);
      return;
    }

    // Push bildirimleri gönder
    const pushTokens: { userId: string; token: string }[] = [];
    if (userBProfile.data?.push_token) {
      pushTokens.push({ userId: userAId, token: userBProfile.data.push_token });
    }
    if (userAProfile.data?.push_token) {
      pushTokens.push({ userId: userBId, token: userAProfile.data.push_token });
    }

    if (pushTokens.length > 0 && insertedNotifications) {
      try {
        const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
        const messages = pushTokens.map(({ userId, token }) => {
          const notification = insertedNotifications.find((n: any) => n.user_id === userId);
          const otherUser = userId === userAId ? userBName : userAName;
          return {
            to: token,
            sound: 'default',
            title: 'Yakınında bir MyTrabzon kullanıcısı var',
            body: `${otherUser} yakınında (≈200 m içinde). Bağlanmak istiyor musun?`,
            data: {
              type: 'PROXIMITY',
              pairId: pairId,
            },
            badge: 1,
          };
        });

        const response = await fetch(expoPushUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(messages),
        });

        if (response.ok) {
          // Başarılı gönderimleri işaretle
          const sentNotificationIds = insertedNotifications.map((n: any) => n.id);
          await supabase
            .from('notifications')
            .update({ push_sent: true })
            .in('id', sentNotificationIds);
        }
      } catch (pushError) {
        console.error('Proximity push notification error:', pushError);
      }
    }
  } catch (error) {
    console.error('Create proximity notification error:', error);
  }
}

// Eşleşme bildirimi oluştur
async function createMatchNotification(
  supabase: any,
  userAId: string,
  userBId: string,
  pairId: string
) {
  try {
    // Kullanıcı bilgilerini al
    const [userAProfile, userBProfile] = await Promise.all([
      supabase.from('profiles').select('full_name, push_token').eq('id', userAId).single(),
      supabase.from('profiles').select('full_name, push_token').eq('id', userBId).single(),
    ]);

    const userAName = userAProfile.data?.full_name || 'Bir kullanıcı';
    const userBName = userBProfile.data?.full_name || 'Bir kullanıcı';

    // Her iki kullanıcı için de "eşleştiniz" bildirimi
    const notifications = [
      {
        user_id: userAId,
        type: 'SYSTEM',
        title: 'Yakındaki kullanıcıyla eşleştiniz',
        body: `${userBName} ile eşleştiniz! Artık birbirinizin profilini görebilirsiniz.`,
        data: {
          type: 'PROXIMITY_MATCH',
          pair_id: pairId,
          other_user_id: userBId,
          other_user_name: userBName,
        },
        push_sent: false,
        is_deleted: false,
      },
      {
        user_id: userBId,
        type: 'SYSTEM',
        title: 'Yakındaki kullanıcıyla eşleştiniz',
        body: `${userAName} ile eşleştiniz! Artık birbirinizin profilini görebilirsiniz.`,
        data: {
          type: 'PROXIMITY_MATCH',
          pair_id: pairId,
          other_user_id: userAId,
          other_user_name: userAName,
        },
        push_sent: false,
        is_deleted: false,
      },
    ];

    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id, user_id');

    if (insertError) {
      console.error('Create match notification insert error:', insertError);
      return;
    }

    // Push bildirimleri gönder
    const pushTokens: { userId: string; token: string; otherUserName: string }[] = [];
    if (userBProfile.data?.push_token) {
      pushTokens.push({ userId: userAId, token: userBProfile.data.push_token, otherUserName: userBName });
    }
    if (userAProfile.data?.push_token) {
      pushTokens.push({ userId: userBId, token: userAProfile.data.push_token, otherUserName: userAName });
    }

    if (pushTokens.length > 0 && insertedNotifications) {
      try {
        const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
        const messages = pushTokens.map(({ userId, token, otherUserName }) => ({
          to: token,
          sound: 'default',
          title: 'Yakındaki kullanıcıyla eşleştiniz',
          body: `${otherUserName} ile eşleştiniz!`,
          data: {
            type: 'PROXIMITY_MATCH',
            pairId: pairId,
          },
          badge: 1,
        }));

        const response = await fetch(expoPushUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(messages),
        });

        if (response.ok) {
          // Başarılı gönderimleri işaretle
          const sentNotificationIds = insertedNotifications.map((n: any) => n.id);
          await supabase
            .from('notifications')
            .update({ push_sent: true })
            .in('id', sentNotificationIds);
        }
      } catch (pushError) {
        console.error('Proximity match push notification error:', pushError);
      }
    }
  } catch (error) {
    console.error('Create match notification error:', error);
  }
}

export type AppRouter = typeof appRouter;

// Serve tRPC requests
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  
  const url = new URL(req.url);
  let pathname = url.pathname;
  
  if (pathname.startsWith("/functions/v1/trpc")) {
    pathname = pathname.replace("/functions/v1/trpc", "");
  } else if (pathname.startsWith("/trpc")) {
    pathname = pathname.replace("/trpc", "");
  }
  
  if (!pathname.startsWith("/api/trpc")) {
    if (pathname.startsWith("/")) {
      pathname = "/api/trpc" + pathname;
    } else {
      pathname = "/api/trpc/" + pathname;
    }
  }
  
  const normalizedUrl = new URL(pathname + url.search, url.origin);
  const normalizedReq = new Request(normalizedUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  
  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      router: appRouter,
      req: normalizedReq,
      createContext: async () => await createContext(normalizedReq),
      onError: ({ error, path, type }) => {
        // Detaylı error logging
        console.error(`❌ tRPC error on '${path}' (${type}):`, {
          code: error.code,
          message: error.message,
          cause: error.cause,
        });
      },
    });
    
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    return response;
  } catch (error) {
    console.error("❌ Fatal error in Edge Function:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
});

const UPCOMING_BUFFER_MINUTES = 5;
const CLEANUP_OFFSET_MINUTES = 10;
const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';

async function ensureDirectChatRoom(supabase: any, userA: string, userB: string) {
  const { data: roomsOfA } = await supabase
    .from('chat_members')
    .select('room_id')
    .eq('user_id', userA);

  const roomIds = (roomsOfA ?? []).map((row: any) => row.room_id).filter(Boolean);

  if (roomIds.length > 0) {
    const { data: sharedRooms } = await supabase
      .from('chat_members')
      .select('room_id')
      .in('room_id', roomIds)
      .eq('user_id', userB)
      .limit(1);

    if (sharedRooms && sharedRooms.length > 0) {
      return sharedRooms[0].room_id as string;
    }
  }

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      type: 'direct',
      name: null,
      district: null,
      created_by: userA,
    })
    .select('id')
    .single();

  if (roomError || !room) {
    console.error('Chat room creation failed:', roomError);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sohbet odası oluşturulamadı' });
  }

  const memberInserts = [
    { room_id: room.id, user_id: userA, role: 'admin' },
    { room_id: room.id, user_id: userB, role: 'member' },
  ];

  const { error: membersError } = await supabase.from('chat_members').insert(memberInserts);
  if (membersError) {
    console.error('Chat members insertion failed:', membersError);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sohbet katılımcıları eklenemedi' });
  }

  return room.id as string;
}

async function cleanupExpiredRides(supabase: any) {
  try {
    const threshold = new Date(Date.now() - CLEANUP_OFFSET_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from('ride_offers')
      .update({ status: 'expired' })
      .lt('departure_time', threshold)
      .eq('status', 'active');
  } catch (error) {
    console.error('cleanupExpiredRides error:', error);
  }
}

const maskPlate = (plate?: string | null) => {
  if (!plate) return plate;
  const trimmed = plate.trim();
  if (trimmed.length <= 2) {
    return '*'.repeat(trimmed.length);
  }
  const visibleLength = Math.max(2, trimmed.length - 3);
  const visible = trimmed.slice(0, visibleLength);
  const hidden = '*'.repeat(trimmed.length - visibleLength);
  return `${visible}${hidden}`;
};

const sanitizeRideForClient = (ride: any) => {
  if (!ride) return ride;
  const { driver_phone, ...rest } = ride;
  return {
    ...rest,
    vehicle_plate: maskPlate(ride.vehicle_plate),
  };
};

const sanitizeBookingForClient = (booking: any) => {
  if (!booking) return booking;
  const { passenger_phone, ...rest } = booking;
  return rest;
};

const ensureAdminAccess = async (supabase: any, userId: string) => {
  if (userId === SPECIAL_ADMIN_ID) {
    return { id: SPECIAL_ADMIN_ID, role: 'super_admin' };
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized: Admin access required' });
  }

  return data;
};

const sanitizeReview = (review: any) => ({
  id: review.id,
  ride_offer_id: review.ride_offer_id,
  rating: review.rating,
  comment: review.comment,
  created_at: review.created_at,
  passenger_id: review.passenger_id,
  passenger: review.passenger
    ? {
        id: review.passenger.id,
        full_name: review.passenger.full_name,
        avatar_url: review.passenger.avatar_url,
      }
    : null,
  ride: review.ride
    ? {
        id: review.ride.id,
        departure_title: review.ride.departure_title,
        destination_title: review.ride.destination_title,
        departure_time: review.ride.departure_time,
      }
    : null,
});

