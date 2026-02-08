import { supabase } from "@/lib/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const getKiaraBaseUrl = () => {
  const override = import.meta.env.VITE_KIARA_API_BASE as string | undefined;
  if (override && override.trim().length > 0) {
    return override.replace(/\/$/, "");
  }
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
};

const getAuthHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return `Bearer ${session.access_token}`;
};

export const kiaraRequest = async <T>(
  endpoint: string,
  body: unknown,
  init: RequestInit = {}
): Promise<T> => {
  const baseUrl = getKiaraBaseUrl();
  const authHeader = await getAuthHeader();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout

  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      ...(supabaseAnonKey ? { "apikey": supabaseAnonKey } : {}),
      ...(init.headers || {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
    ...init,
  });

  clearTimeout(timeoutId);

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return data as T;
};
