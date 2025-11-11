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
      phone: z.string().optional(),
      address: z.string().optional(),
      height: z.number().optional(),
      weight: z.number().optional(),
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
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const updateData: Record<string, unknown> = {};

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
    if (input.social_media !== undefined)
      updateData.social_media = input.social_media;
    if (input.privacy_settings !== undefined)
      updateData.privacy_settings = input.privacy_settings;

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Profil güncelleme hatası:", error);
      throw new Error(error.message);
    }

    return data;
  });
