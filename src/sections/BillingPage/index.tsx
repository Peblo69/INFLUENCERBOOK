import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  StripePrice,
  createBillingPortalSession,
  createCheckoutSession,
  listStripePrices,
} from "@/services/stripeGateway";

const formatMoney = (amount: number | null, currency: string) => {
  if (amount === null) return "Custom";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
};

const formatInterval = (price: StripePrice) => {
  if (!price.recurring) return "One-time";
  const count = price.recurring.interval_count || 1;
  const unit = price.recurring.interval;
  if (count === 1) return `per ${unit}`;
  return `every ${count} ${unit}s`;
};

const normalizePlan = (value: string | null | undefined) => {
  if (!value) return "";
  const normalized = value.toLowerCase();
  if (normalized.includes("enterprise")) return "enterprise";
  if (normalized.includes("premium")) return "premium";
  if (normalized.includes("pro")) return "pro";
  if (normalized.includes("free")) return "free";
  return "";
};

const getPlanKey = (price: StripePrice) =>
  normalizePlan(
    price.metadata?.plan ||
    price.product?.metadata?.plan ||
    price.nickname ||
    price.product?.name
  );

const getPlanLabel = (price: StripePrice) => {
  const planKey = getPlanKey(price);
  if (planKey) return planKey.charAt(0).toUpperCase() + planKey.slice(1);
  return price.product?.name || price.nickname || "Plan";
};

const getCredits = (price: StripePrice) => {
  const credits = price.metadata?.credits || price.product?.metadata?.credits;
  if (!credits) return null;
  const numeric = Number(credits);
  return Number.isFinite(numeric) ? numeric : null;
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "Starter credit balance",
    "Standard generation speed",
    "Community support",
  ],
  pro: [
    "Priority generation queue",
    "Advanced prompt controls",
    "Commercial usage rights",
  ],
  premium: [
    "Highest quality outputs",
    "Expanded training slots",
    "Concierge support",
  ],
  enterprise: [
    "Dedicated infrastructure",
    "Security + compliance reviews",
    "Custom workflows + SLAs",
  ],
};

const CREDIT_FEATURES = [
  "One-time credit boost",
  "No subscription required",
  "Use across all tools",
];

