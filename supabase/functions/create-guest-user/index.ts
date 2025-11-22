// deno-lint-ignore-file no-explicit-any
import { Hono } from "https://esm.sh/hono@4.4.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

function admin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables");
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
}

app.post("/", async (c) => {
  try {
    const supabase = admin();

    // Geçici email oluştur
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const tempEmail = `guest_${timestamp}_${randomId}@mytrabzon.guest`;
    
    // Geçici password oluştur
    const tempPassword = `Guest_${timestamp}_${randomId}_${Math.random().toString(36).substring(2, 15)}`;

    // Admin API ile kullanıcı oluştur (email confirmation bypass)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: tempEmail,
      password: tempPassword,
      email_confirm: true, // Email confirmation'ı bypass et
      user_metadata: {
        is_guest: true,
        guest_timestamp: timestamp,
      }
    });

    if (authError) {
      console.error("Guest user creation error", authError);
      return c.json({ error: authError.message }, 400);
    }

    if (!authData.user) {
      return c.json({ error: "User creation failed" }, 500);
    }

    // Session oluştur
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: authData.user.id,
    });

    if (sessionError) {
      console.error("Session creation error", sessionError);
      return c.json({ error: sessionError.message }, 500);
    }

    return c.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      credentials: {
        email: tempEmail,
        password: tempPassword, // Misafir hesabı için geçici password - AsyncStorage'a kaydedilecek
      },
      session: {
        access_token: sessionData.session?.access_token,
        refresh_token: sessionData.session?.refresh_token,
      },
    });
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return c.json({ 
      error: "Server error", 
      message: e?.message ?? "Bir hata oluştu" 
    }, 500);
  }
});

export default app;

