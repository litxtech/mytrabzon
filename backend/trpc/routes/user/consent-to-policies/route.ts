import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const consentToPoliciesProcedure = publicProcedure
  .input(
    z.object({
      policyIds: z.array(z.string().uuid()),
      userId: z.string().uuid().optional(), // Opsiyonel: eğer authenticated değilse user_id gönderilebilir
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    // User ID'yi belirle: önce context'ten, sonra input'tan
    const userId = user?.id || input.userId;
    
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Giriş yapmanız gerekiyor",
      });
    }

    // Politikaları al
    const { data: policies, error: policiesError } = await supabase
      .from("policies")
      .select("id, policy_type")
      .in("id", input.policyIds);

    if (policiesError || !policies || policies.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Geçersiz politika ID'leri",
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
      .from("user_policy_consents")
      .upsert(consents, {
        onConflict: "user_id,policy_id,policy_version",
      });

    if (insertError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: insertError.message,
      });
    }

    return { success: true, consentedCount: consents.length };
  });

