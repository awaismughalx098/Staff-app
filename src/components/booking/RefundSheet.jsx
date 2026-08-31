import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { GlassModal, GlassButton } from "../glass";
import { getRefundQuote, requestRefund } from "../../services/refundService";
import { formatPrice } from "../../utils/tours";

/**
 * Shows what a cancellation costs before the passenger commits to it.
 *
 * The figures come from the server rather than being worked out here: the
 * deduction depends on how close departure is, and the client's clock is not
 * the one that decides. It is quoted again on confirm, so a sheet left open
 * cannot lock in a cheaper tier than the one that applies when they tap.
 *
 * @param {"bus"|"hotel"|"tour"|"event"} kind
 */
function RefundSheet({ kind, bookingId, open, onClose, onRefunded }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !bookingId) return;

    let cancelled = false;
    setLoading(true);

    getRefundQuote(kind, bookingId)
      .then((res) => {
        if (!cancelled) setQuote(res?.data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err?.response?.data?.message || "Couldn't work out your refund"
          );
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, bookingId, kind]);

  const confirm = async () => {
    setSaving(true);
    try {
      const res = await requestRefund(kind, bookingId);
      toast.success(res.message || "Refunded");
      onRefunded?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't process your refund");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={() => !saving && onClose()}
      title="Cancel and refund"
      subtitle={quote?.what}
    >
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/50" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/50" />
        </div>
      ) : !quote?.eligible ? (
        <div className="space-y-4">
          <div className="glass-surface flex items-start gap-2.5 rounded-card p-3.5">
            {quote?.waiting ? (
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            )}
            <p className="text-[12.5px] leading-5 text-content-muted">
              {quote?.waiting?.message ||
                quote?.reason ||
                "This booking can't be refunded."}
            </p>
          </div>
          <GlassButton onClick={onClose} className="h-[50px] w-full">
            Close
          </GlassButton>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12.5px] text-content-muted">
              <span>You paid</span>
              <span>{formatPrice(quote.paid)}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] text-content-muted">
              <span>Cancellation charge ({quote.deductionPercent}%)</span>
              <span className="text-danger">−{formatPrice(quote.deduction)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-[13px] text-content-muted">You get back</span>
              <span className="font-display text-lg font-black text-accent">
                {formatPrice(quote.refund)}
              </span>
            </div>
          </div>

          <p className="text-[11.5px] leading-5 text-content-muted">
            {quote.reason}. The charge grows the closer you cancel to
            departure, and nothing is refunded once it has left.
          </p>

          {/* The whole ladder, so the tier they are on is not a surprise. */}
          <div className="glass-surface rounded-card p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-content-muted">
              Cancellation charges
            </p>
            <ul className="mt-2 space-y-1">
              {(quote.tiers || []).map((tier) => (
                <li
                  key={tier.label}
                  className={`flex items-center justify-between text-[11.5px] ${
                    tier.deductionPercent === quote.deductionPercent
                      ? "font-bold text-content"
                      : "text-content-muted"
                  }`}
                >
                  <span>{tier.label}</span>
                  <span>{tier.deductionPercent}%</span>
                </li>
              ))}
              <li className="flex items-center justify-between text-[11.5px] text-content-muted">
                <span>After it departs</span>
                <span>No refund</span>
              </li>
            </ul>
          </div>

          <GlassButton
            onClick={confirm}
            disabled={saving}
            className="h-[52px] w-full"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Refunding...
              </span>
            ) : (
              <>
                <Undo2 className="h-4.5 w-4.5" />
                Cancel and refund {formatPrice(quote.refund)}
              </>
            )}
          </GlassButton>
        </div>
      )}
    </GlassModal>
  );
}

export default RefundSheet;
