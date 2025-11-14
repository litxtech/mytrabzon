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
          .select('id, full_name, avatar_url, bio, city, district, created_at, verified, gender, public_id', { count: 'exact' })
          .eq('show_in_directory', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

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
          throw new Error(`Kullanıcılar yüklenirken bir hata oluştu: ${error.message}`);
        }

        // Response'u serialize edilebilir hale getir
        const serializedUsers = (data || []).map((user: any) => ({
          ...user,
          created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
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
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { supabase, user } = ctx;
        if (!user) throw new Error("Unauthorized");

        const { data, error } = await supabase.rpc('get_personalized_feed', {
          p_user_id: user.id,
          p_limit: input.limit,
          p_offset: input.offset,
        });

        if (error) {
          console.error("Error fetching personalized feed:", error);
          throw new Error(error.message);
        }

        return data || [];
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

        const { data: reel, error: reelError } = await supabase
          .from('posts')
          .select('id, is_deleted')
          .eq('id', input.reel_id)
          .eq('type', 'reel')
          .single();

        if (reelError || !reel || reel.is_deleted) {
          throw new Error("Paylaşılacak reel bulunamadı veya silinmiş.");
        }

        const { data, error } = await supabase
          .from('reel_shares')
          .insert({ reel_id: input.reel_id, user_id: user.id, platform: input.platform })
          .select()
          .single();

        if (error) throw new Error(error.message);
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

