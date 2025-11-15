// Stripe Webhook Handler - Bağış Sistemi
// Web sitesinden gelen bağış bildirimlerini işler ve destekçi etiketi verir
// Deno runtime compatible

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Bağış miktarına göre etiket rengi belirle
function getBadgeColor(amount: number): string | null {
  if (amount >= 3000) return "red";
  if (amount >= 339) return "blue";
  if (amount >= 139) return "green";
  if (amount >= 89) return "yellow";
  return null;
}

// Bağış miktarına göre etiket emoji belirle
function getBadgeEmoji(amount: number): string {
  if (amount >= 3000) return "❤️";
  if (amount >= 339) return "💙";
  if (amount >= 139) return "💚";
  if (amount >= 89) return "🌟";
  return "🌟";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase client oluştur
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Webhook secret (güvenlik için)
    const webhookSecret = Deno.env.get("DONATION_WEBHOOK_SECRET");
    
    // Request body'yi al
    const body = await req.json();
    
    // Webhook secret kontrolü (güvenlik)
    if (webhookSecret && body.secret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Bağış bilgileri
    const {
      user_id,
      user_email,
      amount,
      payment_id,
      status,
      timestamp,
    } = body;

    if (!user_id || !amount || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sadece tamamlanan bağışları işle
    if (status !== "completed" && status !== "succeeded") {
      return new Response(
        JSON.stringify({ message: "Payment not completed, skipping" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Amount TL cinsinden geliyor, kuruş cinsine çevir
    const amountCents = Math.round(amount * 100);
    
    // Etiket rengini belirle (TL cinsinden)
    const badgeColor = getBadgeColor(amount);
    if (!badgeColor) {
      return new Response(
        JSON.stringify({ message: "Amount too low for badge" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Kullanıcının profilini bul (email veya user_id ile)
    let profileId: string | null = null;

    if (user_id) {
      // user_id UUID formatında mı kontrol et
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user_id)) {
        // Direkt profil ID olarak kullan
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user_id)
          .maybeSingle();
        
        if (profile) {
          profileId = profile.id;
        }
      } else {
        // Email veya başka bir identifier olabilir
        // Önce email ile dene
        if (user_email) {
          const { data: authUser } = await supabase.auth.admin.listUsers().then(users => {
            return users.data?.find(u => u.email === user_email || u.id === user_id);
          }).catch(() => null);
          
          if (authUser?.id) {
            profileId = authUser.id;
          }
        }
      }
    }

    if (!profileId && user_email) {
      // Email ile auth user'ı bul
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const authUser = users?.find(u => u.email === user_email);
        
        if (authUser?.id) {
          profileId = authUser.id;
        }
      } catch (error) {
        console.error("Auth user lookup error:", error);
      }
      
      // Eğer hala bulunamadıysa, email ile direkt profil tablosunda ara
      if (!profileId) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", user_email)
          .limit(1);

        if (profiles && profiles.length > 0) {
          profileId = profiles[0].id;
        }
      }
    }

    if (!profileId) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Bağış kaydını oluştur veya güncelle
    const { data: existingDonation } = await supabase
      .from("supporter_donations")
      .select("id")
      .eq("stripe_payment_intent_id", payment_id || `webhook_${Date.now()}`)
      .maybeSingle();

    const donationData = {
      user_id: profileId,
      amount: amountCents, // Kuruş cinsinden
      stripe_payment_intent_id: payment_id || `webhook_${Date.now()}`,
      status: "completed",
      badge_color: badgeColor,
      created_at: timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingDonation) {
      // Mevcut kaydı güncelle
      await supabase
        .from("supporter_donations")
        .update(donationData)
        .eq("id", existingDonation.id);
    } else {
      // Yeni kayıt oluştur
      await supabase.from("supporter_donations").insert(donationData);
    }

    // Profil'e destekçi etiketi ekle
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        supporter_badge: true,
        supporter_badge_color: badgeColor,
        supporter_badge_visible: true,
        supporter_badge_expires_at: null, // Kalıcı etiket
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile", details: profileError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Donation processed and badge assigned",
        user_id: profileId,
        badge_color: badgeColor,
        badge_emoji: getBadgeEmoji(amount),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

