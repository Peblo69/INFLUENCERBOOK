// Edge Function: kiara-trends
// Fetches trending content from TikTok, Reddit, Instagram, YouTube via EnsembleData API
// Used to inject real-time trend context into Kiara's system prompt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ENSEMBLE_API_KEY = Deno.env.get("ENSEMBLE_DATA_API_KEY") ?? "";
const ENSEMBLE_BASE = "https://ensembledata.com/apis";

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

// Helper to call EnsembleData with timeout
const edFetch = async (
  path: string,
  params: Record<string, string | number> = {},
  timeoutMs = 30000
) => {
  const url = new URL(`${ENSEMBLE_BASE}${path}`);
  url.searchParams.set("token", ENSEMBLE_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[kiara-trends] EnsembleData ${path} error:`, JSON.stringify(data));
      return null;
    }
    return data;
  } catch (err) {
    console.error(`[kiara-trends] Fetch ${path} failed:`, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// Extract key info from TikTok posts
// Response shape: data.data[] → each has aweme_info.{desc, author, statistics}
const parseTikTokPosts = (data: any): any[] => {
  const items = data?.data?.data || data?.data || [];
  const arr = Array.isArray(items) ? items : [];
  return arr.slice(0, 10).map((item: any) => {
    const p = item.aweme_info || item; // unwrap aweme_info if present
    return {
      platform: "tiktok",
      desc: (p.desc || p.title || "").substring(0, 200),
      author: p.author?.nickname || p.author?.unique_id || "",
      plays: p.statistics?.play_count ?? p.stats?.playCount ?? 0,
      likes: p.statistics?.digg_count ?? p.stats?.diggCount ?? 0,
      comments: p.statistics?.comment_count ?? p.stats?.commentCount ?? 0,
      shares: p.statistics?.share_count ?? p.stats?.shareCount ?? 0,
    };
  });
};

// Extract key info from Reddit posts
// Response shape: data.posts[] → flat objects with title, subreddit, score, etc.
const parseRedditPosts = (data: any): any[] => {
  const posts = data?.data?.posts || data?.data?.children || data?.data || [];
  const arr = Array.isArray(posts) ? posts : [];
  return arr.slice(0, 10).map((p: any) => {
    const d = p.data || p; // unwrap .data if Reddit nested format
    return {
      platform: "reddit",
      title: (d.title || "").substring(0, 200),
      subreddit: d.subreddit || d.subreddit_name_prefixed || "",
      score: d.score || d.ups || 0,
      comments: d.num_comments || 0,
      author: d.author || "",
    };
  });
};

// Extract key info from Instagram search results
// Response shape: data.{hashtags[], users[], places[]} — search endpoint returns hashtags/users, not posts
const parseInstagramPosts = (data: any): any[] => {
  const results: any[] = [];
  // Parse hashtags
  const hashtags = data?.data?.hashtags || [];
  for (const h of (Array.isArray(hashtags) ? hashtags : []).slice(0, 5)) {
    const tag = h.hashtag || h;
    results.push({
      platform: "instagram",
      caption: `#${tag.name || ""}`,
      likes: tag.media_count || 0, // media_count as a proxy for popularity
      author: "",
      comments: 0,
    });
  }
  // Parse users
  const users = data?.data?.users || [];
  for (const u of (Array.isArray(users) ? users : []).slice(0, 5)) {
    const user = u.user || u;
    results.push({
      platform: "instagram",
      caption: user.full_name || user.username || "",
      author: user.username || "",
      likes: 0,
      comments: 0,
    });
  }
  return results.slice(0, 10);
};

// Extract key info from YouTube search results
// Response shape: data.posts[] → each has videoRenderer.{title, viewCountText, longBylineText}
const parseYouTubePosts = (data: any): any[] => {
  const posts = data?.data?.posts || data?.data || [];
  const arr = Array.isArray(posts) ? posts : [];
  return arr.slice(0, 10).map((p: any) => {
    const vr = p.videoRenderer || p;
    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || vr.title || "";
    const channel = vr.longBylineText?.runs?.[0]?.text || vr.ownerText?.runs?.[0]?.text || "";
    // viewCountText is like "14,962,194 views" — parse to number
    const viewsStr = vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || "0";
    const views = parseInt(String(viewsStr).replace(/[^0-9]/g, ""), 10) || 0;
    return {
      platform: "youtube",
      title: String(title).substring(0, 200),
      channel,
      views,
    };
  });
};

