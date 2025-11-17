import { SupabaseClient } from "@supabase/supabase-js";

export async function ensureAdmin(supabase: SupabaseClient, userId: string) {
  const SPECIAL_ADMIN_ID = "98542f02-11f8-4ccd-b38d-4dd42066daa7";
  if (userId === SPECIAL_ADMIN_ID) {
    return { role: "super_admin" };
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (!adminUser) {
    throw new Error("Unauthorized: Admin access required");
  }

  return adminUser;
}

