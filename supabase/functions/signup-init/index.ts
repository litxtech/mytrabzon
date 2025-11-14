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
    const { uid, email } = await c.req.json();

    if (!uid || typeof uid !== "string") {
      return c.json({ ok: false, error: "uid_required" }, 400);
    }

    console.log("Signup init for user:", uid, email);

    const sb = admin();

    // Önce profil var mı kontrol et
    const { data: existingProfile } = await sb
      .from("profiles")
      .select("id, public_id")
      .eq("id", uid)
      .maybeSingle();

    if (existingProfile?.public_id) {
      console.log("User already has public_id:", existingProfile.public_id);
      return c.json({ ok: true, public_id: existingProfile.public_id });
    }

    // Profil yoksa oluştur
    if (!existingProfile) {
      console.log("Creating profile for user:", uid);
      const { error: profileError } = await sb
        .from("profiles")
        .insert({
          id: uid,
          email: email ?? "",
          full_name: "Kullanıcı",
          district: "Ortahisar",
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        return c.json({ ok: false, error: profileError.message }, 500);
      }
    }

    // Public ID ata
    const { data, error } = await sb.rpc("assign_public_id", {
      p_user_id: uid,
      p_email: email ?? null,
    });

    if (error) {
      console.error("Error assigning public_id:", error);
      return c.json({ ok: false, error: error.message }, 500);
    }

    console.log("Public ID assigned:", data);
    return c.json({ ok: true, public_id: data });
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return c.json({ ok: false, error: e?.message ?? "unexpected" }, 500);
  }
});

export default app;
