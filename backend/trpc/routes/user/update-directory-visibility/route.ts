import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const updateDirectoryVisibilityProcedure = protectedProcedure
  .input(
    z.object({
      show_in_directory: z.boolean(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    const { show_in_directory } = input;

    console.log('Updating directory visibility:', { userId: user.id, show_in_directory });

    const { error } = await supabase
      .from('user_profiles')
      .update({ show_in_directory })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating directory visibility:', error);
      throw new Error('Görünürlük ayarı güncellenirken bir hata oluştu');
    }

    console.log('Directory visibility updated successfully');

    return { success: true };
  });
