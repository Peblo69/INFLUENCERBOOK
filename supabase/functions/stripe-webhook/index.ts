import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const normalizePlan = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const plan = value.toLowerCase();
  if (["free", "pro", "premium", "enterprise"].includes(plan)) return plan;
  return null;
};

const normalizePlanStatus = (value: string | null | undefined): string => {
  const status = (value || "").toLowerCase();
  if (["free", "trialing", "active", "past_due", "canceled", "incomplete"].includes(status)) {
    return status;
  }
  if (status === "unpaid" || status === "paused") return "past_due";
  if (status === "incomplete_expired") return "incomplete";
  return "active";
};

const toIso = (unixSeconds?: number | null) => {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
};

const getUserIdFromProfileByCustomer = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  customerId?: string | null
): Promise<string | null> => {
  if (!customerId) return null;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
};

const resolveUserId = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: any
): Promise<string | null> => {
  const metadataUserId = payload?.metadata?.user_id as string | undefined;
  if (metadataUserId) return metadataUserId;

  const clientReferenceId = payload?.client_reference_id as string | undefined;
  if (clientReferenceId) return clientReferenceId;

  const customerId = payload?.customer as string | undefined;
  return await getUserIdFromProfileByCustomer(supabaseAdmin, customerId);
};

const updateProfile = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  updates: Record<string, any>
) => {
  if (!userId) return;
  await supabaseAdmin.from("profiles").update(updates).eq("id", userId);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ error: "Stripe secrets are not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Invalid signature" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const existing = await supabaseAdmin
    .from("billing_events")
    .select("id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing.data) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payloadObject: any = event.data.object;
  const customerId = payloadObject?.customer as string | undefined;
  const subscriptionId = payloadObject?.subscription as string | undefined;
  const userId = await resolveUserId(supabaseAdmin, payloadObject);

  await supabaseAdmin.from("billing_events").insert({
    event_id: event.id,
    event_type: event.type,
    status: payloadObject?.status || payloadObject?.payment_status || null,
    user_id: userId,
    customer_id: customerId ?? null,
    subscription_id: subscriptionId ?? null,
    payload: event,
    processed_at: new Date().toISOString(),
  });

  switch (event.type) {
    case "customer.created": {
      if (userId && customerId) {
        await updateProfile(supabaseAdmin, userId, {
          stripe_customer_id: customerId,
          payment_provider: "stripe",
        });
      }
      break;
    }

    case "checkout.session.completed": {
      const session = payloadObject as Stripe.Checkout.Session;
      const sessionUserId = userId;
      const email = session.customer_details?.email || session.customer_email || null;
      const sessionCustomerId = session.customer as string | null;

      if (sessionUserId) {
        await updateProfile(supabaseAdmin, sessionUserId, {
          stripe_customer_id: sessionCustomerId ?? undefined,
          billing_email: email ?? undefined,
          payment_provider: "stripe",
        });
      }

      if (session.mode === "payment" && sessionUserId) {
        const credits = Number(session.metadata?.credits || session.metadata?.credit_amount || 0);
        if (credits > 0) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("credits")
            .eq("id", sessionUserId)
            .single();
          const currentCredits = profile?.credits || 0;
          const newCredits = currentCredits + credits;

          await supabaseAdmin.from("profiles").update({ credits: newCredits }).eq("id", sessionUserId);
          await supabaseAdmin.from("credit_transactions").insert({
            user_id: sessionUserId,
            amount: credits,
            transaction_type: "purchase",
            payment_provider: "stripe",
            payment_id: session.payment_intent as string | null,
            payment_amount: session.amount_total ? session.amount_total / 100 : null,
            payment_currency: session.currency || "USD",
            description: "Credit purchase",
            balance_after: newCredits,
          });
        }
      }

      if (session.mode === "subscription" && sessionUserId) {
        const subscription = session.subscription as string | null;
        await updateProfile(supabaseAdmin, sessionUserId, {
          stripe_subscription_id: subscription ?? undefined,
          plan_status: "active",
          payment_provider: "stripe",
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = payloadObject as Stripe.Subscription;
      const subscriptionUserId = userId ?? (await getUserIdFromProfileByCustomer(supabaseAdmin, subscription.customer as string));
      const price = subscription.items?.data?.[0]?.price;
      const planCandidate = normalizePlan(price?.metadata?.plan || price?.lookup_key || price?.nickname || subscription.metadata?.plan);
      const mappedPlanStatus = normalizePlanStatus(subscription.status);
      const plan = mappedPlanStatus === "canceled" ? "free" : planCandidate || "pro";

      if (subscriptionUserId) {
        await updateProfile(supabaseAdmin, subscriptionUserId, {
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          plan,
          plan_status: mappedPlanStatus,
          is_pro: plan !== "free",
          current_period_end: toIso(subscription.current_period_end),
          plan_started_at: toIso(subscription.start_date),
          trial_ends_at: toIso(subscription.trial_end),
          billing_metadata: {
            price_id: price?.id ?? null,
            price_lookup_key: price?.lookup_key ?? null,
          },
          payment_provider: "stripe",
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = payloadObject as Stripe.Subscription;
      const subscriptionUserId = userId ?? (await getUserIdFromProfileByCustomer(supabaseAdmin, subscription.customer as string));
      if (subscriptionUserId) {
        await updateProfile(supabaseAdmin, subscriptionUserId, {
          plan: "free",
          plan_status: "canceled",
          is_pro: false,
          stripe_subscription_id: null,
          current_period_end: toIso(subscription.current_period_end),
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = payloadObject as Stripe.Invoice;
      const invoiceUserId = userId ?? (await getUserIdFromProfileByCustomer(supabaseAdmin, invoice.customer as string));
      if (invoiceUserId) {
        await updateProfile(supabaseAdmin, invoiceUserId, { plan_status: "past_due" });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = payloadObject as Stripe.Invoice;
      const invoiceUserId = userId ?? (await getUserIdFromProfileByCustomer(supabaseAdmin, invoice.customer as string));
      if (invoiceUserId) {
        await updateProfile(supabaseAdmin, invoiceUserId, { plan_status: "active" });
      }
      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
