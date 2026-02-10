import { supabase } from "@/lib/supabase";

const PAGE_VIEW_THROTTLE_MS = 8000;
const EVENT_THROTTLE_MS = 2000;

const lastEventAt = new Map<string, number>();

export const trackActivity = async (
  eventType: string,
  options?: {
    path?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> => {
  const normalizedEvent = String(eventType || "").trim();
  if (!normalizedEvent) return;

  const path = options?.path || null;
  const key = `${normalizedEvent}:${path || ""}`;
  const now = Date.now();
  const minInterval = normalizedEvent === "page_view" ? PAGE_VIEW_THROTTLE_MS : EVENT_THROTTLE_MS;

  const previous = lastEventAt.get(key) || 0;
  if (now - previous < minInterval) {
    return;
  }
  lastEventAt.set(key, now);

  try {
    await supabase.rpc("track_user_activity", {
      p_event_type: normalizedEvent,
      p_path: path,
      p_metadata: options?.metadata || {},
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[activity] track_user_activity failed", error);
    }
  }
};
