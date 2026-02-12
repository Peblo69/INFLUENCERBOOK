import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const KIARA_ALLOW_LOCALHOST =
  (Deno.env.get("KIARA_ALLOW_LOCALHOST") ?? "true").toLowerCase() !== "false";
const ADMIN_EMAIL_ALLOWLIST = (Deno.env.get("KIARA_ADMIN_EMAILS") ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const normalizeOrigin = (value: string) =>
  String(value || "").trim().replace(/\/+$/, "").toLowerCase();

const allowedOrigins = (Deno.env.get("KIARA_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => normalizeOrigin(o))
  .filter(Boolean);

const isLocalDevOrigin = (origin: string) =>
  origin.startsWith("http://localhost:") ||
  origin.startsWith("https://localhost:") ||
  origin.startsWith("http://127.0.0.1:") ||
  origin.startsWith("https://127.0.0.1:");

const isOriginAllowed = (origin: string) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  if (KIARA_ALLOW_LOCALHOST && isLocalDevOrigin(normalized)) return true;
  return allowedOrigins.length === 0 || allowedOrigins.includes(normalized);
};

const buildCorsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": allowedOrigins.length === 0 ? "*" : origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const json = (origin: string, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(origin),
      "Content-Type": "application/json",
    },
  });

const toFiniteInteger = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
};

