// Trend context service — fetches real-time trends for Kiara's system prompt
// Uses FREE public APIs only (Reddit JSON via edge function proxy)
// EnsembleData reserved for on-demand user-triggered searches only (costs units)

import { type TrendPost } from "@/services/kiaraGateway";
import { kiaraRequest } from "@/services/kiaraClient";

let cachedTrends: { data: string; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/** Format trend posts into a concise text block for the LLM system prompt */
export const formatTrendPost = (post: TrendPost): string => {
  if (post.platform === "tiktok") {
    const engagement = [
      post.plays ? `${formatNum(post.plays)} plays` : "",
      post.likes ? `${formatNum(post.likes)} likes` : "",
    ].filter(Boolean).join(", ");
    return `[TikTok] ${post.desc || "No description"} — @${post.author || "unknown"} (${engagement})`;
  }
  if (post.platform === "reddit") {
    return `[Reddit r/${post.subreddit}] ${post.title || "No title"} — ${formatNum(post.score || 0)} upvotes, ${post.comments || 0} comments`;
  }
  if (post.platform === "instagram") {
    if (post.author) {
      return `[Instagram] ${post.caption || post.author} — @${post.author} (${formatNum(post.likes || 0)} posts)`;
    }
    return `[Instagram] ${post.caption || "No caption"} (${formatNum(post.likes || 0)} posts)`;
  }
  if (post.platform === "youtube") {
    return `[YouTube] ${post.title || "No title"} — ${post.channel || "unknown"} (${formatNum(post.views || 0)} views)`;
  }
  if (post.platform === "threads") {
    return `[Threads] ${post.desc || "No text"} — @${post.author || "unknown"} (${formatNum(post.likes || 0)} likes, ${post.comments || 0} replies)`;
  }
  if (post.platform === "twitter") {
    const engagement = [
      post.likes ? `${formatNum(post.likes)} likes` : "",
      post.shares ? `${formatNum(post.shares)} RTs` : "",
      post.views ? `${formatNum(post.views)} views` : "",
    ].filter(Boolean).join(", ");
    return `[X/Twitter] ${post.desc || "No text"} — @${post.author || "unknown"} (${engagement})`;
  }
  return `[${post.platform}] ${post.desc || post.title || post.caption || ""}`;
};

const formatNum = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

interface FreeTrendsResponse {
  success: boolean;
  trends?: Record<string, TrendPost[]>;
  fetched_at?: string;
}

/**
 * Get formatted trend context for injection into Kiara's system prompt.
 * Uses the FREE "free-trends" edge function action (Reddit public JSON).
 * Zero EnsembleData units burned. Caches for 30 minutes.
 */
export const getTrendContext = async (): Promise<string> => {
  // Return cached if fresh
  if (cachedTrends && Date.now() - cachedTrends.fetchedAt < CACHE_TTL) {
    return cachedTrends.data;
  }

  try {
    // Calls edge function with action "free-trends" — hits Reddit free JSON, no API key needed
    const result = await kiaraRequest<FreeTrendsResponse>("kiara-trends", {
      action: "free-trends",
    });

    if (!result.success || !result.trends) return cachedTrends?.data || "";

    const lines: string[] = [];
    lines.push("=== REAL-TIME TRENDING CONTENT ===");
    lines.push(`(fetched ${new Date().toLocaleTimeString()})`);

    for (const [platform, posts] of Object.entries(result.trends)) {
      if (!posts || posts.length === 0) continue;
      lines.push("");
      lines.push(`--- ${platform.toUpperCase()} HOT ---`);
      for (const post of posts.slice(0, 10)) {
        lines.push(formatTrendPost(post));
      }
    }

    const context = lines.join("\n");
    cachedTrends = { data: context, fetchedAt: Date.now() };
    return context;
  } catch (err) {
    console.error("[trendService] Failed to fetch free trends:", err);
    return cachedTrends?.data || "";
  }
};

/** Force-clear the trend cache */
export const clearTrendCache = () => {
  cachedTrends = null;
};
