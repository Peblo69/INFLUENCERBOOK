import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const allowedOrigins = (Deno.env.get("KIARA_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string) =>
  allowedOrigins.length === 0 || allowedOrigins.includes(origin);

const buildCorsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": allowedOrigins.length === 0 ? "*" : origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const getRequestOrigin = (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return "";
    }
  }
  return Deno.env.get("KIARA_SITE_URL") ?? Deno.env.get("PUBLIC_SITE_URL") ?? "";
};

const cleanMetadata = (input: Record<string, string | null | undefined>) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value && String(value).length > 0));

const normalizePlan = (value: string | null | undefined) => {
  if (!value) return "";
  const normalized = value.toLowerCase();
  if (normalized.includes("enterprise")) return "enterprise";
  if (normalized.includes("premium")) return "premium";
  if (normalized.includes("pro")) return "pro";
  if (normalized.includes("free")) return "free";
  return "";
};

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response("ok", { headers: buildCorsHeaders(origin) });
  }

  if (!isOriginAllowed(origin)) {
    return new Response("Forbidden", { status: 403, headers: buildCorsHeaders(origin) });
  }

  if (!STRIPE_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "Stripe secret key is not configured" }),
      { status: 500, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const priceId = typeof body.priceId === "string" ? body.priceId : "";
  if (!priceId) {
    return new Response(
      JSON.stringify({ error: "Missing required field: priceId" }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  const parsedQuantity = Number(body.quantity);
  const quantity = Number.isFinite(parsedQuantity) ? Math.max(1, parsedQuantity) : 1;

  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Invalid price" }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  if (!price.active) {
    return new Response(
      JSON.stringify({ error: "Price is not active" }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, billing_email, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileResult.data ?? null;

  if (!profile) {
    await supabaseAdmin.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      billing_email: user.email ?? null,
      full_name: (user.user_metadata as any)?.full_name ?? null,
      plan: "free",
      plan_status: "free",
      credits: 1000,
    });
  }

  let stripeCustomerId = profile?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile?.billing_email ?? profile?.email ?? user.email ?? undefined,
      name: profile?.full_name ?? (user.user_metadata as any)?.full_name ?? undefined,
      metadata: { user_id: user.id },
    });

    stripeCustomerId = customer.id;

    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_customer_id: stripeCustomerId,
        billing_email: profile?.billing_email ?? profile?.email ?? user.email ?? null,
        payment_provider: "stripe",
      })
      .eq("id", user.id);
  }

  const product = typeof price.product === "string" ? null : price.product;

  const planKeyRaw =
    price.metadata?.plan ||
    product?.metadata?.plan ||
    price.nickname ||
    product?.name ||
    "";

  const planKey = normalizePlan(String(planKeyRaw));

  const credits =
    price.metadata?.credits ||
    product?.metadata?.credits ||
    body.credits ||
    "";

  const metadata = cleanMetadata({
    user_id: user.id,
    plan: planKey ? String(planKey) : undefined,
    credits: credits ? String(credits) : undefined,
    price_id: price.id,
  });

  const mode: Stripe.Checkout.SessionCreateParams.Mode = price.recurring ? "subscription" : "payment";

  const baseOrigin = getRequestOrigin(req) || "";
  const fallbackOrigin = baseOrigin || "http://localhost:5173";

  const successUrl =
    typeof body.successUrl === "string" && body.successUrl.length > 0
      ? body.successUrl
      : `${fallbackOrigin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;

  const cancelUrl =
    typeof body.cancelUrl === "string" && body.cancelUrl.length > 0
      ? body.cancelUrl
      : `${fallbackOrigin}/billing?checkout=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode,
    customer: stripeCustomerId ?? undefined,
    customer_email: stripeCustomerId ? undefined : (profile?.billing_email ?? profile?.email ?? user.email ?? undefined),
    client_reference_id: user.id,
    line_items: [
      {
        price: price.id,
        quantity,
      },
    ],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: mode === "subscription" ? { metadata } : undefined,
    payment_intent_data: mode === "payment" ? { metadata } : undefined,
    invoice_creation: mode === "payment" ? { enabled: true } : undefined,
  });

  return new Response(
    JSON.stringify({ url: session.url, session_id: session.id }),
    { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
  );
});
