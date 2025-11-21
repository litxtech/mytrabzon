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
    const { email, code, password, isRegister } = await c.req.json();

    if (!email || !code) {
      return c.json({ error: "Email and code required" }, 400);
    }

    const supabase = admin();

    // OTP kodunu kontrol et
    const { data: otpData, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("OTP lookup error", otpError);
      return c.json({ error: "Server error" }, 500);
    }

    if (!otpData) {
      return c.json({ error: "invalid_code", message: "Geçersiz doğrulama kodu" }, 400);
    }

    // Kodun süresi dolmuş mu kontrol et
    const now = new Date();
    const expiresAt = new Date(otpData.expires_at);
    if (now > expiresAt) {
      return c.json({ error: "expired_code", message: "Doğrulama kodunun süresi dolmuş" }, 400);
    }

    // Kod kullanıldı mı kontrol et
    if (otpData.used_at) {
      return c.json({ error: "used_code", message: "Bu kod daha önce kullanılmış" }, 400);
    }

    // Kayıt modunda kullanıcı oluştur
    if (isRegister) {
      if (!password) {
        return c.json({ error: "Password required for registration" }, 400);
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        console.error("Auth create user error", authError);
        return c.json({ error: authError.message }, 400);
      }

      await supabase
        .from("otp_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", otpData.id);

      return c.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      });
    } else {
      // Giriş modunda - kullanıcıyı bul
      const { data: authData, error: authError } = await supabase.auth.admin.getUserByEmail(email);

      if (authError || !authData.user) {
        return c.json({ error: "user_not_found", message: "Kullanıcı bulunamadı" }, 404);
      }

      await supabase
        .from("otp_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", otpData.id);

      return c.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      });
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return c.json({ 
      error: "Server error", 
      message: e?.message ?? "Bir hata oluştu" 
    }, 500);
  }
});

export default app;
