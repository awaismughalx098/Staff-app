import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, PackageSearch, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton, GlassSegmentedControl } from "../../components/glass";
import { searchInputClass, searchWrapClass, textareaClass } from "../../components/admin/adminFormStyles";
import { getUploadUrl } from "../../config";
import { getLostFoundReports, updateLostFoundReport } from "../../services/lostFoundService";

/* Pending first: the queue is for what still needs someone to look. */
const VIEWS = [
  { id: "pending", label: "Pending" },
  { id: "under_review", label: "Under review" },
  { id: "found", label: "Found" },
  { id: "returned", label: "Returned" },
  { id: "closed", label: "Closed" },
  { id: "", label: "All" },
];

const STATUS_STYLE = {
  pending: "bg-status-delayed-soft text-status-delayed",
  under_review: "bg-accent-soft text-accent",
  found: "bg-route-green-soft text-route-green",
  returned: "bg-route-green-soft text-route-green",
  closed: "bg-elevated text-content-muted",
};

const STATUS_LABEL = {
  pending: "Pending",
  under_review: "Under review",
  found: "Item found",
  returned: "Returned",
  closed: "Closed",
};

const formatWhen = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatDay = (value) =>
  value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—";

function StatusPill({ status }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        STATUS_STYLE[status] || STATUS_STYLE.pending
      }`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function ReportCard({ report, expanded, onToggle, onChanged }) {
  const [note, setNote] = useState(report.publicNote || "");
  const [saving, setSaving] = useState("");

  const update = async (payload, label) => {
    setSaving(label);
    try {
      await updateLostFoundReport(report._id, payload);
      toast.success(payload.status ? `Marked ${STATUS_LABEL[payload.status].toLowerCase()} — the passenger has been told` : "Note saved");
      onChanged();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't update that report");
    } finally {
      setSaving("");
    }
  };

  const photo = report.photo ? getUploadUrl(report.photo, 480) : null;
  const noteChanged = note.trim() !== (report.publicNote || "");

  return (
    <motion.li layout className="glass-surface overflow-hidden rounded-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 p-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="break-words font-display text-[15px] font-bold text-content">{report.itemName}</span>
            <StatusPill status={report.status} />
            <span className="text-[12px] text-content-faint">{report.code}</span>
          </span>
          <span className="mt-1 block break-words text-[12.5px] text-content-muted">
            {report.serviceLabel}
            {report.serviceName ? ` · ${report.serviceName}` : ""}
            {report.routeOrLocation ? ` · ${report.routeOrLocation}` : ""}
          </span>
          <span className="mt-0.5 block text-[12px] text-content-faint">
            {report.passenger?.name || "Passenger"} · {formatWhen(report.createdAt)}
          </span>
        </span>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-content-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            {photo && (
              <a href={photo} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img src={photo} alt={report.itemName} className="h-32 w-32 rounded-input border border-line object-cover" />
              </a>
            )}
            <dl className="grid min-w-0 flex-1 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="shrink-0 text-content-muted">Category</dt>
                <dd className="min-w-0 break-words font-semibold text-content">{report.categoryLabel}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-content-muted">Date lost</dt>
                <dd className="min-w-0 font-semibold text-content">{formatDay(report.travelDate)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-content-muted">Reference</dt>
                <dd className="min-w-0 break-all font-semibold text-content">{report.bookingReference || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-content-muted">Phone</dt>
                <dd className="min-w-0 break-words font-semibold text-content">{report.passenger?.phone || "—"}</dd>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <dt className="shrink-0 text-content-muted">Email</dt>
                <dd className="min-w-0 break-all font-semibold text-content">{report.passenger?.email || "—"}</dd>
              </div>
            </dl>
          </div>

          <p className="mt-4 whitespace-pre-wrap break-words rounded-input bg-elevated px-3 py-2.5 text-[13.5px] leading-snug text-content">
            {report.description}
          </p>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-content-muted">
              Note for the passenger
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Where to collect it, or why the report was closed"
              className={textareaClass}
            />
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {noteChanged && (
              <button
                type="button"
                onClick={() => update({ publicNote: note.trim() }, "note")}
                disabled={saving === "note"}
                className="flex h-10 cursor-pointer items-center rounded-input bg-accent px-4 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {saving === "note" ? "Saving…" : "Save note"}
              </button>
            )}
            {VIEWS.filter((v) => v.id && v.id !== report.status).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => update({ status: v.id, ...(noteChanged ? { publicNote: note.trim() } : {}) }, v.id)}
                disabled={Boolean(saving)}
                className="flex h-10 cursor-pointer items-center rounded-input border border-line px-3.5 text-[13px] font-bold text-content-muted transition-colors hover:text-accent disabled:opacity-60"
              >
                {saving === v.id ? "Saving…" : STATUS_LABEL[v.id]}
              </button>
            ))}
          </div>

          {report.history?.length > 0 && (
            <ol className="mt-4 space-y-1 text-[12px] text-content-muted">
              {report.history.map((h, i) => (
                <li key={`${h.status}-${i}`}>
                  {STATUS_LABEL[h.status] || h.status} · {formatWhen(h.at)}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </motion.li>
  );
}

/**
 * Lost & Found queue for the main admin team. Every status change notifies the
 * passenger; the note is shown to them, so it is written for them.
 */
function LostFound() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({});
  const [view, setView] = useState("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = async (status = view) => {
    try {
      setLoading(true);
      const res = await getLostFoundReports(status ? { status } : {});
      setReports(Array.isArray(res?.data) ? res.data : []);
      setSummary(res?.summary || {});
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load Lost & Found reports");
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
    if (!text) return reports;
    return reports.filter((r) =>
      [r.code, r.itemName, r.serviceName, r.routeOrLocation, r.bookingReference, r.passenger?.name]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(text))
    );
  }, [reports, query]);

  const waiting = (summary.pending || 0) + (summary.under_review || 0);

  return (
    <AdminLayout requireSuperAdmin title="Lost & Found" subtitle="Items passengers have reported">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className={`${searchWrapClass} min-w-0 flex-1 basis-[200px]`}>
          <Search className="h-4 w-4 shrink-0 text-content-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, item, company or route"
            className={searchInputClass}
          />
        </div>
        <button
          type="button"
          onClick={() => load(view)}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-input border border-line px-3.5 text-[13px] font-bold text-content-muted transition-colors hover:text-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mb-4">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="w-max min-w-full">
            <GlassSegmentedControl options={VIEWS} value={view} onChange={setView} />
          </div>
        </div>
        {waiting > 0 && (
          <p className="mt-2 px-1 text-[12.5px] text-content-muted">
            {waiting} report{waiting === 1 ? "" : "s"} still need attention.
          </p>
        )}
      </div>

      {loading && <GlassSkeleton className="h-24" count={3} />}

      {!loading && filtered.length === 0 && (
        <GlassEmptyState
          icon={PackageSearch}
          title={query ? "Nothing matches that search" : "No reports here"}
          description={query ? "Try a different code or item." : "Passengers' lost item reports arrive here."}
          className="mt-12"
        />
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((report) => (
            <ReportCard
              key={`${report._id}-${report.updatedAt}`}
              report={report}
              expanded={openId === report._id}
              onToggle={() => setOpenId(openId === report._id ? null : report._id)}
              onChanged={() => load(view)}
            />
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}

export default LostFound;
