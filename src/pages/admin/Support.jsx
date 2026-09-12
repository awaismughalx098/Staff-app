import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  LifeBuoy,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton, GlassSegmentedControl } from "../../components/glass";
import { searchInputClass, searchWrapClass, textareaClass } from "../../components/admin/adminFormStyles";
import {
  getSupportReports,
  replyToSupportReport,
  setSupportReportStatus,
} from "../../services/supportService";

/* Open first: this page exists to answer "who is still waiting on us", and
   that is the reason anyone opens it. */
const VIEWS = [
  { id: "Open", label: "Open" },
  { id: "InReview", label: "In review" },
  { id: "Replied", label: "Replied" },
  { id: "Resolved", label: "Resolved" },
  { id: "", label: "All" },
];

const STATUS_STYLE = {
  Open: "bg-accent-soft text-accent",
  InReview: "bg-elevated text-content-muted",
  Replied: "bg-route-green-soft text-route-green",
  Resolved: "bg-elevated text-content-muted",
};

const STATUS_LABEL = {
  Open: "Open",
  InReview: "In review",
  Replied: "Replied",
  Resolved: "Resolved",
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

function StatusPill({ status }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        STATUS_STYLE[status] || STATUS_STYLE.Open
      }`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function Thread({ report }) {
  return (
    <div className="space-y-2.5">
      {report.messages.map((m) => (
        <div key={m._id} className={m.from === "support" ? "text-right" : ""}>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-content-faint">
            {m.from === "support"
              ? `Support${m.admin?.name ? ` · ${m.admin.name}` : ""}`
              : report.name || "Passenger"}
            {" · "}
            {formatWhen(m.at)}
          </span>
          <p
            className={`inline-block max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-[13.5px] leading-snug ${
              m.from === "support" ? "bg-accent text-white" : "bg-elevated text-content"
            }`}
          >
            {m.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReportCard({ report, expanded, onToggle, onChanged }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [moving, setMoving] = useState("");

  const send = async () => {
    const body = reply.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      await replyToSupportReport(report._id, body);
      setReply("");
      toast.success("Reply sent to the passenger");
      onChanged();
    } catch {
      toast.error("Couldn't send that reply");
    } finally {
      setSending(false);
    }
  };

  const move = async (status) => {
    setMoving(status);
    try {
      await setSupportReportStatus(report._id, status);
      toast.success(`Marked ${STATUS_LABEL[status].toLowerCase()}`);
      onChanged();
    } catch {
      toast.error("Couldn't update that report");
    } finally {
      setMoving("");
    }
  };

  return (
    <motion.li
      layout
      className="glass-surface overflow-hidden rounded-card"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 p-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[15px] font-bold text-content">
              {report.categoryLabel}
            </span>
            <StatusPill status={report.status} />
            <span className="text-[12px] text-content-faint">{report.code}</span>
          </span>

          <span className="mt-1 block text-[12.5px] text-content-muted">
            {report.name}
            {report.passenger?.phone ? ` · ${report.passenger.phone}` : ""}
            {" · "}
            {formatWhen(report.createdAt)}
          </span>

          <span className="mt-1.5 block truncate text-[13px] text-content">
            {report.description}
          </span>
        </span>

        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-content-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-4">
          <dl className="mb-4 grid gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="shrink-0 text-content-muted">Contact</dt>
              <dd className="min-w-0 flex-1 break-words font-semibold text-content">
                <span className="inline-flex items-center gap-1.5">
                  {report.email ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                  {report.email || report.phone || "—"}
                </span>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-content-muted">Reference</dt>
              <dd className="min-w-0 flex-1 break-words font-semibold text-content">
                {report.reference || "—"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-content-muted">Assigned</dt>
              <dd className="min-w-0 flex-1 break-words font-semibold text-content">
                {report.assignedTo?.name || "Nobody yet"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-content-muted">Updated</dt>
              <dd className="min-w-0 flex-1 font-semibold text-content">
                {formatWhen(report.updatedAt)}
              </dd>
            </div>
          </dl>

          <Thread report={report} />

          <div className="mt-4">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Write back to the passenger…"
              className={textareaClass}
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={send}
                disabled={sending || !reply.trim()}
                className="flex h-10 cursor-pointer items-center gap-2 rounded-input bg-accent px-4 text-[13px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending…" : "Send reply"}
              </button>

              {report.status !== "InReview" && report.status !== "Resolved" && (
                <button
                  type="button"
                  onClick={() => move("InReview")}
                  disabled={moving === "InReview"}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-input border border-line px-3.5 text-[13px] font-bold text-content-muted transition-colors hover:text-accent disabled:opacity-60"
                >
                  <Clock className="h-4 w-4" />
                  Take it
                </button>
              )}

              {report.status !== "Resolved" ? (
                <button
                  type="button"
                  onClick={() => move("Resolved")}
                  disabled={moving === "Resolved"}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-input border border-line px-3.5 text-[13px] font-bold text-content-muted transition-colors hover:text-route-green disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => move("Open")}
                  disabled={moving === "Open"}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-input border border-line px-3.5 text-[13px] font-bold text-content-muted transition-colors hover:text-accent disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reopen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.li>
  );
}

function Support() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({});
  const [view, setView] = useState("Open");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = async (status = view) => {
    try {
      setLoading(true);
      const res = await getSupportReports(status ? { status } : {});
      setReports(Array.isArray(res?.data) ? res.data : []);
      setSummary(res?.summary || {});
    } catch {
      toast.error("Couldn't load support reports");
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
      [r.code, r.name, r.reference, r.description, r.categoryLabel]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(text))
    );
  }, [reports, query]);

  const waiting = (summary.Open || 0) + (summary.InReview || 0);

  return (
    <AdminLayout title="Support" subtitle="Reports raised by passengers">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className={`${searchWrapClass} min-w-[200px] flex-1`}>
          <Search className="h-4 w-4 shrink-0 text-content-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, name, reference or text"
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
        <GlassSegmentedControl
          options={VIEWS}
          value={view}
          onChange={setView}
        />
        {waiting > 0 && (
          <p className="mt-2 px-1 text-[12.5px] text-content-muted">
            {waiting} report{waiting === 1 ? "" : "s"} still waiting on us.
          </p>
        )}
      </div>

      {loading && <GlassSkeleton className="h-24" count={3} />}

      {!loading && filtered.length === 0 && (
        <GlassEmptyState
          icon={LifeBuoy}
          title={query ? "Nothing matches that search" : "No reports here"}
          description={
            query
              ? "Try a different code or name."
              : "Passengers' reports arrive here from Contact & Support."
          }
          className="mt-12"
        />
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((report) => (
            <ReportCard
              key={report._id}
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

export default Support;
