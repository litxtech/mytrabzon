import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";
import { TRPCError } from "@trpc/server";

export const requestAccountDeletionProcedure = publicProcedure.mutation(async ({ ctx }) => {
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

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7);

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        deletion_requested_at: new Date().toISOString(),
        deletion_scheduled_at: deletionDate.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error requesting account deletion:", updateError);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to request account deletion",
      });
    }

    return {
      success: true,
      message: "Account deletion requested successfully",
      deletionDate: deletionDate.toISOString(),
    };
  } catch (error) {
    console.error("Request account deletion error:", error);
    throw error;
  }
});
