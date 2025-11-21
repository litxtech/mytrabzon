import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const getRequiredPoliciesProcedure = publicProcedure.query(async ({ ctx }) => {
  const { supabase } = ctx;

  const requiredPolicyTypes = [
    "terms",
    "privacy",
    "community",
    "cookie",
    "child_safety",
    "payment",
    "moderation",
    "data_storage",
    "eula",
    "university",
    "event",
  ];

  const { data, error } = await supabase
    .from("policies")
    .select("id, title, content, policy_type, display_order, updated_at")
    .eq("is_active", true)
    .in("policy_type", requiredPolicyTypes)
    .order("display_order", { ascending: true });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  return { policies: data || [] };
});