const toBoundedInteger = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = toFiniteInteger(value, fallback);
  return Math.max(min, Math.min(max, parsed));
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const uniq = <T>(values: T[]): T[] => Array.from(new Set(values));

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) return new Response("Forbidden", { status: 403 });
    return new Response("ok", { headers: buildCorsHeaders(origin) });
  }

  if (!isOriginAllowed(origin)) {
    return new Response("Forbidden", { status: 403, headers: buildCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json(origin, 405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(origin, 500, { error: "Server environment is not configured" });
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader) {
    return json(origin, 401, { error: "Unauthorized" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "").trim();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(jwt);

  if (userError || !user) {
    return json(origin, 401, { error: "Unauthorized" });
  }

  const { data: selfProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[kiara-admin] failed to read profile:", profileError);
    return json(origin, 500, { error: "Failed to validate admin access" });
  }

  const allowlistedByEmail = !!user.email && ADMIN_EMAIL_ALLOWLIST.includes(user.email.toLowerCase());
  const isAdmin = Boolean(selfProfile?.is_admin) || allowlistedByEmail;

  if (!isAdmin) {
    return json(origin, 403, { error: "Admin access required" });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json(origin, 400, { error: "Invalid JSON body" });
  }

  const action = String((body as Record<string, unknown>).action || "dashboard").toLowerCase();

  try {
    if (action === "dashboard") {
      const hours = toBoundedInteger((body as Record<string, unknown>).hours, 24, 1, 24 * 30);
      const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const [
        totalUsersResult,
        newUsersResult,
        suspendedUsersResult,
        adminUsersResult,
        activeUsersResult,
        eventsCountResult,
        generationCountResult,
        runwayGenerationCountResult,
        recentEventsResult,
        recentJobsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", sinceIso),
        supabase.from("user_activity_events").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
        supabase.from("ai_generation_jobs").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
        supabase.from("ai_generation_jobs").select("id", { count: "exact", head: true }).gte("created_at", sinceIso).like("model_id", "kiara-vision%"),
        supabase
          .from("user_activity_events")
          .select("id, user_id, event_type, path, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("ai_generation_jobs")
          .select("id, user_id, model_id, status, credits_charged, created_at")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      const recentEvents = recentEventsResult.data || [];
      const eventUserIds = uniq(recentEvents.map((row: any) => row.user_id).filter(Boolean));
      let eventProfilesById: Record<string, any> = {};

      if (eventUserIds.length > 0) {
        const { data: eventProfiles } = await supabase
          .from("profiles")
          .select("id, email, display_name, username")
          .in("id", eventUserIds);
        eventProfilesById = Object.fromEntries((eventProfiles || []).map((profile: any) => [profile.id, profile]));
      }

      const jobs = recentJobsResult.data || [];
      const totalCreditsCharged = Number(
        jobs.reduce((acc: number, row: any) => acc + Math.max(0, toFiniteNumber(row.credits_charged, 0)), 0).toFixed(4)
      );

      const successfulJobs = jobs.filter((row: any) => row.status === "completed").length;
      const failedJobs = jobs.filter((row: any) => row.status === "failed").length;

      const topModelUsage = Object.entries(
        jobs.reduce((acc: Record<string, number>, row: any) => {
          const modelId = String(row.model_id || "unknown");
          acc[modelId] = (acc[modelId] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const responseEvents = recentEvents.map((event: any) => ({
        ...event,
        user: eventProfilesById[event.user_id] || null,
      }));

      return json(origin, 200, {
        success: true,
        dashboard: {
          window_hours: hours,
          users: {
            total: totalUsersResult.count || 0,
            new_in_window: newUsersResult.count || 0,
            suspended: suspendedUsersResult.count || 0,
            admins: adminUsersResult.count || 0,
            active_in_window: activeUsersResult.count || 0,
          },
          activity: {
            events_in_window: eventsCountResult.count || 0,
          },
          generations: {
            total_in_window: generationCountResult.count || 0,
            vision_in_window: runwayGenerationCountResult.count || 0,
            success_count: successfulJobs,
            failed_count: failedJobs,
            credits_charged_in_window: totalCreditsCharged,
            top_models: topModelUsage,
          },
          recent_events: responseEvents,
        },
      });
    }

    if (action === "users") {
      const page = Math.max(1, toFiniteInteger((body as Record<string, unknown>).page, 1));
      const pageSize = toBoundedInteger((body as Record<string, unknown>).page_size, 25, 1, 100);
      const search = String((body as Record<string, unknown>).search || "").trim();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("profiles")
        .select(
          "id, email, display_name, username, credits, plan, plan_status, is_admin, is_suspended, suspension_reason, total_images_generated, total_loras_trained, created_at, updated_at, last_seen_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search.length > 0) {
        const escaped = search.replace(/[%]/g, "\\%").replace(/[,_]/g, "\\$&");
        query = query.or(
          `email.ilike.%${escaped}%,display_name.ilike.%${escaped}%,username.ilike.%${escaped}%`
        );
      }

      const { data: users, error, count } = await query;
      if (error) {
        console.error("[kiara-admin] users query failed:", error);
        return json(origin, 500, { error: "Failed to fetch users" });
      }

      return json(origin, 200, {
        success: true,
        users: users || [],
        pagination: {
          page,
          page_size: pageSize,
          total: count || 0,
          total_pages: Math.max(1, Math.ceil((count || 0) / pageSize)),
        },
      });
    }

    if (action === "recent-events") {
      const limit = toBoundedInteger((body as Record<string, unknown>).limit, 100, 1, 500);
      const eventType = String((body as Record<string, unknown>).event_type || "").trim();

      let query = supabase
        .from("user_activity_events")
        .select("id, user_id, event_type, path, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (eventType.length > 0) {
        query = query.eq("event_type", eventType);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[kiara-admin] recent-events query failed:", error);
        return json(origin, 500, { error: "Failed to fetch recent events" });
      }

      const events = data || [];
      const userIds = uniq(events.map((row: any) => row.user_id).filter(Boolean));
      let profilesById: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, display_name, username")
          .in("id", userIds);
        profilesById = Object.fromEntries((profiles || []).map((profile: any) => [profile.id, profile]));
      }

      return json(origin, 200, {
        success: true,
        events: events.map((event: any) => ({
          ...event,
          user: profilesById[event.user_id] || null,
        })),
      });
    }

    if (action === "assistant-metrics") {
      const hours = toBoundedInteger((body as Record<string, unknown>).hours, 24, 1, 24 * 30);
      const limit = toBoundedInteger((body as Record<string, unknown>).limit, 250, 10, 1000);
      const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("ai_assistant_request_metrics")
        .select(
          "id, user_id, conversation_id, request_mode, api_mode, model, web_search_enabled, memory_enabled, memory_strategy, memory_retrieved_count, used_responses_api, request_chars, response_chars, tool_count, auth_ms, profile_ms, memory_ms, upstream_ms, total_ms, status, http_status, error_message, metadata, created_at"
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[kiara-admin] assistant-metrics query failed:", error);
        return json(origin, 500, { error: "Failed to fetch assistant metrics" });
      }

      const rows = data || [];
      const totals = rows.map((r: any) => Math.max(0, toFiniteInteger(r.total_ms, 0))).sort((a: number, b: number) => a - b);
      const percentile = (arr: number[], pct: number) => {
        if (!arr.length) return 0;
        const idx = Math.min(arr.length - 1, Math.max(0, Math.ceil((pct / 100) * arr.length) - 1));
        return arr[idx];
      };

      const successful = rows.filter((r: any) => r.status === "success");
      const upstreamErrors = rows.filter((r: any) => r.status === "upstream_error");
      const otherErrors = rows.filter((r: any) => r.status === "error");
      const webSearchCount = rows.filter((r: any) => r.web_search_enabled === true).length;
      const responsesApiCount = rows.filter((r: any) => r.api_mode === "responses").length;
      const memoryTimeoutCount = rows.filter((r: any) => String(r.memory_strategy || "") === "timeout").length;

      const avgTotalMs = rows.length
        ? Math.round(rows.reduce((sum: number, row: any) => sum + Math.max(0, toFiniteInteger(row.total_ms, 0)), 0) / rows.length)
        : 0;

      const userIds = uniq(rows.map((r: any) => r.user_id).filter(Boolean));
      let profilesById: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, display_name, username")
          .in("id", userIds);
        profilesById = Object.fromEntries((profiles || []).map((profile: any) => [profile.id, profile]));
      }

      return json(origin, 200, {
        success: true,
        window_hours: hours,
        metrics: {
          total_requests: rows.length,
          success_count: successful.length,
          upstream_error_count: upstreamErrors.length,
          error_count: otherErrors.length,
          success_rate: rows.length ? Number(((successful.length / rows.length) * 100).toFixed(2)) : 0,
          p50_total_ms: percentile(totals, 50),
          p95_total_ms: percentile(totals, 95),
          avg_total_ms: avgTotalMs,
          web_search_rate: rows.length ? Number(((webSearchCount / rows.length) * 100).toFixed(2)) : 0,
          responses_api_rate: rows.length ? Number(((responsesApiCount / rows.length) * 100).toFixed(2)) : 0,
          memory_timeout_count: memoryTimeoutCount,
        },
        recent: rows.map((row: any) => ({
          ...row,
          user: profilesById[row.user_id] || null,
        })),
      });
    }

    if (action === "user-detail") {
      const targetUserId = String((body as Record<string, unknown>).user_id || "").trim();
      if (!targetUserId) {
        return json(origin, 400, { error: "Missing required field: user_id" });
      }

      const [profileResult, eventsResult, txResult, jobsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, email, display_name, username, full_name, credits, plan, plan_status, is_admin, is_suspended, suspension_reason, total_images_generated, total_loras_trained, created_at, updated_at, last_seen_at"
          )
          .eq("id", targetUserId)
          .maybeSingle(),
        supabase
          .from("user_activity_events")
          .select("id, event_type, path, metadata, created_at")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
          .limit(120),
        supabase
          .from("credit_transactions")
          .select("id, amount, transaction_type, description, metadata, balance_after, created_at")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
          .limit(120),
        supabase
          .from("ai_generation_jobs")
          .select("id, model_id, prompt, status, error, credits_charged, created_at, completed_at")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

      if (profileResult.error || !profileResult.data) {
        return json(origin, 404, { error: "User not found" });
      }

      const totalCharged = Number(
        (jobsResult.data || []).reduce(
          (sum: number, row: any) => sum + Math.max(0, toFiniteNumber(row.credits_charged, 0)),
          0
        ).toFixed(4)
      );

      return json(origin, 200, {
        success: true,
        user: profileResult.data,
        recent_events: eventsResult.data || [],
        recent_transactions: txResult.data || [],
        recent_generations: jobsResult.data || [],
        generation_credits_total: totalCharged,
      });
    }

    if (action === "adjust-credits") {
      const targetUserId = String((body as Record<string, unknown>).user_id || "").trim();
      const amount = toFiniteInteger((body as Record<string, unknown>).amount, 0);
      const reason = String((body as Record<string, unknown>).reason || "").trim();

      if (!targetUserId) {
        return json(origin, 400, { error: "Missing required field: user_id" });
      }
      if (!amount) {
        return json(origin, 400, { error: "amount must be a non-zero integer" });
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, credits")
        .eq("id", targetUserId)
        .maybeSingle();

      if (profileError || !currentProfile) {
        return json(origin, 404, { error: "User not found" });
      }

      const currentCredits = toFiniteInteger(currentProfile.credits, 0);
      const nextCredits = currentCredits + amount;
      if (nextCredits < 0) {
        return json(origin, 400, { error: `Insufficient credits: current balance is ${currentCredits}` });
      }

      const nowIso = new Date().toISOString();
      const updateResult = await supabase
        .from("profiles")
        .update({
          credits: nextCredits,
          updated_at: nowIso,
        })
        .eq("id", targetUserId)
        .select("id, email, display_name, username, credits, is_suspended, is_admin")
        .maybeSingle();

      if (updateResult.error || !updateResult.data) {
        console.error("[kiara-admin] failed to update credits:", updateResult.error);
        return json(origin, 500, { error: "Failed to update credits" });
      }

      const txDescription = reason || `Admin credit adjustment by ${user.email || user.id}`;

      const { error: txError } = await supabase.from("credit_transactions").insert({
        user_id: targetUserId,
        amount,
        transaction_type: "admin",
        description: txDescription,
        balance_after: nextCredits,
        metadata: {
          admin_user_id: user.id,
          admin_email: user.email || null,
        },
      });

      if (txError) {
        console.error("[kiara-admin] failed to insert credit transaction:", txError);
      }

      const { error: auditError } = await supabase.from("admin_audit_logs").insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "adjust_credits",
        details: {
          amount,
          previous_balance: currentCredits,
          new_balance: nextCredits,
          reason: reason || null,
        },
      });

      if (auditError) {
        console.error("[kiara-admin] failed to insert audit log:", auditError);
      }

      return json(origin, 200, {
        success: true,
        user: updateResult.data,
        previous_credits: currentCredits,
        new_credits: nextCredits,
      });
    }

    if (action === "set-user-suspension") {
      const targetUserId = String((body as Record<string, unknown>).user_id || "").trim();
      const suspended = Boolean((body as Record<string, unknown>).is_suspended);
      const reasonRaw = String((body as Record<string, unknown>).reason || "").trim();
      const reason = reasonRaw.length > 0 ? reasonRaw : null;

      if (!targetUserId) {
        return json(origin, 400, { error: "Missing required field: user_id" });
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          is_suspended: suspended,
          suspension_reason: suspended ? reason : null,
          suspended_at: suspended ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId)
        .select("id, email, display_name, username, is_suspended, suspension_reason, suspended_at, credits, is_admin")
        .maybeSingle();

      if (updateError || !updatedProfile) {
        console.error("[kiara-admin] failed to update suspension:", updateError);
        return json(origin, 500, { error: "Failed to update user suspension" });
      }

      const { error: auditError } = await supabase.from("admin_audit_logs").insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "set_user_suspension",
        details: {
          is_suspended: suspended,
          reason,
        },
      });

      if (auditError) {
        console.error("[kiara-admin] failed to insert suspension audit log:", auditError);
      }

      return json(origin, 200, {
        success: true,
        user: updatedProfile,
      });
    }

    if (action === "set-user-admin") {
      const targetUserId = String((body as Record<string, unknown>).user_id || "").trim();
      const makeAdmin = Boolean((body as Record<string, unknown>).is_admin);

      if (!targetUserId) {
        return json(origin, 400, { error: "Missing required field: user_id" });
      }

      if (targetUserId === user.id && !makeAdmin) {
        return json(origin, 400, { error: "You cannot remove your own admin access" });
      }

      if (!makeAdmin) {
        const { count: adminCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_admin", true);

        if ((adminCount || 0) <= 1) {
          return json(origin, 400, { error: "Cannot remove the last admin" });
        }
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          is_admin: makeAdmin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId)
        .select("id, email, display_name, username, is_admin, is_suspended, credits")
        .maybeSingle();

      if (updateError || !updatedProfile) {
        console.error("[kiara-admin] failed to update admin role:", updateError);
        return json(origin, 500, { error: "Failed to update admin role" });
      }

      const { error: auditError } = await supabase.from("admin_audit_logs").insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "set_user_admin",
        details: {
          is_admin: makeAdmin,
        },
      });

      if (auditError) {
        console.error("[kiara-admin] failed to insert admin role audit log:", auditError);
      }

      return json(origin, 200, {
        success: true,
        user: updatedProfile,
      });
    }

    return json(origin, 400, { error: `Unsupported action: ${action}` });
  } catch (error: any) {
    console.error("[kiara-admin] unhandled error:", error);
    return json(origin, 500, { error: error?.message || "Internal server error" });
  }
});
