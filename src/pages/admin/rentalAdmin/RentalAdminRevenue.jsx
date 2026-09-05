import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Percent,
  RefreshCw,
  Ticket,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassSkeleton } from "../../../components/glass";
import { getRentalRevenue } from "../../../services/rentalService";
import { formatPrice } from "../../../utils/tours";
import useMyRentalCompany from "./useMyRentalCompany";

/**
 * What the company earned.
 *
 * Only agreed work counts: a request nobody has answered and a quote nobody
 * has accepted are not income, and the server excludes them. The breakdown
 * below shows every status so the difference between "asked for" and "earned"
 * is visible rather than assumed.
 */

/* Statuses the server counts as earned, so the table can mark them. */
const EARNED = ["Confirmed", "Paid", "Completed"];

const STATUS_ORDER = [
  "Requested",
  "Quoted",
  "Confirmed",
  "PaymentPending",
  "Paid",
  "Completed",
  "Cancelled",
  "RefundPending",
  "Refunded",
];

function Figure({ icon: Icon, value, label, hint, accent }) {
  return (
    <div className="glass-surface rounded-card p-4 shadow-glass">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          accent ? "bg-accent text-white" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 font-display text-xl font-black leading-none text-content">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-content-muted">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-content-faint">{hint}</p>}
    </div>
  );
}

function RentalAdminRevenue() {
  const company = useMyRentalCompany();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRentalRevenue();
      setData(res?.data || null);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load your earnings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals;
  const byStatus = data?.byStatus || {};
  const rows = STATUS_ORDER.filter((status) => byStatus[status]);

  return (
    <AdminLayout
      requireRole="rentalAdmin"
      title="Earnings"
      subtitle={company.name || "Rental Company Admin"}
      actions={
        <button
          type="button"
          onClick={load}
          aria-label="Refresh"
          className="glass-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <GlassSkeleton className="h-28" count={4} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure
              icon={Wallet}
              value={formatPrice(totals?.net || 0)}
              label="Yours after fees"
              accent
            />
            <Figure
              icon={Percent}
              value={formatPrice(totals?.platformFees || 0)}
              label="Platform fees"
              hint="Taken from agreed hires"
            />
            <Figure
              icon={CheckCircle2}
              value={totals?.confirmed ?? 0}
              label="Agreed hires"
            />
            <Figure icon={Ticket} value={totals?.bookings ?? 0} label="All requests" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Figure
              icon={Wallet}
              value={formatPrice(totals?.gross || 0)}
              label="Before fees"
            />
            <Figure
              icon={XCircle}
              value={totals?.cancelled ?? 0}
              label="Cancelled or declined"
            />
          </div>

          <div className="glass-surface mt-4 overflow-hidden rounded-card shadow-glass">
            <p className="border-b border-line px-4 py-3 font-display text-[14px] font-bold text-content">
              Every request, by where it got to
            </p>

            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-content-muted">
                Nothing yet. Requests appear here as customers send them.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-content-muted">
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Count</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Value</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((status) => {
                      const row = byStatus[status];
                      const earned = EARNED.includes(status);

                      return (
                        <tr key={status} className="border-b border-line last:border-0">
                          <td className="px-4 py-2.5 text-[12.5px] text-content">
                            {status}
                            {earned && (
                              <span className="ml-2 rounded bg-status-live-soft px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-status-live">
                                Counted
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[12.5px] text-content data-mono">
                            {row.count}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right text-[12.5px] data-mono ${
                              earned ? "text-content" : "text-content-muted"
                            }`}
                          >
                            {formatPrice(row.amount || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[12.5px] text-content-muted data-mono">
                            {formatPrice(row.fees || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-content-muted">
            Only Confirmed, Paid and Completed hires count towards your
            earnings — a request or a quote is not money until somebody agreed
            to it.
          </p>
        </>
      )}
    </AdminLayout>
  );
}

export default RentalAdminRevenue;
