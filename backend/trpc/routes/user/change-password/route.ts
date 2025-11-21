import { protectedProcedure } from "../../../create-context";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

export const changePasswordProcedure = protectedProcedure
  .input(
    z.object({
      currentPassword: z.string().min(1, "Mevcut şifre gereklidir"),
      newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { user } = ctx;
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Mevcut şifreyi doğrula
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email || '',
      password: input.currentPassword,
    });

    if (verifyError) {
      throw new Error("Mevcut şifre hatalı");
    }

    // Şifreyi güncelle
    const { error: updateError } = await supabase.auth.updateUser({
      password: input.newPassword,
    });

    if (updateError) {
      throw new Error(updateError.message || "Şifre güncellenemedi");
    }

    return {
      success: true,
      message: "Şifre başarıyla değiştirildi",
    };
  });

