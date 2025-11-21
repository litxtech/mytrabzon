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
    let requestBody: any;
    try {
      requestBody = await c.req.json();
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError);
      return c.json({ error: "Invalid JSON format" }, 400);
    }

    const { email } = requestBody || {};

    // Güvenli email validation
    if (!email || typeof email !== 'string') {
      return c.json({ error: "Email required" }, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    if (trimmedEmail.length === 0) {
      return c.json({ error: "Email cannot be empty" }, 400);
    }

    // Email uzunluk kontrolü (RFC 5321: 254 karakter max)
    if (trimmedEmail.length > 254) {
      return c.json({ error: "Email address too long" }, 400);
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    const supabase = admin();

    // ------------ RATE LIMIT: SON 10 DAKİKADA EN FAZLA 5 KOD ------------
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from("otp_codes")
      .select("id", { head: true, count: "exact" })
      .eq("email", trimmedEmail)
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
      email: trimmedEmail,
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
        // HTML içeriğini güvenli hale getir (XSS koruması)
        const safeCode = String(code).replace(/[<>]/g, '');
        const safeEmail = trimmedEmail.replace(/[<>]/g, '');
        
        const emailPayload = {
          from: "MyTrabzon <noreply@mytrabzon.com>",
          to: safeEmail,
          subject: "MyTrabzon Doğrulama Kodu",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">MyTrabzon Doğrulama Kodu</h2>
              <p>Merhaba,</p>
              <p>Hesabınızı doğrulamak için aşağıdaki 6 haneli kodu kullanabilirsiniz:</p>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${safeCode}</h1>
              </div>
              <p style="color: #666; font-size: 14px;">Bu kod 5 dakika geçerlidir.</p>
              <p style="color: #666; font-size: 14px;">Eğer bu işlemi siz yapmadıysanız, bu email'i görmezden gelebilirsiniz.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">MyTrabzon Ekibi</p>
            </div>
          `,
        };

        // Timeout ile email gönderme (30 saniye)
        const emailPromise = fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Email request timeout")), 30000)
        );

        const emailResponse = await Promise.race([emailPromise, timeoutPromise]) as Response;

        if (!emailResponse.ok) {
          let errorData: any = {};
          try {
            errorData = await emailResponse.json();
          } catch {
            // JSON parse hatası - devam et
          }
          console.error("Resend API error:", errorData);
          console.log(`📧 OTP Code for ${safeEmail}: ${safeCode} (Email gönderilemedi, log'a yazıldı)`);
        } else {
          console.log(`✅ Email sent to ${safeEmail}`);
        }
      } catch (emailError: any) {
        console.error("Email sending error:", emailError?.message || emailError);
        console.log(`📧 OTP Code for ${trimmedEmail}: ${code} (Email gönderilemedi, log'a yazıldı)`);
        // Email gönderme hatası kritik değil, devam et
      }
    } else {
      console.log(`📧 OTP Code for ${trimmedEmail}: ${code} (RESEND_API_KEY bulunamadı, log'a yazıldı)`);
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
