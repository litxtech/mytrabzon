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
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email required" }, 400);
    }

    const supabase = admin();

    // ------------ RATE LIMIT: SON 10 DAKİKADA EN FAZLA 5 KOD ------------
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from("otp_codes")
      .select("id", { head: true, count: "exact" })
      .eq("email", email)
      .gte("created_at", tenMinutesAgo);

    if (countError) {
      console.error("OTP count error", countError);
      return c.json({ error: "Server error", message: countError.message }, 500);
    }

    if ((count ?? 0) >= 5) {
      return c.json({
        error: "otp_limit",
        message: "Çok fazla doğrulama kodu istedin. Lütfen 10 dakika sonra tekrar dene.",
      }, 429);
    }

    // 6 haneli kod üret
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("OTP insert error", insertError);
      return c.json({ error: "Server error", message: insertError.message }, 500);
    }

    // Email gönder - Resend API kullanarak
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MyTrabzon <noreply@mytrabzon.com>",
            to: email,
            subject: "MyTrabzon Doğrulama Kodu",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">MyTrabzon Doğrulama Kodu</h2>
                <p>Merhaba,</p>
                <p>Hesabınızı doğrulamak için aşağıdaki 6 haneli kodu kullanabilirsiniz:</p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                  <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
                </div>
                <p style="color: #666; font-size: 14px;">Bu kod 5 dakika geçerlidir.</p>
                <p style="color: #666; font-size: 14px;">Eğer bu işlemi siz yapmadıysanız, bu email'i görmezden gelebilirsiniz.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">MyTrabzon Ekibi</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error("Resend API error:", errorData);
          console.log(`📧 OTP Code for ${email}: ${code} (Email gönderilemedi, log'a yazıldı)`);
        } else {
          console.log(`✅ Email sent to ${email}`);
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        console.log(`📧 OTP Code for ${email}: ${code} (Email gönderilemedi, log'a yazıldı)`);
      }
    } else {
      console.log(`📧 OTP Code for ${email}: ${code} (RESEND_API_KEY bulunamadı, log'a yazıldı)`);
    }

    return c.json({ success: true });
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return c.json({ 
      error: "Server error", 
      message: e?.message ?? "Bir hata oluştu" 
    }, 500);
  }
});

export default app;
