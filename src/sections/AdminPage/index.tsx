import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModelsSidebar } from "@/sections/ModelsPage/components/ModelsSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/components/Notification";
import { supabase } from "@/lib/supabase";
import {
  adjustAdminUserCredits,
  getAdminDashboard,
  getAdminUserDetail,
  listAdminEvents,
  listAdminUsers,
  setAdminUserRole,
  setAdminUserSuspension,
  type AdminDashboard,
  type AdminEvent,
  type AdminUserDetail,
  type AdminUserSummary,
} from "@/services/adminGateway";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
};

const fmtCompact = (value: number) => value.toLocaleString();

export const AdminPage = () => {
  const { profile, loading } = useAuth();
  const { showNotification } = useNotifications();

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [creditDelta, setCreditDelta] = useState<Record<string, string>>({});
  const [creditReason, setCreditReason] = useState<Record<string, string>>({});
  const [suspensionReason, setSuspensionReason] = useState<Record<string, string>>({});
  const [realtimeStatus, setRealtimeStatus] = useState<string>("idle");

  const isAdmin = Boolean(profile?.is_admin);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const data = await getAdminDashboard(24);
      setDashboard(data);
    } catch (error: any) {
      showNotification(error?.message || "Failed to load admin dashboard", "error", "Admin");
    } finally {
      setLoadingDashboard(false);
    }
  }, [showNotification]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const result = await listAdminUsers({
        page,
        pageSize: 25,
        search: searchQuery,
      });
      setUsers(result.users);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      showNotification(error?.message || "Failed to load users", "error", "Admin");
    } finally {
      setLoadingUsers(false);
    }
  }, [page, searchQuery, showNotification]);

  const loadEvents = useCallback(async () => {
    try {
      const result = await listAdminEvents({ limit: 80 });
      setEvents(result);
    } catch (error: any) {
      showNotification(error?.message || "Failed to load events", "warning", "Admin");
    }
  }, [showNotification]);

  const loadUserDetail = useCallback(
    async (userId: string) => {
      setLoadingDetail(true);
      try {
        const detail = await getAdminUserDetail(userId);
        setSelectedUserDetail(detail);
      } catch (error: any) {
        showNotification(error?.message || "Failed to load user details", "error", "Admin");
      } finally {
        setLoadingDetail(false);
      }
    },
    [showNotification]
  );

  // Stable refs so realtime subscription doesn't re-subscribe on every render
  const loadDashboardRef = useRef(loadDashboard);
  const loadEventsRef = useRef(loadEvents);
  const loadUserDetailRef = useRef(loadUserDetail);
  const selectedUserIdRef = useRef(selectedUserId);
  loadDashboardRef.current = loadDashboard;
  loadEventsRef.current = loadEvents;
  loadUserDetailRef.current = loadUserDetail;
  selectedUserIdRef.current = selectedUserId;

  useEffect(() => {
    if (!isAdmin) return;
    void Promise.all([loadDashboard(), loadEvents(), loadUsers()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedUserId) return;
    void loadUserDetail(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedUserId]);

  useEffect(() => {
    if (!isAdmin) return;

    let refreshTimeout: number | undefined;
    const channel = supabase
      .channel("admin-activity-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_activity_events",
        },
        () => {
          window.clearTimeout(refreshTimeout);
          refreshTimeout = window.setTimeout(() => {
            void loadDashboardRef.current();
            void loadEventsRef.current();
            const uid = selectedUserIdRef.current;
            if (uid) void loadUserDetailRef.current(uid);
          }, 3000); // 3s debounce to avoid request storms
        }
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
      });

    return () => {
      window.clearTimeout(refreshTimeout);
      void supabase.removeChannel(channel);
    };
  }, [isAdmin]); // stable dep — only subscribe once

  const selectedSummary = useMemo(
    () => users.find((row) => row.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const handleRefreshAll = async () => {
    await Promise.all([loadDashboard(), loadUsers(), loadEvents()]);
    if (selectedUserId) {
      await loadUserDetail(selectedUserId);
    }
    showNotification("Admin data refreshed", "success", "Admin");
  };

  const handleCreditAdjust = async (userId: string) => {
    const deltaRaw = creditDelta[userId] || "";
    const delta = Number(deltaRaw);
    if (!Number.isFinite(delta) || delta === 0) {
      showNotification("Enter a non-zero credit amount", "warning", "Admin");
      return;
    }

    setBusyUserId(userId);
    try {
      const result = await adjustAdminUserCredits({
        userId,
        amount: Math.trunc(delta),
        reason: creditReason[userId] || "",
      });

      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, credits: result.newCredits } : user))
      );
      setCreditDelta((prev) => ({ ...prev, [userId]: "" }));
      setCreditReason((prev) => ({ ...prev, [userId]: "" }));

      if (selectedUserId === userId) {
        await loadUserDetail(userId);
      }
      await loadDashboard();
      showNotification("Credits updated", "success", "Admin");
    } catch (error: any) {
      showNotification(error?.message || "Failed to adjust credits", "error", "Admin");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleSuspension = async (user: AdminUserSummary) => {
    const nextSuspended = !user.is_suspended;
    const reason = suspensionReason[user.id] || "";

    if (nextSuspended && !reason.trim()) {
      showNotification("Add a suspension reason before suspending", "warning", "Admin");
      return;
    }

    setBusyUserId(user.id);
    try {
      const updated = await setAdminUserSuspension({
        userId: user.id,
        suspended: nextSuspended,
        reason,
      });

      setUsers((prev) => prev.map((row) => (row.id === user.id ? { ...row, ...updated } : row)));
      if (selectedUserId === user.id) {
        await loadUserDetail(user.id);
      }
      await loadDashboard();
      showNotification(nextSuspended ? "User suspended" : "User unsuspended", "success", "Admin");
    } catch (error: any) {
      showNotification(error?.message || "Failed to update suspension", "error", "Admin");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleAdmin = async (user: AdminUserSummary) => {
    const nextAdmin = !user.is_admin;
    setBusyUserId(user.id);
    try {
      const updated = await setAdminUserRole({ userId: user.id, isAdmin: nextAdmin });
      setUsers((prev) => prev.map((row) => (row.id === user.id ? { ...row, ...updated } : row)));
      if (selectedUserId === user.id) {
        await loadUserDetail(user.id);
      }
      await loadDashboard();
      showNotification(nextAdmin ? "Admin access granted" : "Admin access removed", "success", "Admin");
    } catch (error: any) {
      showNotification(error?.message || "Failed to update admin role", "error", "Admin");
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading && !profile) {
    return (
      <main className="h-screen bg-black text-white flex items-center justify-center">
        <span className="text-white/60 text-sm">Loading admin access...</span>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-xl rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Admin access required</h1>
          <p className="mt-3 text-sm text-white/60">
            This panel is restricted to administrators. Ask an existing admin to grant your account access.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-black text-white font-sans">
      <div className="h-full flex">
        <ModelsSidebar />

        <section className="flex-1 min-w-0 overflow-auto">
          <div className="px-8 py-7 border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Admin Control Plane</h1>
                <p className="text-xs text-white/50 mt-1">
                  Realtime status: <span className="text-emerald-400 uppercase">{realtimeStatus}</span>
                </p>
              </div>
              <button
                onClick={handleRefreshAll}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={fmtCompact(dashboard?.users.total || 0)}
                sub={`+${fmtCompact(dashboard?.users.new_in_window || 0)} in 24h`}
                loading={loadingDashboard}
              />
              <StatCard
                label="Active (24h)"
                value={fmtCompact(dashboard?.users.active_in_window || 0)}
                sub={`${fmtCompact(dashboard?.activity.events_in_window || 0)} events`}
                loading={loadingDashboard}
              />
              <StatCard
                label="Generations (24h)"
                value={fmtCompact(dashboard?.generations.total_in_window || 0)}
                sub={`${fmtCompact(dashboard?.generations.vision_in_window || 0)} vision`}
                loading={loadingDashboard}
              />
              <StatCard
                label="Credits Charged (24h)"
                value={fmtCompact(Math.round(dashboard?.generations.credits_charged_in_window || 0))}
                sub={`${fmtCompact(dashboard?.users.suspended || 0)} suspended users`}
                loading={loadingDashboard}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">Users</h2>
                  <div className="flex items-center gap-2">
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search email / username"
                      className="px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-sm text-white/90 outline-none focus:border-white/35"
                    />
                    <button
                      onClick={() => {
                        setPage(1);
                        setSearchQuery(searchInput.trim());
                      }}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
                    >
                      Search
                    </button>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-black/40 text-white/50">
                      <tr>
                        <th className="text-left font-medium px-4 py-3">User</th>
                        <th className="text-left font-medium px-4 py-3">Credits</th>
                        <th className="text-left font-medium px-4 py-3">Plan</th>
                        <th className="text-left font-medium px-4 py-3">State</th>
                        <th className="text-left font-medium px-4 py-3">Last Seen</th>
                        <th className="text-left font-medium px-4 py-3">Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                            Loading users...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => {
                          const rowBusy = busyUserId === user.id;
                          return (
                            <tr
                              key={user.id}
                              className={`border-t border-white/10 hover:bg-white/[0.03] ${
                                selectedUserId === user.id ? "bg-white/[0.04]" : ""
                              }`}
                            >
                              <td className="px-4 py-3 align-top">
                                <button
                                  onClick={() => setSelectedUserId(user.id)}
                                  className="text-left"
                                >
                                  <p className="text-white/90 font-medium">{user.display_name || user.username || "Unnamed"}</p>
                                  <p className="text-white/50 text-xs">{user.email || user.id}</p>
                                </button>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="text-white/90">{fmtCompact(user.credits || 0)}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={creditDelta[user.id] || ""}
                                    onChange={(e) =>
                                      setCreditDelta((prev) => ({ ...prev, [user.id]: e.target.value }))
                                    }
                                    placeholder="+/-"
                                    className="w-16 px-2 py-1 rounded bg-black/60 border border-white/15 text-xs"
                                  />
                                  <input
                                    value={creditReason[user.id] || ""}
                                    onChange={(e) =>
                                      setCreditReason((prev) => ({ ...prev, [user.id]: e.target.value }))
                                    }
                                    placeholder="Reason"
                                    className="w-28 px-2 py-1 rounded bg-black/60 border border-white/15 text-xs"
                                  />
                                  <button
                                    disabled={rowBusy}
                                    onClick={() => void handleCreditAdjust(user.id)}
                                    className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-400/30 text-xs text-emerald-300 disabled:opacity-40"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="text-white/80">{user.plan || "free"}</p>
                                <p className="text-white/40 text-xs">{user.plan_status || "-"}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-2">
                                  <button
                                    disabled={rowBusy}
                                    onClick={() => void handleToggleAdmin(user)}
                                    className={`px-2 py-1 rounded text-xs border ${
                                      user.is_admin
                                        ? "bg-blue-500/20 border-blue-400/30 text-blue-300"
                                        : "bg-white/10 border-white/20 text-white/80"
                                    } disabled:opacity-40`}
                                  >
                                    {user.is_admin ? "Admin" : "Make Admin"}
                                  </button>
                                  <button
                                    disabled={rowBusy}
                                    onClick={() => void handleToggleSuspension(user)}
                                    className={`px-2 py-1 rounded text-xs border ${
                                      user.is_suspended
                                        ? "bg-red-500/20 border-red-400/30 text-red-300"
                                        : "bg-white/10 border-white/20 text-white/80"
                                    } disabled:opacity-40`}
                                  >
                                    {user.is_suspended ? "Unsuspend" : "Suspend"}
                                  </button>
                                  <input
                                    value={suspensionReason[user.id] || ""}
                                    onChange={(e) =>
                                      setSuspensionReason((prev) => ({ ...prev, [user.id]: e.target.value }))
                                    }
                                    placeholder="Suspension reason"
                                    className="px-2 py-1 rounded bg-black/60 border border-white/15 text-xs"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-white/60 text-xs">{fmtDate(user.last_seen_at)}</td>
                              <td className="px-4 py-3 align-top text-xs text-white/40">
                                Img: {fmtCompact(user.total_images_generated || 0)}
                                <br />
                                LoRA: {fmtCompact(user.total_loras_trained || 0)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 rounded bg-white/10 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2 py-1 rounded bg-white/10 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">Live Events</h2>
                </div>
                <div className="max-h-[620px] overflow-auto p-4 space-y-3">
                  {events.length === 0 ? (
                    <p className="text-sm text-white/50">No events yet.</p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="rounded-lg border border-white/10 bg-black/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-emerald-300 font-mono uppercase">{event.event_type}</span>
                          <span className="text-[10px] text-white/40">{fmtDate(event.created_at)}</span>
                        </div>
                        <p className="text-xs text-white/70 mt-1">{event.user?.email || event.user_id}</p>
                        {event.path && <p className="text-[11px] text-white/50 mt-1">{event.path}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">Selected User Detail</h2>
                {selectedSummary && <span className="text-xs text-white/50">{selectedSummary.email}</span>}
              </div>

              {!selectedUserId ? (
                <div className="p-6 text-sm text-white/50">Select a user from the table to inspect full activity.</div>
              ) : loadingDetail ? (
                <div className="p-6 text-sm text-white/50">Loading user detail...</div>
              ) : !selectedUserDetail ? (
                <div className="p-6 text-sm text-white/50">No detail available.</div>
              ) : (
                <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-1 space-y-3">
                    <InfoRow label="Display" value={selectedUserDetail.user.display_name || "-"} />
                    <InfoRow label="Username" value={selectedUserDetail.user.username || "-"} />
                    <InfoRow label="Credits" value={fmtCompact(selectedUserDetail.user.credits || 0)} />
                    <InfoRow
                      label="Total Generation Cost"
                      value={fmtCompact(Math.round(selectedUserDetail.generation_credits_total || 0))}
                    />
                    <InfoRow label="Last Seen" value={fmtDate(selectedUserDetail.user.last_seen_at)} />
                  </div>

                  <div className="xl:col-span-1">
                    <p className="text-xs uppercase tracking-wider text-white/50 mb-3">Recent Transactions</p>
                    <div className="space-y-2 max-h-80 overflow-auto pr-1">
                      {selectedUserDetail.recent_transactions.length === 0 ? (
                        <p className="text-xs text-white/40">No transactions.</p>
                      ) : (
                        selectedUserDetail.recent_transactions.map((tx) => (
                          <div key={tx.id} className="rounded border border-white/10 bg-black/40 p-2">
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={tx.amount >= 0 ? "text-emerald-300" : "text-red-300"}
                              >
                                {tx.amount >= 0 ? "+" : ""}
                                {tx.amount}
                              </span>
                              <span className="text-white/40">{fmtDate(tx.created_at)}</span>
                            </div>
                            <p className="text-[11px] text-white/60 mt-1">{tx.transaction_type}</p>
                            {tx.description && (
                              <p className="text-[11px] text-white/40 mt-1">{tx.description}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="xl:col-span-1">
                    <p className="text-xs uppercase tracking-wider text-white/50 mb-3">Recent Generations</p>
                    <div className="space-y-2 max-h-80 overflow-auto pr-1">
                      {selectedUserDetail.recent_generations.length === 0 ? (
                        <p className="text-xs text-white/40">No generations.</p>
                      ) : (
                        selectedUserDetail.recent_generations.map((job) => (
                          <div key={job.id} className="rounded border border-white/10 bg-black/40 p-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/80">{job.model_id}</span>
                              <span className="text-white/40">{fmtDate(job.created_at)}</span>
                            </div>
                            <p className="text-[11px] text-white/50 mt-1 uppercase">{job.status}</p>
                            <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{job.prompt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const StatCard = ({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
}) => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
      <p className="text-2xl font-semibold mt-2 text-white">{loading ? "..." : value}</p>
      <p className="text-xs text-white/45 mt-1">{sub}</p>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="rounded border border-white/10 bg-black/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm text-white/85 mt-1">{value}</p>
    </div>
  );
};

export default AdminPage;
