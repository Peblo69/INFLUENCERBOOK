// Edge Function: upload-lora-runninghub
// Handles LoRA file upload to RunningHub and management
// Actions: get-upload-url, confirm-upload, list, delete

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RUNNINGHUB_API_KEY = Deno.env.get("RUNNINGHUB_API_KEY") ?? "";
const RUNNINGHUB_BASE_URL = "https://www.runninghub.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    // ── Auth (same pattern as kiara-generate) ──
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

    const body = await req.json();
    const { action } = body;

    // ══════════════════════════════════════════════════════
    // ACTION: get-upload-url
    // Step 1 of the upload flow — get presigned URL from RunningHub
    // ══════════════════════════════════════════════════════
    if (action === "get-upload-url") {
      const {
        lora_name,
        md5_hex,
        file_size_bytes,
        trigger_word,
        description,
      } = body;

      if (!lora_name || !md5_hex) {
        return respond({ error: "Missing required fields: lora_name, md5_hex" }, 400);
      }

      // Validate file size (max 500MB)
      if (file_size_bytes && file_size_bytes > 500 * 1024 * 1024) {
        return respond({ error: "File too large. Maximum 500MB." }, 400);
      }

      // Generate unique RunningHub-safe name
      const sanitized = String(lora_name)
        .replace(/\.safetensors$/i, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 40);
      const timestamp = Date.now();
      const userSlice = user.id.substring(0, 8);
      const rhLoraName = `${sanitized}_${userSlice}_${timestamp}.safetensors`;

      console.log(`[upload-lora] Requesting upload URL for: ${rhLoraName}`);

      // Call RunningHub upload-lora init API
      const rhResponse = await fetch(
        `${RUNNINGHUB_BASE_URL}/task/openapi/upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Host: "www.runninghub.ai",
          },
          body: JSON.stringify({
            apiKey: RUNNINGHUB_API_KEY,
            fileType: "lora",
            loraName: rhLoraName,
            md5Hex: md5_hex,
          }),
        }
      );

      const rhText = await rhResponse.text();
      let rhData: any;
      try {
        rhData = JSON.parse(rhText);
      } catch {
        console.error("[upload-lora] RunningHub returned non-JSON:", rhText);
        return respond(
          { error: "RunningHub upload init returned invalid response" },
          502
        );
      }

      console.log("[upload-lora] RunningHub response:", JSON.stringify(rhData));

      if (!rhResponse.ok || (rhData.code !== 0 && rhData.code !== 200)) {
        return respond(
          {
            error: rhData.msg || rhData.message || "RunningHub upload init failed",
            rh_code: rhData.code,
          },
          502
        );
      }

      // Extract upload URL from response (RunningHub may nest it differently)
      const uploadUrl =
        rhData.data?.uploadUrl ||
        rhData.data?.url ||
        rhData.data?.signedUrl ||
        (typeof rhData.data === "string" ? rhData.data : null);

      if (!uploadUrl) {
        console.error("[upload-lora] No upload URL in response:", rhText);
        return respond(
          { error: "RunningHub did not return an upload URL" },
          502
        );
      }

      // Create lora_models row with uploading status
      const { data: loraRow, error: insertError } = await supabaseAdmin
        .from("lora_models")
        .insert({
          user_id: user.id,
          name: String(lora_name).replace(/\.safetensors$/i, ""),
          description: description || null,
          trigger_word: trigger_word || "",
          model_type: "runninghub",
          lora_url: "", // RunningHub hosts it
          rh_lora_name: rhLoraName,
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

      return respond({
        upload_url: uploadUrl,
        lora_id: loraRow.id,
        rh_lora_name: rhLoraName,
      });
    }

    // ══════════════════════════════════════════════════════
    // ACTION: confirm-upload
    // Step 3 — after frontend uploads to presigned URL
    // ══════════════════════════════════════════════════════
    if (action === "confirm-upload") {
      const { lora_id } = body;
      if (!lora_id) {
        return respond({ error: "Missing required field: lora_id" }, 400);
      }

      // Verify ownership
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

      // Update status to completed
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
    // Returns user's completed RunningHub LoRAs
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
    // Soft-delete a LoRA
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
