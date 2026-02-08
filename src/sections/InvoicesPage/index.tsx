import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StripeInvoice, createBillingPortalSession, listInvoices } from "@/services/stripeGateway";

const formatMoney = (amount: number, currency: string) => {
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

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const statusTone = (status: string | null) => {
  const value = (status || "").toLowerCase();
  if (value === "paid") return "bg-emerald-500/15 text-emerald-300";
  if (value === "open" || value === "draft") return "bg-yellow-500/15 text-yellow-300";
  if (value === "void" || value === "uncollectible") return "bg-red-500/15 text-red-300";
  return "bg-white/10 text-white/70";
};

export const InvoicesPage = () => {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchInvoices = async () => {
    try {
      setError("");
      const response = await listInvoices({ limit: 20 });
      setInvoices(response.invoices || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    const interval = setInterval(fetchInvoices, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePortal = async () => {
    try {
      setPortalLoading(true);
      setError("");
      const { url } = await createBillingPortalSession({
        returnUrl: `${window.location.origin}/billing/invoices`,
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

  return (
    <div className="min-h-screen bg-black pt-20 pb-16 text-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-white/60 mt-2">Real-time billing history tied to your Stripe account.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchInvoices}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              Refresh
            </button>
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-60"
            >
              {portalLoading ? "Opening..." : "Manage billing"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="text-sm text-white/60">
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString("en-US")}` : "Loading invoices..."}
          </div>
          <a href="/billing" className="text-sm text-purple-300 hover:text-purple-200">
            Back to billing
          </a>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-pulse h-40" />
        )}

        {!loading && invoices.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
            No invoices yet. Once you purchase a plan or credit pack, invoices will appear here.
          </div>
        )}

        {invoices.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-white/50">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <div className="font-medium">{invoice.number || invoice.id}</div>
                      {invoice.subscription && (
                        <div className="text-xs text-white/40">Subscription</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(invoice.created)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{formatMoney(invoice.total, invoice.currency)}</div>
                      {invoice.amount_remaining > 0 && (
                        <div className="text-xs text-white/40">Due {formatMoney(invoice.amount_remaining, invoice.currency)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${statusTone(invoice.status)}`}>
                        {invoice.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {invoice.hosted_invoice_url && (
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-purple-300 hover:text-purple-200"
                          >
                            View
                          </a>
                        )}
                        {invoice.invoice_pdf && (
                          <a
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-300 hover:text-blue-200"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {profile?.stripe_customer_id && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
            Need to update payment methods or see full billing history? Use the billing portal for Stripe-hosted management.
          </div>
        )}
      </div>
    </div>
  );
};
