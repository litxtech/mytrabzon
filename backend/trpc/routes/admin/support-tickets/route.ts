import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

async function checkAdmin(supabase: any, userId: string) {
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role, id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();
  
  if (!adminUser) {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return adminUser;
}

export const getSupportTicketsProcedure = protectedProcedure
  .input(
    z.object({
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    let query = supabase
      .from("support_tickets")
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(id, full_name, email, avatar_url),
        assigned_admin:admin_users!support_tickets_assigned_to_fkey(id, email)
      `, { count: "exact" })
      .order("created_at", { ascending: false });
    
    if (input.status) {
      query = query.eq("status", input.status);
    }
    
    query = query.range(input.offset, input.offset + input.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw new Error(error.message);
    
    return {
      tickets: data || [],
      total: count || 0,
    };
  });

export const updateSupportTicketProcedure = protectedProcedure
  .input(
    z.object({
      ticketId: z.string().uuid(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      adminResponse: z.string().optional(),
      assignedTo: z.string().uuid().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    const updateData: any = {};
    
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }
    }
    
    if (input.adminResponse !== undefined) updateData.admin_response = input.adminResponse;
    if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
    
    const { data, error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", input.ticketId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "update_support_ticket",
      target_type: "support_ticket",
      target_id: input.ticketId,
      description: `Support ticket ${input.status || "updated"}`,
    });
    
    return data;
  });

