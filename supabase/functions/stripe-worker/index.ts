// Stripe Worker - Destekçi (Bağış) Sistemi
// Google Play + App Store uyumlu gönüllü bağış sistemi
// Deno runtime compatible

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchRequestHandler } from "npm:@trpc/server@^11.7.1/adapters/fetch";
import { createContext, createTRPCRouter, protectedProcedure, publicProcedure } from "./create-context.ts";
import { z } from "npm:zod@^4.1.12";
import { TRPCError } from "npm:@trpc/server@^11.7.1";
import Stripe from "npm:stripe@^17.3.1";

// Stripe Configuration
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// Stripe Router - Destekçi (Bağış) Sistemi
const stripeRouter = createTRPCRouter({
  // Destek (Bağış) Payment Intent oluştur
  createSupporterDonation: protectedProcedure
    .input(
      z.object({
        package_id: z.string().uuid(),
        amount: z.number().positive().int().optional(),
        is_anonymous: z.boolean().default(false),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        // Paket bilgilerini al
        const { data: packageData, error: packageError } = await supabase
          .from("supporter_packages")
          .select("*")
          .eq("id", input.package_id)
          .eq("is_active", true)
          .single();

        if (packageError || !packageData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Destek paketi bulunamadı",
          });
        }

        const amount = input.amount || packageData.amount;

        // Payment Intent oluştur
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "try",
          description: `${packageData.display_name} - MyTrabzon Destek`,
          metadata: {
            user_id: user.id,
            package_id: input.package_id,
            package_name: packageData.name,
            type: "supporter_donation",
            is_anonymous: input.is_anonymous.toString(),
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Bağış kaydı oluştur (pending)
        const badgeExpiresAt = packageData.badge_duration_days
          ? new Date(Date.now() + packageData.badge_duration_days * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: donation, error: donationError } = await supabase
          .from("supporter_donations")
          .insert({
            user_id: user.id,
            package_id: input.package_id,
            amount: amount,
            stripe_payment_intent_id: paymentIntent.id,
            status: "pending",
            is_anonymous: input.is_anonymous,
            message: input.message,
            badge_expires_at: badgeExpiresAt,
          })
          .select()
          .single();

        if (donationError) {
          console.error("Donation record error:", donationError);
        }

        return {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          donation_id: donation?.id,
        };
      } catch (error: any) {
        console.error("Stripe supporter donation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Bağış oluşturulamadı",
        });
      }
    }),

  // Bağış durumunu kontrol et ve güncelle
  checkDonationStatus: protectedProcedure
    .input(
      z.object({
        payment_intent_id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        // Payment Intent durumunu kontrol et
        const paymentIntent = await stripe.paymentIntents.retrieve(input.payment_intent_id);

        // Bağış kaydını bul
        const { data: donation, error: donationError } = await supabase
          .from("supporter_donations")
          .select("*")
          .eq("stripe_payment_intent_id", input.payment_intent_id)
          .eq("user_id", user.id)
          .single();

        if (donationError || !donation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bağış kaydı bulunamadı",
          });
        }

        // Durumu güncelle
        let newStatus = "pending";
        if (paymentIntent.status === "succeeded") {
          newStatus = "completed";
        } else if (paymentIntent.status === "canceled" || paymentIntent.status === "payment_failed") {
          newStatus = "failed";
        }

        // Sadece durum değiştiyse güncelle
        if (donation.status !== newStatus) {
          const { error: updateError } = await supabase
            .from("supporter_donations")
            .update({ status: newStatus })
            .eq("id", donation.id);

          if (updateError) {
            console.error("Donation status update error:", updateError);
          }

          // Bağış tamamlandıysa etiket ekle
          if (newStatus === "completed") {
            const { error: badgeError } = await supabase.rpc("add_supporter_badge", {
              p_user_id: user.id,
              p_package_id: donation.package_id,
            });

            if (badgeError) {
              console.error("Add supporter badge error:", badgeError);
            }
          }
        }

        return {
          status: newStatus,
          payment_status: paymentIntent.status,
          amount: paymentIntent.amount,
        };
      } catch (error: any) {
        console.error("Check donation status error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Bağış durumu kontrol edilemedi",
        });
      }
    }),

  // Destek paketlerini getir
  getSupporterPackages: publicProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("supporter_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Destek paketleri alınamadı",
      });
    }

    return data || [];
  }),

  // Kullanıcının bağış geçmişini getir
  getMyDonations: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const { data, error } = await supabase
      .from("supporter_donations")
      .select(`
        *,
        supporter_packages:package_id (
          name,
          display_name,
          amount
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Bağış geçmişi alınamadı",
      });
    }

    return data || [];
  }),

  // Destekçi etiketi görünürlüğünü değiştir
  toggleSupporterBadge: protectedProcedure
    .input(
      z.object({
        visible: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const { error } = await supabase
        .from("profiles")
        .update({ supporter_badge_visible: input.visible })
        .eq("id", user.id)
        .eq("supporter_badge", true);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Etiket görünürlüğü güncellenemedi",
        });
      }

      return { success: true };
    }),

  // Web için Checkout Session oluştur
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive().int(),
        currency: z.string().default("try"),
        success_url: z.string().url(),
        cancel_url: z.string().url(),
        description: z.string().optional(),
        metadata: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: input.currency,
                product_data: {
                  name: input.description || "MyTrabzon Destek",
                },
                unit_amount: input.amount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: input.success_url,
          cancel_url: input.cancel_url,
          metadata: {
            user_id: user.id,
            ...input.metadata,
          },
        });

        return {
          session_id: session.id,
          url: session.url,
        };
      } catch (error: any) {
        console.error("Stripe checkout session error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Checkout session oluşturulamadı",
        });
      }
    }),

  // Payment Intent oluştur (genel - geriye uyumluluk için)
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive().int(),
        currency: z.string().default("try"),
        description: z.string().optional(),
        metadata: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: input.amount,
          currency: input.currency,
          description: input.description || `Payment from ${user.email}`,
          metadata: {
            user_id: user.id,
            ...input.metadata,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        return {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
        };
      } catch (error: any) {
        console.error("Stripe payment intent error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Payment intent oluşturulamadı",
        });
      }
    }),

  // Payment Intent durumunu kontrol et
  getPaymentStatus: protectedProcedure
    .input(
      z.object({
        payment_intent_id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(input.payment_intent_id);

        if (paymentIntent.metadata.user_id !== user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Bu ödeme size ait değil",
          });
        }

        return {
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          created: paymentIntent.created,
        };
      } catch (error: any) {
        console.error("Stripe payment status error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Ödeme durumu alınamadı",
        });
      }
    }),
});

const appRouter = createTRPCRouter({
  stripe: stripeRouter,
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

  // Normalize pathname for stripe-worker
  if (pathname.startsWith("/functions/v1/stripe-worker")) {
    pathname = pathname.replace("/functions/v1/stripe-worker", "");
  } else if (pathname.startsWith("/stripe-worker")) {
    pathname = pathname.replace("/stripe-worker", "");
  }

  // Ensure pathname starts with /api/trpc
  if (!pathname.startsWith("/api/trpc")) {
    if (pathname === "/" || pathname === "") {
      pathname = "/api/trpc";
    } else if (pathname.startsWith("/")) {
      pathname = "/api/trpc" + pathname;
    } else {
      pathname = "/api/trpc/" + pathname;
    }
  }

  // Create normalized request
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
      console.error(`Stripe Worker tRPC error on '${path}':`, {
        code: error.code,
        message: error.message,
        type,
        path,
      });
    },
  });

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return response;
});
