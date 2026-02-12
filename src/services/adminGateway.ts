import { kiaraRequest } from "@/services/kiaraClient";

export interface AdminUserSummary {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  credits: number;
  plan: string | null;
  plan_status: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  total_images_generated: number;
  total_loras_trained: number;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
}

export interface AdminDashboard {
  window_hours: number;
  users: {
    total: number;
    new_in_window: number;
    suspended: number;
    admins: number;
    active_in_window: number;
  };
  activity: {
    events_in_window: number;
  };
  generations: {
    total_in_window: number;
    vision_in_window: number;
    success_count: number;
    failed_count: number;
    credits_charged_in_window: number;
    top_models: Array<{ model: string; count: number }>;
  };
  recent_events: AdminEvent[];
}

export interface AdminEvent {
  id: string;
  user_id: string;
  event_type: string;
  path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: string;
    email: string | null;
    display_name: string | null;
    username: string | null;
  } | null;
}

export interface AdminTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  balance_after: number;
  created_at: string;
}

export interface AdminGeneration {
  id: string;
  model_id: string;
  prompt: string;
  status: string;
  error: string | null;
  credits_charged: number;
  created_at: string;
  completed_at: string | null;
}

export interface AdminUserDetail {
  user: AdminUserSummary & {
    full_name: string | null;
  };
  recent_events: AdminEvent[];
  recent_transactions: AdminTransaction[];
  recent_generations: AdminGeneration[];
  generation_credits_total: number;
}

export interface AssistantLatencyMetricRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  request_mode: "stream" | "non_stream";
  api_mode: "chat_completions" | "responses";
  model: string;
  web_search_enabled: boolean;
  memory_enabled: boolean;
  memory_strategy: string | null;
  memory_retrieved_count: number;
  used_responses_api: boolean;
  request_chars: number;
  response_chars: number | null;
  tool_count: number;
  auth_ms: number;
  profile_ms: number;
  memory_ms: number;
  upstream_ms: number;
  total_ms: number;
  status: "success" | "upstream_error" | "error";
  http_status: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: string;
    email: string | null;
    display_name: string | null;
    username: string | null;
  } | null;
}

export interface AssistantLatencyMetricsSummary {
  total_requests: number;
  success_count: number;
  upstream_error_count: number;
  error_count: number;
  success_rate: number;
  p50_total_ms: number;
  p95_total_ms: number;
  avg_total_ms: number;
  web_search_rate: number;
  responses_api_rate: number;
  memory_timeout_count: number;
}

export const getAdminDashboard = async (hours = 24): Promise<AdminDashboard> => {
  const response = await kiaraRequest<{ success: boolean; dashboard: AdminDashboard }>("kiara-admin", {
    action: "dashboard",
    hours,
  });
  return response.dashboard;
};

export const listAdminUsers = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ users: AdminUserSummary[]; page: number; total: number; totalPages: number }> => {
  const response = await kiaraRequest<{
    success: boolean;
    users: AdminUserSummary[];
    pagination: { page: number; page_size: number; total: number; total_pages: number };
  }>("kiara-admin", {
    action: "users",
    page: params?.page ?? 1,
    page_size: params?.pageSize ?? 25,
    search: params?.search ?? "",
  });

  return {
    users: response.users || [],
    page: response.pagination?.page || 1,
    total: response.pagination?.total || 0,
    totalPages: response.pagination?.total_pages || 1,
  };
};

export const getAdminUserDetail = async (userId: string): Promise<AdminUserDetail> => {
  const response = await kiaraRequest<{
    success: boolean;
    user: AdminUserDetail["user"];
    recent_events: AdminEvent[];
    recent_transactions: AdminTransaction[];
    recent_generations: AdminGeneration[];
    generation_credits_total: number;
  }>("kiara-admin", {
    action: "user-detail",
    user_id: userId,
  });

  return {
    user: response.user,
    recent_events: response.recent_events || [],
    recent_transactions: response.recent_transactions || [],
    recent_generations: response.recent_generations || [],
    generation_credits_total: response.generation_credits_total || 0,
  };
};

export const listAdminEvents = async (params?: {
  limit?: number;
  eventType?: string;
}): Promise<AdminEvent[]> => {
  const response = await kiaraRequest<{ success: boolean; events: AdminEvent[] }>("kiara-admin", {
    action: "recent-events",
    limit: params?.limit ?? 100,
    event_type: params?.eventType ?? "",
  });
  return response.events || [];
};

export const adjustAdminUserCredits = async (params: {
  userId: string;
  amount: number;
  reason?: string;
}): Promise<{ user: AdminUserSummary; previousCredits: number; newCredits: number }> => {
  const response = await kiaraRequest<{
    success: boolean;
    user: AdminUserSummary;
    previous_credits: number;
    new_credits: number;
  }>("kiara-admin", {
    action: "adjust-credits",
    user_id: params.userId,
    amount: Math.trunc(params.amount),
    reason: params.reason ?? "",
  });

  return {
    user: response.user,
    previousCredits: response.previous_credits,
    newCredits: response.new_credits,
  };
};

export const setAdminUserSuspension = async (params: {
  userId: string;
  suspended: boolean;
  reason?: string;
}): Promise<AdminUserSummary> => {
  const response = await kiaraRequest<{ success: boolean; user: AdminUserSummary }>("kiara-admin", {
    action: "set-user-suspension",
    user_id: params.userId,
    is_suspended: params.suspended,
    reason: params.reason ?? "",
  });
  return response.user;
};

export const setAdminUserRole = async (params: {
  userId: string;
  isAdmin: boolean;
}): Promise<AdminUserSummary> => {
  const response = await kiaraRequest<{ success: boolean; user: AdminUserSummary }>("kiara-admin", {
    action: "set-user-admin",
    user_id: params.userId,
    is_admin: params.isAdmin,
  });
  return response.user;
};

export const getAssistantLatencyMetrics = async (params?: {
  hours?: number;
  limit?: number;
}): Promise<{
  windowHours: number;
  metrics: AssistantLatencyMetricsSummary;
  recent: AssistantLatencyMetricRow[];
}> => {
  const response = await kiaraRequest<{
    success: boolean;
    window_hours: number;
    metrics: AssistantLatencyMetricsSummary;
    recent: AssistantLatencyMetricRow[];
  }>("kiara-admin", {
    action: "assistant-metrics",
    hours: params?.hours ?? 24,
    limit: params?.limit ?? 250,
  });

  return {
    windowHours: response.window_hours,
    metrics: response.metrics,
    recent: response.recent || [],
  };
};
