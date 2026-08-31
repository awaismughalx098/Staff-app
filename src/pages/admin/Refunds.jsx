import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BedDouble,
  BusFront,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  RefreshCw,
  Search,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton, GlassSegmentedControl } from "../../components/glass";
import { searchInputClass, searchWrapClass } from "../../components/admin/adminFormStyles";
import { getAllRefunds, markRefundPaid } from "../../services/refundAdminService";
import { formatPrice } from "../../utils/tours";

/* Pending first: this page exists to answer "who are we still holding money
   from", and that question is the reason anyone opens it. */
const VIEWS = [
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid back" },
  { id: "", label: "All" },
];

const KIND_ICONS = {
  bus: BusFront,
  hotel: BedDouble,
  tour: Globe,
  event: CalendarDays,
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })
    : "—";

function Refunds() {
  const [refunds, setRefunds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [view, setView] = useState("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async (status = view) => {
    try {
      setLoading(true);
      const res = await getAllRefunds(status ? { status } : {});
      setRefunds(Array.isArray(res?.data) ? res.data : []);
      setSummary(res?.summary || null);
    } catch {
      toast.error("Couldn't load refunds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return refunds;

    return refunds.filter(
      (r) =>
        r.who?.toLowerCase().includes(text) ||
        r.what?.toLowerCase().includes(text) ||
        r.reference?.toLowerCase().includes(text)
    );
  }, [refunds, query]);

  const payOut = async (refund) => {
    /* A reference is optional — the point is recording that it went out, and
       demanding paperwork would just get the step skipped. */
    const reference = window.prompt(
      `Mark ${formatPrice(refund.refundAmount)} to ${refund.who} as paid back?\n\nReference (optional):`,
      ""
    );

    if (reference === null) return;

    setSaving(refund.id);
    try {
      await markRefundPaid(refund.kind, refund.id, reference);
      toast.success("Marked as paid back");
      await load(view);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Couldn't update that refund");
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminLayout title="Refunds" subtitle="Every refund, and what's still owed">
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Still to pay"
            value={formatPrice(summary.amountPending)}
            hint={`${summary.pending} refund${summary.pending === 1 ? "" : "s"}`}
            tone="warning"
          />
          <Stat
            label="Paid back"
            value={formatPrice(summary.amountPaid)}
            hint={`${summary.paid} settled`}
            tone="green"
          />
          <Stat label="Deductions kept" value={formatPrice(summary.deductionsKept)} hint="Company income" />
          <Stat label="Total refunds" value={String(summary.total)} hint="All time" />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <GlassSegmentedControl options={VIEWS} value={view} onChange={setView} />

        <div className={`${searchWrapClass} flex-1`}>
          <Search className="h-4 w-4 text-content-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, booking or reference"
            className={searchInputClass}
          />
        </div>

        <button
          type="button"
          onClick={() => load(view)}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content-muted"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <GlassSkeleton className="h-[92px]" count={5} />
        ) : filtered.length === 0 ? (
          <GlassEmptyState
            icon={Undo2}
            title={view === "pending" ? "Nothing owed" : "No refunds here"}
            description={
              view === "pending"
                ? "Every refund that's been approved has already been paid back."
                : "No refunds match this view yet."
            }
            className="mt-10"
          />
        ) : (
          filtered.map((refund, index) => (
            <RefundRow
              key={`${refund.kind}-${refund.id}`}
              refund={refund}
              index={index}
              saving={saving === refund.id}
              onPay={() => payOut(refund)}
            />
          ))
        )}
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value, hint, tone }) {
  const toneClass =
    tone === "warning" ? "text-warning" : tone === "green" ? "text-route-green" : "text-content";

  return (
    <div className="glass-surface rounded-card p-4">
      <p className="text-[11.5px] text-content-muted">{label}</p>
      <p className={`mt-1 font-display text-[19px] font-bold ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-content-muted">{hint}</p>
    </div>
  );
}

function RefundRow({ refund, index, saving, onPay }) {
  const Icon = KIND_ICONS[refund.kind] || Undo2;
  const pending = refund.status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="glass-surface rounded-card p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-bold text-content">{refund.who}</p>

            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                pending
                  ? "bg-warning/15 text-warning"
                  : "bg-route-green-soft text-route-green"
              }`}
            >
              {pending ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {pending ? "Pending" : "Paid back"}
            </span>
          </div>

          <p className="mt-0.5 truncate text-[12px] text-content-muted">{refund.what}</p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-content-muted">
            <span>
              Refunded <span className="font-semibold text-content">{formatDate(refund.refundedAt)}</span>
            </span>
            <span>
              Paid <span className="font-semibold text-content">{formatPrice(refund.paid)}</span>
            </span>
            <span>
              Deducted <span className="font-semibold text-content">{formatPrice(refund.deduction)}</span>
            </span>
            {!pending && (
              <span>
                Sent <span className="font-semibold text-content">{formatDate(refund.refundPaidAt)}</span>
              </span>
            )}
            {refund.reference && (
              <span>
                Ref <span className="font-semibold text-content">{refund.reference}</span>
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-[16px] font-bold text-content">
            {formatPrice(refund.refundAmount)}
          </p>

          {pending && (
            <button
              type="button"
              onClick={onPay}
              disabled={saving}
              className="mt-2 cursor-pointer rounded-full bg-accent px-3 py-1.5 text-[11.5px] font-bold text-white shadow-premium transition-transform active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Mark paid"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default Refunds;
