// LazGPT Bildirim Sistemi
// Periyodik olarak fıkra anlatma teklifi gönderir
// Deno runtime compatible

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Son 24 saatte bildirim almayan aktif kullanıcıları bul
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, push_token, full_name")
      .not("push_token", "is", null)
      .limit(100);

    if (usersError) {
      throw usersError;
    }

    // Her kullanıcı için bildirim kontrolü
    const notifications = [];
    for (const user of users || []) {
      // Son 24 saatte bildirim var mı kontrol et
      const { data: recentNotification } = await supabase
        .from("lazgpt_notifications")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", yesterday.toISOString())
        .limit(1)
        .maybeSingle();

      // Eğer son 24 saatte bildirim yoksa, yeni bildirim oluştur
      if (!recentNotification) {
        const notificationData = {
          user_id: user.id,
          notification_type: "joke_suggestion",
          title: "LazGPT",
          message: "Uşağum, bi fıkra anlatayım mı? Gülersin belki 😄",
        };

        const { data: notification, error: notifError } = await supabase
          .from("lazgpt_notifications")
          .insert(notificationData)
          .select()
          .single();

        if (!notifError && notification && user.push_token) {
          notifications.push({
            userId: user.id,
            pushToken: user.push_token,
            notification: notification,
          });
        }
      }
    }

    // Push notification gönder (Expo Push Notification API kullanılabilir)
    // Şimdilik sadece database'e kaydediyoruz
    // Push notification göndermek için Expo Push API veya Supabase Realtime kullanılabilir

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        message: `${notifications.length} bildirim oluşturuldu`,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("LazGPT notification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