export const BillingPage = () => {
  const { profile, refreshProfile } = useAuth();
  const location = useLocation();
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPrice, setBusyPrice] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadPrices = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await listStripePrices();
        setPrices(response.prices || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load pricing.");
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("checkout");
    if (status === "success") {
      setMessage("Payment received. Your plan will update shortly.");
      refreshProfile();
    } else if (status === "cancelled") {
      setMessage("Checkout cancelled. You can resume anytime.");
    }
  }, [location.search, refreshProfile]);

  const subscriptionPrices = useMemo(() =>
    prices.filter((price) => price.recurring).sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0)),
    [prices]
  );

  const creditPrices = useMemo(() =>
    prices.filter((price) => !price.recurring).sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0)),
    [prices]
  );

  const featuredPlanId = useMemo(() => {
    const featured = subscriptionPrices.find((price) => price.metadata?.featured === "true");
    if (featured) return featured.id;
    return subscriptionPrices.length > 1 ? subscriptionPrices[Math.floor(subscriptionPrices.length / 2)].id : subscriptionPrices[0]?.id;
  }, [subscriptionPrices]);

  const handleCheckout = async (priceId: string) => {
    try {
      setBusyPrice(priceId);
      setError("");
      const { url } = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/billing?checkout=success`,
        cancelUrl: `${window.location.origin}/billing?checkout=cancelled`,
      });
      if (url) {
        window.location.href = url;
      } else {
        setError("Stripe did not return a checkout URL.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to start checkout.");
    } finally {
      setBusyPrice(null);
    }
  };

  const handlePortal = async () => {
    try {
      setPortalLoading(true);
      setError("");
      const { url } = await createBillingPortalSession({
        returnUrl: `${window.location.origin}/billing`,
      });
      if (url) {
        window.location.href = url;
      } else {
        setError("Stripe did not return a portal URL.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = profile?.plan || "free";
  const currentStatus = profile?.plan_status || "free";
  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen bg-black pt-20 pb-16 text-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 mb-10">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Billing & Plans</h1>
                <p className="text-white/60 mt-2 max-w-xl">
                  Power your AI influencer studio with a plan built for your growth. Upgrade anytime or grab one-time credit packs.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/billing/invoices"
                  className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  View invoices
                </a>
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-60"
                >
                  {portalLoading ? "Opening..." : "Manage billing"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Current plan</div>
            <div className="mt-2 text-2xl font-semibold uppercase">{currentPlan}</div>
            <div className="mt-1 text-sm text-white/60">Status: {currentStatus}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Credits</div>
            <div className="mt-2 text-2xl font-semibold">{profile?.credits?.toLocaleString() ?? "—"}</div>
            <div className="mt-1 text-sm text-white/60">Use credits for generations and training.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Renewal</div>
            <div className="mt-2 text-2xl font-semibold">{periodEnd}</div>
            <div className="mt-1 text-sm text-white/60">Next billing date (if subscribed).</div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Subscription plans</h2>
          <p className="text-white/60 mt-2">Pick the plan that matches your production velocity.</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && subscriptionPrices.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60 mb-12">
            No active subscription prices were found in Stripe. Add recurring prices to display plans here.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {subscriptionPrices.map((price) => {
            const planKey = getPlanKey(price);
            const isCurrent = planKey && planKey === currentPlan;
            const isFeatured = price.id === featuredPlanId;
            const features = planKey ? PLAN_FEATURES[planKey] || [] : [];

            return (
              <div
                key={price.id}
                className={`relative rounded-3xl border ${
                  isFeatured ? "border-purple-400/40 bg-gradient-to-br from-purple-500/20 via-white/5 to-transparent" : "border-white/10 bg-white/5"
                } p-6 shadow-lg`}
              >
                {isFeatured && (
                  <div className="absolute top-4 right-4 text-xs uppercase tracking-[0.2em] text-purple-200">Popular</div>
                )}
                <div className="text-lg font-semibold">{getPlanLabel(price)}</div>
                <div className="mt-3 text-3xl font-bold">
                  {formatMoney(price.unit_amount, price.currency)}
                  <span className="text-sm font-normal text-white/60"> {formatInterval(price)}</span>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  {price.product?.description || "Everything you need to scale AI influencer production."}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {features.length > 0 ? (
                    features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                        <span>{feature}</span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                      <span>Custom plan details available in Stripe.</span>
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => handleCheckout(price.id)}
                  disabled={busyPrice === price.id || isCurrent}
                  className={`mt-6 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isCurrent
                      ? "bg-white/10 text-white/60 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  }`}
                >
                  {isCurrent ? "Current plan" : busyPrice === price.id ? "Redirecting..." : "Choose plan"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Credit packs</h2>
          <p className="text-white/60 mt-2">Boost your balance with one-time credit bundles.</p>
        </div>

        {!loading && creditPrices.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
            No one-time credit packs are active in Stripe yet.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {creditPrices.map((price) => {
            const credits = getCredits(price);
            return (
              <div key={price.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-lg font-semibold">{price.product?.name || price.nickname || "Credits"}</div>
                <div className="mt-3 text-3xl font-bold">
                  {formatMoney(price.unit_amount, price.currency)}
                </div>
                {credits && (
                  <div className="mt-2 text-sm text-white/60">Includes {credits.toLocaleString()} credits</div>
                )}
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {CREDIT_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(price.id)}
                  disabled={busyPrice === price.id}
                  className="mt-6 w-full rounded-full px-4 py-2 text-sm font-semibold bg-white/10 hover:bg-white/20 transition"
                >
                  {busyPrice === price.id ? "Redirecting..." : "Buy credits"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
