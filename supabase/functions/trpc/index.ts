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
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(50).default(20),
          search: z.string().optional(),
          gender: z.enum(['male', 'female', 'other', 'all']).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase } = ctx;
        const { page, limit, search, gender } = input;
        const offset = (page - 1) * limit;

        let query = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, city, district, created_at, verified, gender, public_id, privacy_settings', { count: 'exact' })
          .eq('show_in_directory', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Gizlilik ayarlarına göre filtreleme: profileVisible false olanları gösterme
        // Ancak privacy_settings null ise göster (geriye dönük uyumluluk için)
        query = query.or('privacy_settings->>profileVisible.is.null,privacy_settings->>profileVisible.eq.true');

        if (search && search.trim()) {
          const searchTerm = `%${search.trim()}%`;
          query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
        }

        if (gender && gender !== 'all') {
          query = query.eq('gender', gender);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching users:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Kullanıcılar yüklenirken bir hata oluştu: ${error.message}`,
          });
        }

        // Response'u serialize edilebilir hale getir ve gizlilik ayarlarını filtrele
        const serializedUsers = (data || [])
          .filter((user: any) => {
            // Gizlilik ayarları kontrolü
            if (user.privacy_settings && typeof user.privacy_settings === 'object') {
              const profileVisible = user.privacy_settings.profileVisible;
              // Eğer profileVisible false ise, kullanıcıyı gösterme
              if (profileVisible === false) {
                return false;
              }
            }
            return true;
          })
          .map((user: any) => ({
            ...user,
            created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
            // privacy_settings'i response'dan kaldır (güvenlik için)
            privacy_settings: undefined,
          }));

        return {
          users: serializedUsers,
          total: count || 0,
          page,
          limit,
          hasMore: count ? offset + limit < count : false,
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
            author:profiles!posts_author_id_fkey(*)
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
        } else if (input.sort === "hot" || input.sort === "trending") {
          query = query.order("like_count", { ascending: false });
          query = query.order("created_at", { ascending: false });
        }

        query = query.range(input.offset, input.offset + input.limit - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error("Error fetching posts:", error);
          throw new Error(error.message);
        }

        let postsWithLikes = data || [];
        
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
            author:profiles!posts_author_id_fkey(*)
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
            user:profiles!comments_user_id_fkey(*)
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
        followingIds.push(user.id); // Kendi gönderilerini de ekle

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

        // Takip edilen kullanıcıların gönderileri + kendi gönderileri
        if (followingIds.length > 0) {
          query = query.in("author_id", followingIds);
        } else {
          // Takip edilen yoksa sadece kendi gönderilerini göster
          query = query.eq("author_id", user.id);
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
          duration_seconds: z.number().int().positive().max(60),
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
              type: z.enum(["id_front", "id_back", "selfie", "selfie_with_id"]),
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
        
        const today = new Date();
        const dateStr = today
          .toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\./g, "-");
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const verificationCode = `MYTRABZON - ${dateStr} - KOD: ${randomCode}`;
        
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
            verification_code: verificationCode,
            code_generated_at: new Date().toISOString(),
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
        
        return {
          success: true,
          kycId: kycRequest.id,
          verificationCode,
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
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey(id, name, logo_url, jersey_color),
            team2:teams!matches_team2_id_fkey(id, name, logo_url, jersey_color),
            field:football_fields(id, name, district, address),
            organizer:profiles!matches_organizer_id_fkey(id, full_name, avatar_url)
          `, { count: 'exact' })
          .eq('match_date', today)
          .in('status', ['scheduled', 'looking_for_opponent', 'looking_for_players'])
          .order('start_time', { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.city) {
          query = query.eq('city', input.city);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return {
          matches: data || [],
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

        return {
          posts: data || [],
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
          .select('id, is_filled, match_id')
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
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

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
          team1_id: z.string().uuid(),
          team2_id: z.string().uuid().optional(),
          field_id: z.string().uuid(),
          match_date: z.string(),
          start_time: z.string(),
          end_time: z.string().optional(),
          city: z.enum(['Trabzon', 'Giresun']),
          district: z.string().optional(),
          match_type: z.enum(['friendly', 'league', 'tournament', 'university']).default('friendly'),
          status: z.enum(['scheduled', 'looking_for_opponent', 'looking_for_players']).default('scheduled'),
          missing_players_count: z.number().default(0),
          missing_positions: z.array(z.enum(['goalkeeper', 'defender', 'midfielder', 'forward'])).optional(),
          is_public: z.boolean().default(true),
          max_players: z.number().default(10),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const { data, error } = await supabase
          .from('matches')
          .insert({
            team1_id: input.team1_id,
            team2_id: input.team2_id,
            field_id: input.field_id,
            match_date: input.match_date,
            start_time: input.start_time,
            end_time: input.end_time,
            city: input.city,
            district: input.district,
            match_type: input.match_type,
            status: input.status,
            organizer_id: user.id,
            missing_players_count: input.missing_players_count,
            missing_positions: input.missing_positions,
            is_public: input.is_public,
            max_players: input.max_players,
            notes: input.notes,
          })
          .select()
          .single();

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return data;
      }),

    // 8. Takım detayı
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

        // Sahanın o saatte müsait olup olmadığını kontrol et
        const { data: existing } = await supabase
          .from('field_reservations')
          .select('id')
          .eq('field_id', input.field_id)
          .eq('reservation_date', input.reservation_date)
          .eq('start_time', input.start_time)
          .eq('is_available', true)
          .single();

        if (!existing) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bu saat müsait değil' });
        }

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

        return data;
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
});

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
  
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req: normalizedReq,
    createContext: () => createContext(normalizedReq),
    onError: ({ error, path, type }) => {
      console.error(`tRPC error on '${path}':`, {
        code: error.code,
        message: error.message,
        type,
      });
    },
  });
  
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  return response;
});

