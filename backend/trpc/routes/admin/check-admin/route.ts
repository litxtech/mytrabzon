import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

export const checkAdminProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const { supabase, user } = ctx;
    
    if (!user) {
      throw new Error("Unauthorized");
    }
    
    // Özel admin bypass
    const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
    if (user.id === SPECIAL_ADMIN_ID) {
      return {
        isAdmin: true,
        role: 'super_admin',
        permissions: {},
      };
    }
    
    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    
    if (error || !adminUser) {
      return { isAdmin: false, role: null };
    }
    
    return {
      isAdmin: true,
      role: adminUser.role,
      permissions: adminUser.permissions || {},
    };
  });

