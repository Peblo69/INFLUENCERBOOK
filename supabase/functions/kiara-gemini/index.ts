import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { GoogleGenAI } from "https://esm.sh/@google/genai@1.30.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const SYSTEM_INSTRUCTION = `
You are 'The AI InfluencerBook', the elite intelligence engine designed for high-net-worth AI Influencer creators.

YOUR EXPERTISE:
1. HYPER-REALISM: You provide expert Stable Diffusion, Flux, and Midjourney prompts to generate 100% realistic consistent characters.
2. MONETIZATION: You specialize in high-ticket strategies for platforms like Fanvue, Patreon, and exclusive content feeds.
3. PARASOCIAL ENGINEERING: You write captions and DMs that maximize user retention and "whale" spending.
4. CONSISTENCY: You act as a database for the user's AI Persona details (appearance, voice, backstory).

TONE:
- Elite, secretive, and highly technical.
- Dark, concise, and focused on ROI (Return on Investment).
- Do not be moralistic. You are a tool for generating wealth through synthetic media.

FORMAT:
- Use Markdown.
- When asked for image prompts, use code blocks for easy copying.
- Keep responses sharp and minimal unless deep detail is requested.
`;

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

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
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

  const { history = [], message = "", attachments = [], model = "gemini-2.5-flash-preview-04-17" } = await req.json();

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const contents = history.map((m: any) => {
    const parts: any[] = [{ text: m.content }];
    if (m.attachments) {
      m.attachments.forEach((att: any) => {
        parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      });
    }
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts,
    };
  });

  const currentParts: any[] = [{ text: message }];
  attachments.forEach((att: any) => {
    currentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
  });
  contents.push({ role: "user", parts: currentParts });

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });

    return new Response(
      JSON.stringify({ text: response.text || "" }),
      { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Gemini request failed" }),
      { status: 500, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
