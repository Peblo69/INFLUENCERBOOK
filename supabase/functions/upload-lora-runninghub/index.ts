// Edge Function: upload-lora-runninghub
// Handles LoRA file upload to RunningHub via their presigned URL API
// Flow: prepare-upload → proxy-upload (streams file to COS) → confirm-upload
// Actions: prepare-upload, proxy-upload, confirm-upload, list, delete
//
// proxy-upload uses Content-Type: application/octet-stream to distinguish from
// JSON actions. The presigned URL and lora_id are passed via headers.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RUNNINGHUB_API_KEY = Deno.env.get("RUNNINGHUB_API_KEY") ?? "";
const RUNNINGHUB_BASE_URL = "https://www.runninghub.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-upload-url, x-lora-id",
  "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return respond({ error: "Unauthorized", details: userError?.message }, 401);
    }

    // ══════════════════════════════════════════════════════
    // PROXY UPLOAD MODE
    // Detected by Content-Type: application/octet-stream
    // Streams the binary body directly to RunningHub's COS presigned URL.
    // Headers: X-Upload-URL (presigned URL), X-Lora-ID (DB record ID)
    // ══════════════════════════════════════════════════════
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/octet-stream")) {
      const uploadUrl = req.headers.get("x-upload-url");
      const loraId = req.headers.get("x-lora-id");

      if (!uploadUrl) {
        return respond({ error: "Missing X-Upload-URL header" }, 400);
      }

      console.log(`[upload-lora] Proxy upload starting for lora ${loraId}`);

      // Stream the request body directly to COS — no buffering
      const cosResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: req.body,
      });

      if (!cosResponse.ok) {
        const errText = await cosResponse.text().catch(() => "");
        console.error(`[upload-lora] COS PUT failed: ${cosResponse.status} ${errText}`);
        return respond(
          { error: `Upload to storage failed (HTTP ${cosResponse.status})` },
          502
        );
      }

      console.log(`[upload-lora] Proxy upload succeeded for lora ${loraId}`);

      // Auto-confirm if lora_id was provided
      if (loraId) {
        await supabaseAdmin
          .from("lora_models")
          .update({
            rh_upload_status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", loraId)
          .eq("user_id", user.id);

        console.log(`[upload-lora] Auto-confirmed lora ${loraId}`);
      }

      return respond({ success: true });
    }

    // ══════════════════════════════════════════════════════
    // JSON ACTION MODE — parse body as JSON
    // ══════════════════════════════════════════════════════
    const body = await req.json();
    const { action } = body;

    // ══════════════════════════════════════════════════════
    // ACTION: prepare-upload
    // Calls RunningHub's /api/openapi/getLoraUploadUrl to get a presigned URL,
    // creates DB record, returns presigned URL + lora_id to browser.
    // ══════════════════════════════════════════════════════
    if (action === "prepare-upload") {
      const { lora_name, md5_hex, file_size_bytes, trigger_word, description } = body;

      if (!lora_name) {
        return respond({ error: "Missing required field: lora_name" }, 400);
      }
      if (!md5_hex) {
        return respond({ error: "Missing required field: md5_hex (file MD5 hash)" }, 400);
      }

      if (file_size_bytes && file_size_bytes > 500 * 1024 * 1024) {
        return respond({ error: "File too large. Maximum 500MB." }, 400);
      }

      // Sanitize lora name for RunningHub
      const sanitized = String(lora_name)
        .replace(/\.safetensors$/i, "")
        .replace(/[^a-zA-Z0-9_\-. ]/g, "_")
        .substring(0, 60);
      const userSlice = user.id.substring(0, 8);
      const rhLoraName = `${sanitized}_${userSlice}`;

      // Call RunningHub's LoRA upload URL API
      console.log(`[upload-lora] Requesting presigned URL from RunningHub for: ${rhLoraName}`);
      const rhResponse = await fetch(`${RUNNINGHUB_BASE_URL}/api/openapi/getLoraUploadUrl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RUNNINGHUB_API_KEY}`,
        },
        body: JSON.stringify({
          apiKey: RUNNINGHUB_API_KEY,
          loraName: rhLoraName,
          md5Hex: md5_hex,
        }),
      });

      const rhData = await rhResponse.json();
      console.log(`[upload-lora] RunningHub response:`, JSON.stringify(rhData));

      if (rhData.code !== 0 || !rhData.data?.url || !rhData.data?.fileName) {
        return respond(
          { error: "RunningHub rejected upload request", details: rhData.msg || rhData },
          502
        );
      }

      const rhFileName = rhData.data.fileName;
      const presignedUrl = rhData.data.url;

      // Create DB record with uploading status
      const { data: loraRow, error: insertError } = await supabaseAdmin
        .from("lora_models")
        .insert({
          user_id: user.id,
          name: String(lora_name).replace(/\.safetensors$/i, ""),
          description: description || null,
          trigger_word: trigger_word || "",
          model_type: "runninghub",
          lora_url: "",
          rh_lora_name: rhFileName,
          rh_upload_status: "uploading",
          rh_md5_hex: md5_hex,
          file_size_bytes: file_size_bytes || null,
          default_strength: 0.8,
          source: "upload",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[upload-lora] Insert error:", insertError);
        return respond(
          { error: "Failed to create LoRA record: " + insertError.message },
          500
        );
      }

      console.log(`[upload-lora] Prepared upload: ${rhFileName} → DB id ${loraRow.id}`);

      return respond({
        lora_id: loraRow.id,
        rh_lora_name: rhFileName,
        upload_url: presignedUrl,
      });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: confirm-upload
    // ══════════════════════════════════════════════════════
    if (action === "confirm-upload") {
      const { lora_id } = body;
      if (!lora_id) {
        return respond({ error: "Missing required field: lora_id" }, 400);
      }

      const { data: lora, error: fetchError } = await supabaseAdmin
        .from("lora_models")
        .select("*")
        .eq("id", lora_id)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !lora) {
        return respond({ error: "LoRA not found or not owned by you" }, 404);
      }

      if (lora.rh_upload_status === "completed") {
        return respond({ success: true, lora });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("lora_models")
        .update({
          rh_upload_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lora_id)
        .select()
        .single();

      if (updateError) {
        return respond(
          { error: "Failed to confirm upload: " + updateError.message },
          500
        );
      }

      console.log(`[upload-lora] Upload confirmed: ${updated.rh_lora_name}`);
      return respond({ success: true, lora: updated });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: list
    // ══════════════════════════════════════════════════════
    if (action === "list") {
      const { data: loras, error: listError } = await supabaseAdmin
        .from("lora_models")
        .select(
          "id, name, rh_lora_name, trigger_word, default_strength, rh_upload_status, file_size_bytes, created_at"
        )
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .in("rh_upload_status", ["completed"])
        .order("created_at", { ascending: false });

      if (listError) {
        return respond({ error: "Failed to list LoRAs: " + listError.message }, 500);
      }

      return respond({ loras: loras || [] });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: delete
    // ══════════════════════════════════════════════════════
    if (action === "delete") {
      const { lora_id } = body;
      if (!lora_id) {
        return respond({ error: "Missing required field: lora_id" }, 400);
      }

      const { error: delError } = await supabaseAdmin
        .from("lora_models")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", lora_id)
        .eq("user_id", user.id);

      if (delError) {
        return respond({ error: "Failed to delete LoRA" }, 500);
      }

      return respond({ success: true });
    }

    return respond({ error: "Unknown action: " + action }, 400);
  } catch (error) {
    console.error("[upload-lora] Error:", error);
    return respond(
      { error: error.message || "Internal server error" },
      500
    );
  }
});
