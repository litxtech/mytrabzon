import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { ensureAdmin } from "./utils";

export const deleteUsersProcedure = protectedProcedure
  .input(
    z.object({
      userIds: z.array(z.string().uuid()).min(1).max(50),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    if (!user) throw new Error("Unauthorized");
    await ensureAdmin(supabase, user.id);

    const uniqueIds = Array.from(new Set(input.userIds));

    for (const userId of uniqueIds) {
      const { error: matchesError } = await supabase
        .from("matches")
        .delete()
        .eq("organizer_id", userId);

      if (matchesError) {
        // Log error but don't expose internal details
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to delete matches for user", userId, matchesError);
        }
        throw new Error(matchesError.message);
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteError) {
        // Log error but don't expose internal details
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to delete auth user", userId, deleteError);
        }
        throw new Error(deleteError.message ?? "Kullanıcı silinemedi");
      }
    }

    return { success: true, deleted: uniqueIds.length };
  });

