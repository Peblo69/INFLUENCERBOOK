import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/I18nContext";
import { Languages } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { useLocation } from "react-router-dom";
import { getKiaraBaseUrl } from "@/services/kiaraClient";

interface MemoryProfile {
  likes: string[];
  dislikes: string[];
  goals: string[];
  capabilities: string[];
  tone: string[];
}

interface MemoryProfileEditor {
  likes: string;
  dislikes: string;
  goals: string;
  capabilities: string;
  tone: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  plan: string;
  preferences: {
    theme: string;
    notifications: boolean;
    memory_enabled: boolean;
    auto_save: boolean;
    language: string;
    memory_profile?: MemoryProfile;
  };
}

interface MemoryStats {
  total: number;
  active: number;
}

interface MemoryRow {
  id: string;
  content: string;
  category: string | null;
  memory_type: string | null;
  importance: number | null;
  is_active: boolean;
  created_at: string;
  metadata: Record<string, any> | null;
}

export const SettingsPage = () => {
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState(location.pathname === "/memories" ? "memory" : "profile");
  const [memoryEditor, setMemoryEditor] = useState<MemoryProfileEditor>({
    likes: "",
    dislikes: "",
    goals: "",
    capabilities: "",
    tone: "",
  });
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({ total: 0, active: 0 });
  const [debugPrompt, setDebugPrompt] = useState("");
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugData, setDebugData] = useState<any | null>(null);
  const [memoryRows, setMemoryRows] = useState<MemoryRow[]>([]);
  const [memoryRowsLoading, setMemoryRowsLoading] = useState(false);
  const { language, setLanguage, languages } = useI18n();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (location.pathname === "/memories") {
      setActiveTab("memory");
    }
  }, [location.pathname]);

  const normalizeList = (value: unknown, limit = 20): string[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") continue;
      const normalized = item.trim().replace(/\s+/g, " ").slice(0, 180);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(normalized);
      if (out.length >= limit) break;
    }
    return out;
  };

  const parseEditorList = (raw: string): string[] => {
    return normalizeList(
      raw
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean),
      20
    );
  };

  const loadMemoryStats = async (userId: string) => {
    const [{ count: totalCount }, { count: activeCount }] = await Promise.all([
      supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true),
    ]);

    setMemoryStats({
      total: totalCount || 0,
      active: activeCount || 0,
    });
  };

  const loadMemoryRows = async (userId: string) => {
    setMemoryRowsLoading(true);
    try {
      const { data, error } = await supabase
        .from("memories")
        .select("id, content, category, memory_type, importance, is_active, created_at, metadata")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(40);

      if (error) throw error;
      setMemoryRows((data || []) as MemoryRow[]);
    } catch (error) {
      console.error("Error loading memory rows:", error);
    } finally {
      setMemoryRowsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);

      const memoryProfileRaw = (data?.preferences as any)?.memory_profile || {};
      const normalizedMemoryProfile = {
        likes: normalizeList(memoryProfileRaw.likes, 20),
        dislikes: normalizeList(memoryProfileRaw.dislikes, 20),
        goals: normalizeList(memoryProfileRaw.goals, 20),
        capabilities: normalizeList(memoryProfileRaw.capabilities, 20),
        tone: normalizeList(memoryProfileRaw.tone, 20),
      };
      setMemoryEditor({
        likes: normalizedMemoryProfile.likes.join("\n"),
        dislikes: normalizedMemoryProfile.dislikes.join("\n"),
        goals: normalizedMemoryProfile.goals.join("\n"),
        capabilities: normalizedMemoryProfile.capabilities.join("\n"),
        tone: normalizedMemoryProfile.tone.join("\n"),
      });
      await loadMemoryStats(user.id);
      await loadMemoryRows(user.id);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setMessage("✅ Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          preferences: profile.preferences,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setMessage("✅ Preferences saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMemoryProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const normalizedMemoryProfile = {
        likes: parseEditorList(memoryEditor.likes),
        dislikes: parseEditorList(memoryEditor.dislikes),
        goals: parseEditorList(memoryEditor.goals),
        capabilities: parseEditorList(memoryEditor.capabilities),
        tone: parseEditorList(memoryEditor.tone),
      };

      const nextPreferences = {
        ...(profile.preferences || {}),
        memory_profile: {
          likes: normalizedMemoryProfile.likes,
          dislikes: normalizedMemoryProfile.dislikes,
          goals: normalizedMemoryProfile.goals,
          capabilities: normalizedMemoryProfile.capabilities,
          tone: normalizedMemoryProfile.tone,
          updated_at: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from("profiles")
        .update({ preferences: nextPreferences })
        .eq("id", profile.id);

      if (error) throw error;

      setMemoryEditor({
        likes: normalizedMemoryProfile.likes.join("\n"),
        dislikes: normalizedMemoryProfile.dislikes.join("\n"),
        goals: normalizedMemoryProfile.goals.join("\n"),
        capabilities: normalizedMemoryProfile.capabilities.join("\n"),
        tone: normalizedMemoryProfile.tone.join("\n"),
      });
      setProfile({ ...profile, preferences: nextPreferences });
      setMessage("✅ Memory profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      console.error("Error updating memory profile:", error);
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllMemories = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("user_id", profile.id);
      if (error) throw error;
      await loadMemoryStats(profile.id);
      await loadMemoryRows(profile.id);
      setDebugData(null);
      setMessage("✅ All memories cleared.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      console.error("Error clearing memories:", error);
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const runRetrievalDebug = async () => {
    const prompt = debugPrompt.trim();
    if (!prompt) return;
    setDebugLoading(true);
    setDebugData(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${getKiaraBaseUrl()}/retrieve-memories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          ...(anonKey ? { apikey: anonKey } : {}),
        },
        body: JSON.stringify({
          userMessage: prompt,
          maxMemories: 8,
          cooldownHours: 12,
          useSemanticSearch: true,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `Debug retrieval failed (${res.status})`);
      }
      setDebugData(json);
    } catch (error: any) {
      console.error("Debug retrieval error:", error);
      setMessage("❌ " + error.message);
      setTimeout(() => setMessage(""), 3500);
    } finally {
      setDebugLoading(false);
    }
  };

  const toggleMemoryActive = async (memoryId: string, nextActive: boolean) => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from("memories")
        .update({ is_active: nextActive })
        .eq("id", memoryId)
        .eq("user_id", profile.id);
      if (error) throw error;

      setMemoryRows((prev) =>
        prev.map((row) => (row.id === memoryId ? { ...row, is_active: nextActive } : row))
      );
      await loadMemoryStats(profile.id);
    } catch (error) {
      console.error("Error toggling memory status:", error);
    }
  };

  const deleteMemoryRow = async (memoryId: string) => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", memoryId)
        .eq("user_id", profile.id);
      if (error) throw error;

      setMemoryRows((prev) => prev.filter((row) => row.id !== memoryId));
      await loadMemoryStats(profile.id);
    } catch (error) {
      console.error("Error deleting memory row:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading settings...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Please log in to access settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Manage your account and preferences</p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.startsWith("✅") ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "profile" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Profile</span>
              </button>

              <button
                onClick={() => setActiveTab("preferences")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "preferences" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="font-medium">Preferences</span>
              </button>

              <button
                onClick={() => setActiveTab("memory")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "memory" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-medium">Memory System</span>
              </button>

              <button
                onClick={() => setActiveTab("account")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === "account" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Account</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Profile Information</h2>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.full_name || ""}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500/50 transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email || ""}
                      disabled
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/60 cursor-not-allowed"
                    />
                    <p className="text-xs text-white/50 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={profile.avatar_url || ""}
                      onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500/50 transition-all"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Preferences</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <div className="text-white font-medium">Enable Notifications</div>
                        <div className="text-sm text-white/60">Receive updates about your generations</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.preferences.notifications}
                          onChange={(e) => setProfile({
                            ...profile,
                            preferences: { ...profile.preferences, notifications: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <div className="text-white font-medium">Memory System</div>
                        <div className="text-sm text-white/60">Remember your preferences and context</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.preferences.memory_enabled}
                          onChange={(e) => setProfile({
                            ...profile,
                            preferences: { ...profile.preferences, memory_enabled: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <div className="text-white font-medium">Auto-Save</div>
                        <div className="text-sm text-white/60">Automatically save your work</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.preferences.auto_save}
                          onChange={(e) => setProfile({
                            ...profile,
                            preferences: { ...profile.preferences, auto_save: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <Languages size={18} className="text-zinc-400" />
                        <div>
                          <div className="text-white font-medium">Language</div>
                          <div className="text-sm text-white/60">Choose your preferred language</div>
                        </div>
                      </div>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50 transition-all cursor-pointer"
                      >
                        {languages.map((option) => (
                          <option key={option.code} value={option.code} className="bg-zinc-900 text-zinc-200">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              )}

              {/* Memory Tab */}
              {activeTab === "memory" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Memory System</h2>
                    <p className="text-white/60">Control memory profile, contradictions, and retrieval quality.</p>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-purple-300">
                        <strong>How it works:</strong> Kiara automatically extracts and stores important information from your conversations, like your name, preferences, and projects. This helps provide more personalized responses.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-2xl font-bold text-white mb-1">{memoryStats.total}</div>
                      <div className="text-sm text-white/60">Total Memories</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-2xl font-bold text-white mb-1">{memoryStats.active}</div>
                      <div className="text-sm text-white/60">Active Memories</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Memory Profile Editor</h3>
                    <p className="text-sm text-white/60">
                      One line per item. These are injected as high-priority user profile signals.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Likes</label>
                        <textarea
                          value={memoryEditor.likes}
                          onChange={(e) => setMemoryEditor((prev) => ({ ...prev, likes: e.target.value }))}
                          className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500/50"
                          placeholder={"short answers\nconcrete steps\nclean UI"}
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Dislikes</label>
                        <textarea
                          value={memoryEditor.dislikes}
                          onChange={(e) => setMemoryEditor((prev) => ({ ...prev, dislikes: e.target.value }))}
                          className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500/50"
                          placeholder={"long delays\ngeneric filler\nlow-detail outputs"}
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Goals</label>
                        <textarea
                          value={memoryEditor.goals}
                          onChange={(e) => setMemoryEditor((prev) => ({ ...prev, goals: e.target.value }))}
                          className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500/50"
                          placeholder={"faster page switching\npremium UX"}
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Capabilities</label>
                        <textarea
                          value={memoryEditor.capabilities}
                          onChange={(e) => setMemoryEditor((prev) => ({ ...prev, capabilities: e.target.value }))}
                          className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500/50"
                          placeholder={"React\nTypeScript\nSupabase"}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Tone Preferences</label>
                      <textarea
                        value={memoryEditor.tone}
                        onChange={(e) => setMemoryEditor((prev) => ({ ...prev, tone: e.target.value }))}
                        className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500/50"
                        placeholder={"direct and pragmatic\nno fluff\nhigh technical precision"}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSaveMemoryProfile}
                      disabled={saving}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-60 text-white font-medium rounded-lg transition-all"
                    >
                      {saving ? "Saving..." : "Save Memory Profile"}
                    </button>
                    <button
                      onClick={handleClearAllMemories}
                      disabled={saving}
                      className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-60 text-red-200 font-medium rounded-lg transition-all"
                    >
                      Clear All Memories
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <h3 className="text-lg font-semibold text-white">Stored Memory Entries</h3>
                    <p className="text-sm text-white/60">Quick control over active/inactive memory rows used in retrieval.</p>

                    {memoryRowsLoading ? (
                      <div className="text-sm text-white/50">Loading memories...</div>
                    ) : memoryRows.length === 0 ? (
                      <div className="text-sm text-white/50">No memory rows yet. Start chatting and extraction will populate this.</div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {memoryRows.map((row) => (
                          <div key={row.id} className="p-3 rounded-lg border border-white/10 bg-white/[0.03]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-white/85 break-words">{row.content}</div>
                                <div className="text-[11px] text-white/45 mt-1 uppercase tracking-[0.1em]">
                                  {(row.category || row.memory_type || "general")} | imp {Number(row.importance ?? 0).toFixed(2)} | {row.is_active ? "active" : "inactive"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => toggleMemoryActive(row.id, !row.is_active)}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                  {row.is_active ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  onClick={() => deleteMemoryRow(row.id)}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/30 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <h3 className="text-lg font-semibold text-white">Retrieval Debug Panel</h3>
                    <p className="text-sm text-white/60">Test what memories are retrieved and why for a given prompt.</p>
                    <div className="flex gap-2">
                      <input
                        value={debugPrompt}
                        onChange={(e) => setDebugPrompt(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500/50"
                        placeholder="Type a sample prompt for retrieval analysis..."
                      />
                      <button
                        onClick={runRetrievalDebug}
                        disabled={debugLoading || !debugPrompt.trim()}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg transition-all"
                      >
                        {debugLoading ? "Running..." : "Run"}
                      </button>
                    </div>

                    {debugData && (
                      <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2">
                        <div className="text-xs uppercase tracking-widest text-white/50">
                          Strategy: {debugData.search_strategy || "none"} • Count: {debugData.count || 0}
                        </div>
                        {(debugData.memories || []).length === 0 ? (
                          <div className="text-sm text-white/55">No memories selected for this prompt.</div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {(debugData.memories || []).map((item: any, index: number) => (
                              <div key={`${item.id || index}-${index}`} className="p-2 rounded-md border border-white/10 bg-white/[0.03]">
                                <div className="text-sm text-white/85">{item.content}</div>
                                <div className="text-[11px] text-white/50 mt-1 uppercase tracking-[0.1em]">
                                  {(item.category || item.type || "general")} • conf {Number(item.confidence ?? item.importance ?? 0).toFixed(2)} • {item.reason || "selected"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Account Details</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-sm text-white/60 mb-1">Current Plan</div>
                      <div className="text-lg font-bold text-white uppercase">{profile.plan}</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-sm text-white/60 mb-1">Credits</div>
                      <div className="text-lg font-bold text-white">{profile.credits.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-yellow-300">
                        <strong>Need more credits?</strong> Upgrade your plan or purchase additional credits to continue creating.
                      </div>
                    </div>
                  </div>

                  <a
                    href="/billing"
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all"
                  >
                    Upgrade Plan
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
