import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";
import { TRPCError } from "@trpc/server";

export const cancelAccountDeletionProcedure = publicProcedure.mutation(async ({ ctx }) => {
  try {
    const authHeader = ctx.req.headers.get("authorization");
    if (!authHeader) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid authentication",
      });
    }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        deletion_requested_at: null,
        deletion_scheduled_at: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error canceling account deletion:", updateError);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel account deletion",
      });
    }

    return {
      success: true,
      message: "Account deletion cancelled successfully",
    };
  } catch (error) {
    console.error("Cancel account deletion error:", error);
    throw error;
  }
});