// Extract key info from Threads posts
// Response shape: data[] (array directly) or data.posts[]
const parseThreadsPosts = (data: any): any[] => {
  const posts = data?.data?.posts || data?.data?.threads || (Array.isArray(data?.data) ? data.data : []);
  const arr = Array.isArray(posts) ? posts : [];
  return arr.slice(0, 10).map((p: any) => ({
    platform: "threads",
    desc: (p.caption?.text || p.text || p.caption || "").substring(0, 200),
    author: p.user?.username || p.username || "",
    likes: p.like_count || p.likes || 0,
    comments: p.reply_count || p.comments || 0,
    shares: p.repost_count || p.shares || 0,
  }));
};

// Extract key info from Twitter/X tweets
// Response shape: data[] → each has content.itemContent.tweet_results.result
const parseTwitterPosts = (data: any): any[] => {
  const items = Array.isArray(data?.data) ? data.data : [];
  return items.slice(0, 10).map((item: any) => {
    // Drill into Twitter's deeply nested GraphQL structure
    const tweet = item.content?.itemContent?.tweet_results?.result || item;
    const legacy = tweet.legacy || tweet;
    const userLegacy = tweet.core?.user_results?.result?.legacy || {};
    return {
      platform: "twitter",
      desc: (legacy.full_text || legacy.text || "").substring(0, 200),
      author: userLegacy.screen_name || userLegacy.name || "",
      likes: legacy.favorite_count || 0,
      comments: legacy.reply_count || 0,
      shares: legacy.retweet_count || 0,
      views: parseInt(tweet.views?.count || "0", 10) || 0,
    };
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) return respond({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════════
    // ACTION: free-trends (NO API KEY NEEDED)
    // Fetches from Reddit's free public JSON API — zero cost
    // Used for auto-injection into Kiara's system prompt
    // ═══════════════════════════════════════════
    if (action === "free-trends") {
      const results: Record<string, any[]> = {};

      // Reddit r/all hot — completely free, no auth
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 10000);
        const res = await fetch("https://www.reddit.com/r/all/hot.json?limit=15&raw_json=1", {
          signal: controller.signal,
          headers: { "User-Agent": "KiaraAI/1.0 (trend context)" },
        });
        clearTimeout(t);
        if (res.ok) {
          const data = await res.json();
          const children = data?.data?.children || [];
          results.reddit = children.slice(0, 15).map((c: any) => {
            const p = c.data || c;
            return {
              platform: "reddit",
              title: (p.title || "").substring(0, 200),
              subreddit: p.subreddit || "",
              score: p.score || 0,
              comments: p.num_comments || 0,
              author: p.author || "",
            };
          });
        }
      } catch (err) {
        console.error("[kiara-trends] Reddit free fetch failed:", err);
      }

      const totalPosts = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      console.log(`[kiara-trends] Free trends: ${totalPosts} posts`);

      return respond({
        success: true,
        trends: results,
        fetched_at: new Date().toISOString(),
      });
    }

    // All actions below require EnsembleData API key
    if (!ENSEMBLE_API_KEY) {
      return respond({ error: "ENSEMBLE_DATA_API_KEY is not configured" }, 500);
    }

    // ═══════════════════════════════════════════
    // ACTION: fetch-trends (COSTS UNITS — EnsembleData)
    // Fetch trending content from multiple platforms in parallel
    // ═══════════════════════════════════════════
    if (action === "fetch-trends") {
      const platforms = body.platforms || ["tiktok", "reddit", "instagram"];
      const keyword = body.keyword || "trending";
      const rawTwitterId = String(body.twitter_id || body.twitter_user || "44196397");
      const twitterId = /^\d+$/.test(rawTwitterId) ? rawTwitterId : "44196397"; // Default: @elonmusk
      const results: Record<string, any[]> = {};

      const fetches: Promise<void>[] = [];

      if (platforms.includes("tiktok")) {
        fetches.push(
          edFetch("/tt/keyword/search", { name: keyword, period: "7" })
            .then((data) => {
              results.tiktok = parseTikTokPosts(data);
            })
        );
      }

      if (platforms.includes("reddit")) {
        const subreddit = body.subreddit || "all";
        fetches.push(
          edFetch("/reddit/subreddit/posts", { name: subreddit, sort: "hot", period: "day" })
            .then((data) => {
              results.reddit = parseRedditPosts(data);
            })
        );
      }

      if (platforms.includes("instagram")) {
        fetches.push(
          edFetch("/instagram/search", { text: keyword })
            .then((data) => {
              results.instagram = parseInstagramPosts(data);
            })
        );
      }

      if (platforms.includes("youtube")) {
        fetches.push(
          edFetch("/youtube/search", { keyword, depth: 1 })
            .then((data) => {
              results.youtube = parseYouTubePosts(data);
            })
        );
      }

      if (platforms.includes("threads")) {
        fetches.push(
          edFetch("/threads/keyword/search", { name: keyword })
            .then((data) => {
              results.threads = parseThreadsPosts(data);
            })
        );
      }

      if (platforms.includes("twitter")) {
        // Twitter has no keyword search — fetch tweets from a specified user ID
        fetches.push(
          edFetch("/twitter/user/tweets", { id: twitterId })
            .then((data) => {
              results.twitter = parseTwitterPosts(data);
            })
        );
      }

      await Promise.all(fetches);

      const totalPosts = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      console.log(`[kiara-trends] Fetched ${totalPosts} trending posts across ${Object.keys(results).length} platforms`);

      return respond({
        success: true,
        keyword,
        trends: results,
        fetched_at: new Date().toISOString(),
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: tiktok-hashtag
    // Search TikTok by specific hashtag
    // ═══════════════════════════════════════════
    if (action === "tiktok-hashtag") {
      const hashtag = body.hashtag;
      if (!hashtag) return respond({ error: "Missing required field: hashtag" }, 400);

      const data = await edFetch("/tt/hashtag/posts", { name: hashtag });
      return respond({
        success: true,
        platform: "tiktok",
        hashtag,
        posts: parseTikTokPosts(data),
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: reddit-hot
    // Get hot posts from a subreddit
    // ═══════════════════════════════════════════
    if (action === "reddit-hot") {
      const subreddit = body.subreddit || "popular";
      const data = await edFetch("/reddit/subreddit/posts", {
        name: subreddit,
        sort: body.sort || "hot",
        period: body.period || "day",
      });
      return respond({
        success: true,
        platform: "reddit",
        subreddit,
        posts: parseRedditPosts(data),
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: threads-search
    // Search Threads by keyword
    // ═══════════════════════════════════════════
    if (action === "threads-search") {
      const keyword = body.keyword;
      if (!keyword) return respond({ error: "Missing required field: keyword" }, 400);

      const data = await edFetch("/threads/keyword/search", { name: keyword });
      return respond({
        success: true,
        platform: "threads",
        keyword,
        posts: parseThreadsPosts(data),
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: threads-user
    // Get a Threads user's posts
    // ═══════════════════════════════════════════
    if (action === "threads-user") {
      const username = body.username;
      if (!username) return respond({ error: "Missing required field: username" }, 400);

      const data = await edFetch("/threads/user/posts", { username });
      return respond({
        success: true,
        platform: "threads",
        username,
        posts: parseThreadsPosts(data),
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: twitter-user
    // Get a Twitter/X user's tweets by numeric user ID
    // ═══════════════════════════════════════════
    if (action === "twitter-user") {
      const id = String(body.id || body.twitter_id || body.username || "");
      if (!id) return respond({ error: "Missing required field: id (numeric Twitter user ID)" }, 400);
      if (!/^\d+$/.test(id)) {
        return respond({ error: "Invalid id: twitter-user requires a numeric Twitter user ID" }, 400);
      }

      const data = await edFetch("/twitter/user/tweets", { id });
      return respond({
        success: true,
        platform: "twitter",
        id,
        posts: parseTwitterPosts(data),
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: search
    // Search a specific platform by keyword
    // ═══════════════════════════════════════════
    if (action === "search") {
      const platform = body.platform;
      const query = body.query;
      if (!platform || !query) {
        return respond({ error: "Missing required fields: platform, query" }, 400);
      }

      let data: any = null;
      let posts: any[] = [];

      if (platform === "tiktok") {
        data = await edFetch("/tt/keyword/search", { name: query, period: "7" });
        posts = parseTikTokPosts(data);
      } else if (platform === "instagram") {
        data = await edFetch("/instagram/search", { text: query });
        posts = parseInstagramPosts(data);
      } else if (platform === "youtube") {
        data = await edFetch("/youtube/search", { keyword: query, depth: 1 });
        posts = parseYouTubePosts(data);
      } else if (platform === "reddit") {
        data = await edFetch("/reddit/subreddit/posts", { name: query, sort: "hot" });
        posts = parseRedditPosts(data);
      } else if (platform === "threads") {
        data = await edFetch("/threads/keyword/search", { name: query });
        posts = parseThreadsPosts(data);
      } else if (platform === "twitter") {
        // Twitter only has user-based search, use query as numeric user ID
        data = await edFetch("/twitter/user/tweets", { id: query });
        posts = parseTwitterPosts(data);
      } else {
        return respond({ error: `Unsupported platform: ${platform}` }, 400);
      }

      return respond({
        success: true,
        platform,
        query,
        posts,
      });
    }

    return respond({ error: "Unknown action: " + action }, 400);
  } catch (error: any) {
    console.error("[kiara-trends] Error:", error);
    return respond({ error: error.message || "Internal server error" }, 500);
  }
});
