// v2 - force new deployment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const XAI_API_KEY =
  Deno.env.get("XAI_API_KEY") ??
  Deno.env.get("GROK_API_KEY") ??
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!XAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "XAI_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Supabase edge runtime already verifies JWT before reaching this code
  // If we're here, the user is authenticated (sb.auth_user is set by runtime)

  const bodyText = await req.text();
  const upstreamResponse = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${XAI_API_KEY}`,
    },
    body: bodyText,
  });

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    const isInvalidJwt =
      upstreamResponse.status === 401 &&
      errorText.toLowerCase().includes("invalid jwt");
    const errorMessage = isInvalidJwt
      ? "XAI API key is missing or invalid. Set XAI_API_KEY (or GROK_API_KEY) in Supabase secrets."
      : "Grok upstream error.";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        status: upstreamResponse.status,
        upstream: errorText,
      }),
      { status: upstreamResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    responseHeaders.set(key, value);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
});
