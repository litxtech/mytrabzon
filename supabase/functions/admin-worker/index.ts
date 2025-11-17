// Supabase Edge Function for Admin Operations
// Admin Worker - Separate from main tRPC router
// Deno runtime compatible

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, publicProcedure, protectedProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";

// Admin helper function
async function checkAdminHelper(supabase: any, userId: string) {
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

// Admin Router
const adminRouter = createTRPCRouter({
  checkAdmin: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx;

    if (!user) throw new Error("Unauthorized");

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
  }),

  getUsers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        filter: z.enum(['all', 'today', 'banned', 'blueTick', 'hidden']).optional().default('all'),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      await checkAdminHelper(supabase, user.id);

      let query = supabase
        .from("profiles")
        .select(
          `*,
          blue_ticks!left(id, verified_at, verification_type),
          user_bans!left(id, reason, ban_type, ban_until, is_active),
          hidden_users!left(id, hidden_at)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      // Filter logic
      if (input.filter === 'today') {
        query = query.gte('created_at', new Date().toISOString().split('T')[0]);
      } else if (input.filter === 'banned') {
        query = query.not('user_bans', 'is', null);
      } else if (input.filter === 'blueTick') {
        query = query.not('blue_ticks', 'is', null);
      } else if (input.filter === 'hidden') {
        query = query.not('hidden_users', 'is', null);
      }

      if (input.search) {
        query = query.or(`full_name.ilike.%${input.search}%,email.ilike.%${input.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return { users: data || [], total: count || 0 };
    }),

  banUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().min(1),
        banType: z.enum(["temporary", "permanent"]),
        banUntil: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const banData: any = {
        user_id: input.userId,
        banned_by: adminUser.id,
        reason: input.reason,
        ban_type: input.banType,
        is_active: true,
      };

      if (input.banType === "temporary" && input.banUntil) {
        banData.ban_until = input.banUntil;
      }

      const { data, error } = await supabase
        .from("user_bans")
        .insert(banData)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "ban_user",
        target_type: "user",
        target_id: input.userId,
        description: `User banned: ${input.reason}`,
      });

      return data;
    }),

  unbanUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const { error } = await supabase
        .from("user_bans")
        .update({ is_active: false, ban_until: new Date().toISOString() })
        .eq("user_id", input.userId)
        .eq("is_active", true);

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "unban_user",
        target_type: "user",
        target_id: input.userId,
        description: "User unbanned",
      });

      return { success: true };
    }),

  giveBlueTick: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        verificationType: z.enum(["manual", "automatic", "celebrity"]).default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const { data: existing } = await supabase
        .from("blue_ticks")
        .select("id")
        .eq("user_id", input.userId)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from("blue_ticks")
          .update({
            is_active: true,
            verified_by: adminUser.id,
            verification_type: input.verificationType,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        await supabase.from("admin_logs").insert({
          admin_id: adminUser.id,
          action_type: "update_blue_tick",
          target_type: "user",
          target_id: input.userId,
          description: `Blue tick updated: ${input.verificationType}`,
        });

        return data;
      }

      const { data, error } = await supabase
        .from("blue_ticks")
        .insert({
          user_id: input.userId,
          verified_by: adminUser.id,
          verification_type: input.verificationType,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "give_blue_tick",
        target_type: "user",
        target_id: input.userId,
        description: `Blue tick given: ${input.verificationType}`,
      });

      return data;
    }),

  removeBlueTick: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const { error } = await supabase
        .from("blue_ticks")
        .update({ is_active: false })
        .eq("user_id", input.userId)
        .eq("is_active", true);

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "remove_blue_tick",
        target_type: "user",
        target_id: input.userId,
        description: "Blue tick removed",
      });

      return { success: true };
    }),

  getPolicies: publicProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw new Error(error.message);

    return data || [];
  }),

  getAllPolicies: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx;

    if (!user) throw new Error("Unauthorized");

    await checkAdminHelper(supabase, user.id);

    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw new Error(error.message);

    return data || [];
  }),

  createPolicy: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        policyType: z.enum(["terms", "privacy", "community", "cookie", "refund", "other"]),
        displayOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const { data, error } = await supabase
        .from("policies")
        .insert({
          title: input.title,
          content: input.content,
          policy_type: input.policyType,
          display_order: input.displayOrder,
          created_by: adminUser.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "create_policy",
        target_type: "policy",
        target_id: data.id,
        description: `Policy created: ${input.title}`,
      });

      return data;
    }),

  updatePolicy: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        policyType: z.enum(["terms", "privacy", "community", "cookie", "refund", "other"]).optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const updateData: any = { updated_by: adminUser.id };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.policyType !== undefined) updateData.policy_type = input.policyType;
      if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from("policies")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "update_policy",
        target_type: "policy",
        target_id: input.id,
        description: `Policy updated: ${input.title || input.id}`,
      });

      return data;
    }),

  deletePolicy: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const { error } = await supabase
        .from("policies")
        .delete()
        .eq("id", input.id);

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "delete_policy",
        target_type: "policy",
        target_id: input.id,
        description: "Policy deleted",
      });

      return { success: true };
    }),

  getCompanyInfo: publicProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx;

    const { data, error } = await supabase.from("company_info").select("*").single();

    if (error && error.code !== "PGRST116") throw new Error(error.message);

    return data || null;
  }),

  updateCompanyInfo: protectedProcedure
    .input(
      z.object({
        companyName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        website: z.string().url().optional(),
        socialMedia: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const updateData: any = { updated_by: adminUser.id };

      if (input.companyName !== undefined) updateData.company_name = input.companyName;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.website !== undefined) updateData.website = input.website;
      if (input.socialMedia !== undefined) updateData.social_media = input.socialMedia;

      const { data, error } = await supabase
        .from("company_info")
        .upsert(updateData, { onConflict: "id" })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "update_company_info",
        target_type: "company_info",
        description: "Company info updated",
      });

      return data;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx;

    if (!user) throw new Error("Unauthorized");

    await checkAdminHelper(supabase, user.id);

    const { data: todayRegistrations } = await supabase.rpc("get_today_registrations");
    const { data: todayReports } = await supabase.rpc("get_today_reports");
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    const { count: totalPosts } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false);
    const { count: bannedUsers } = await supabase
      .from("user_bans")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const { count: blueTickUsers } = await supabase
      .from("blue_ticks")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const { count: pendingTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    const { count: pendingReports } = await supabase
      .from("user_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return {
      todayRegistrations: todayRegistrations || 0,
      todayReports: todayReports || 0,
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      bannedUsers: bannedUsers || 0,
      blueTickUsers: blueTickUsers || 0,
      pendingTickets: pendingTickets || 0,
      pendingReports: pendingReports || 0,
    };
  }),

  getSupportTickets: protectedProcedure
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

      await checkAdminHelper(supabase, user.id);

      let query = supabase
        .from("support_tickets")
        .select(
          `*,
          user:profiles!support_tickets_user_id_fkey(id, full_name, email, avatar_url),
          assigned_admin:admin_users!support_tickets_assigned_to_fkey(id, email)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.status) {
        query = query.eq("status", input.status);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return { tickets: data || [], total: count || 0 };
    }),

  updateSupportTicket: protectedProcedure
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

      const adminUser = await checkAdminHelper(supabase, user.id);

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

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "update_support_ticket",
        target_type: "support_ticket",
        target_id: input.ticketId,
        description: `Support ticket ${input.status || "updated"}`,
      });

      return data;
    }),

  getKycRequests: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      await checkAdminHelper(supabase, user.id);

      let query = supabase
        .from("kyc_requests")
        .select(
          `*,
          user:profiles!kyc_requests_user_id_fkey(id, full_name, email, avatar_url),
          documents:kyc_documents(*),
          reviewer:admin_users!kyc_requests_reviewed_by_fkey(id, email)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.status) {
        query = query.eq("status", input.status);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return { requests: data || [], total: count || 0 };
    }),

  approveKyc: protectedProcedure
    .input(
      z.object({
        kycId: z.string().uuid(),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const { data, error } = await supabase
        .from("kyc_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id,
          review_notes: input.reviewNotes || "Kimlik doğrulama onaylandı",
        })
        .eq("id", input.kycId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Update profiles.is_verified = true
      await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", data.user_id);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "approve_kyc",
        target_type: "kyc_request",
        target_id: input.kycId,
        description: `KYC approved: ${data.full_name}`,
      });

      return data;
    }),

  rejectKyc: protectedProcedure
    .input(
      z.object({
        kycId: z.string().uuid(),
        reviewNotes: z.string().min(1, "Red nedeni zorunludur"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      if (!user) throw new Error("Unauthorized");

      const adminUser = await checkAdminHelper(supabase, user.id);

      const { data, error } = await supabase
        .from("kyc_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id,
          review_notes: input.reviewNotes,
        })
        .eq("id", input.kycId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "reject_kyc",
        target_type: "kyc_request",
        target_id: input.kycId,
        description: `KYC rejected: ${data.full_name} - ${input.reviewNotes}`,
      });

      return data;
    }),
});

// App Router
const appRouter = createTRPCRouter({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

// Serve tRPC requests
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(req.url);
  let pathname = url.pathname;

  // Normalize pathname for admin-worker
  if (pathname.startsWith("/functions/v1/admin-worker")) {
    pathname = pathname.replace("/functions/v1/admin-worker", "");
  } else if (pathname.startsWith("/admin-worker")) {
    pathname = pathname.replace("/admin-worker", "");
  }

  if (!pathname.startsWith("/api/trpc")) {
    if (pathname.startsWith("/")) {
      pathname = "/api/trpc" + pathname;
    } else {
      pathname = "/api/trpc/" + pathname;
    }
  }

  const normalizedUrl = new URL(pathname + url.search, url.origin);
  const normalizedReq = new Request(normalizedUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req: normalizedReq,
    createContext: () => createContext(normalizedReq),
    onError: ({ error, path, type }) => {
      console.error(`tRPC error on '${path}':`, {
        code: error.code,
        message: error.message,
        type,
      });
    },
  });

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return response;
});

