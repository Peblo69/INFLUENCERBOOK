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

const getUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Unauthorized" };
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !user) {
    return { user: null, error: "Unauthorized" };
  }

  return { user, error: null };
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

  const { error: userError } = await getUser(req);
  if (userError) {
    return new Response(
      JSON.stringify({ error: userError }),
      { status: 401, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const lookupKeys = Array.isArray(body.lookupKeys)
    ? body.lookupKeys.filter((key: unknown) => typeof key === "string" && key.trim().length > 0).slice(0, 10)
    : [];

  const productIds = Array.isArray(body.productIds)
    ? body.productIds.filter((key: unknown) => typeof key === "string" && key.trim().length > 0)
    : [];

  let prices: Stripe.Price[] = [];

  if (lookupKeys.length > 0) {
    const response = await stripe.prices.list({
      active: true,
      lookup_keys: lookupKeys,
      expand: ["data.product"],
      limit: Math.min(lookupKeys.length, 10),
    });
    prices = response.data;
  } else {
    const response = await stripe.prices.list({
      active: true,
      expand: ["data.product"],
      limit: 100,
    });
    prices = response.data;
  }

  if (productIds.length > 0) {
    prices = prices.filter((price) => {
      const product = typeof price.product === "string" ? price.product : price.product?.id;
      return product ? productIds.includes(product) : false;
    });
  }

  const payload = prices.map((price) => {
    const product = typeof price.product === "string" ? null : price.product;
    return {
      id: price.id,
      currency: price.currency,
      unit_amount: price.unit_amount,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            interval_count: price.recurring.interval_count,
          }
        : null,
      product: product
        ? {
            id: product.id,
            name: product.name ?? null,
            description: product.description ?? null,
            images: product.images ?? [],
            metadata: product.metadata ?? {},
          }
        : null,
      nickname: price.nickname ?? null,
      metadata: price.metadata ?? {},
    };
  });

  return new Response(
    JSON.stringify({ prices: payload }),
    { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
  );
});
