import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const allowedOrigins = (Deno.env.get("KIARA_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string) =>
  allowedOrigins.length === 0 || allowedOrigins.includes(origin);

const buildCorsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": allowedOrigins.length === 0 ? "*" : origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
});

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

  const url = new URL(req.url);
  const capability = url.searchParams.get("capability");

  let query = supabaseAdmin
    .from("ai_model_registry")
    .select(`
      model_id,
      display_name,
      description,
      capabilities,
      default_params,
      max_width,
      max_height,
      min_width,
      min_height,
      max_images,
      supports_reference_images,
      max_reference_images,
      priority,
      active,
      notes
    `)
    .eq("active", true)
    .order("priority", { ascending: true });

  if (capability) {
    query = query.contains("capabilities", [capability]);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to load model registry" }),
      { status: 500, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  const models = data || [];

  return new Response(
    JSON.stringify({ models, count: models.length }),
    { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
  );
});
