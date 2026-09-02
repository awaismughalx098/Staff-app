import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassModal, GlassEmptyState, GlassSkeleton } from "../../components/glass";
import { inputClass, labelClass } from "../../components/admin/adminFormStyles";
import {
  getErrorSummary,
  getErrorLogs,
  getErrorLog,
  updateErrorLog,
} from "../../services/errorLogService";

/**
 * What is currently broken, and how often.
 *
 * The rows here are incidents rather than occurrences: one database timeout
 * that fired five hundred times is one line saying 500, because a list of five
 * hundred identical rows tells an operator nothing. Opening one shows the
 * technical detail — stack included — which is appropriate for an administrator
 * and reaches nobody else: the whole section is Super Admin only on the server.
 */

const SEVERITIES = ["critical", "error", "warning", "info"];
const STATUSES = ["open", "acknowledged", "resolved"];

const SEVERITY_STYLE = {
  critical: "bg-danger/15 text-danger",
  error: "bg-danger/10 text-danger",
  warning: "bg-status-delayed-soft text-status-delayed",
  info: "bg-surface-2 text-content-muted",
};

const since = (date) => {
  if (!date) return "—";
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
};

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          tone === "danger" ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2.5 text-[11px] text-content-muted">{label}</p>
      <p className="data-mono text-[22px] font-extrabold leading-none text-content">
        {value}
      </p>
    </div>
  );
}

function SystemHealth() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: "", service: "", status: "open" });
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v)
      );

      const [summaryRes, listRes] = await Promise.all([
        getErrorSummary(),
        getErrorLogs({ ...params, limit: 50 }),
      ]);

      setSummary(summaryRes?.data || null);
      setRows(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load system health");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openIncident = async (row) => {
    try {
      /* The list is fetched without stacks — they are large and only wanted
         when an incident is actually being looked at. */
      const res = await getErrorLog(row._id);
      setOpen(res?.data || row);
    } catch {
      setOpen(row);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await updateErrorLog(id, { status });
      toast.success(`Marked ${status}`);
      setOpen(null);
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't update that incident");
    }
  };

  const set = (field) => (e) =>
    setFilters((f) => ({ ...f, [field]: e.target.value }));

  return (
    <AdminLayout
      title="System Health"
      subtitle="Production incidents, grouped by cause"
      actions={
        <button
          type="button"
          onClick={load}
          className="flex h-9 items-center gap-1.5 rounded-input border border-line px-3 text-[13px] font-semibold text-content"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat
          icon={ShieldAlert}
          label="Open critical"
          value={summary?.critical ?? "—"}
          tone={summary?.critical > 0 ? "danger" : undefined}
        />
        <Stat icon={AlertTriangle} label="Open incidents" value={summary?.open ?? "—"} />
        <Stat icon={Activity} label="Seen today" value={summary?.today ?? "—"} />
        <Stat icon={Activity} label="Seen this week" value={summary?.week ?? "—"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <div className="min-w-[140px] flex-1">
          <label className={labelClass}>Severity</label>
          <select className={inputClass} value={filters.severity} onChange={set("severity")}>
            <option value="">Any</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={filters.status} onChange={set("status")}>
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className={labelClass}>Service</label>
          <input
            className={inputClass}
            value={filters.service}
            onChange={set("service")}
            placeholder="database, api…"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading && <GlassSkeleton className="h-20" count={4} />}

        {!loading &&
          rows.map((row) => (
            <button
              key={row._id}
              type="button"
              onClick={() => openIncident(row)}
              className="flex w-full items-start gap-3 rounded-card border border-line bg-surface p-3.5 text-left transition-colors hover:border-accent-line"
            >
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  SEVERITY_STYLE[row.severity] || SEVERITY_STYLE.info
                }`}
              >
                {row.severity}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-content">
                  {row.code}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-content-muted">
                  {row.service}
                  {row.endpoint ? ` · ${row.method} ${row.endpoint}` : ""}
                </span>
              </span>

              <span className="shrink-0 text-right">
                {/* The number that matters: one incident, however many times it
                    has fired. */}
                <span className="data-mono block text-[15px] font-extrabold text-content">
                  {row.occurrences}
                </span>
                <span className="block text-[10.5px] text-content-muted">
                  {since(row.lastSeenAt)}
                </span>
              </span>
            </button>
          ))}
      </div>

      {!loading && rows.length === 0 && (
        <GlassEmptyState
          icon={CheckCircle2}
          title="Nothing broken"
          description={
            filters.status === "open"
              ? "No open incidents. Anything that fails in production will appear here."
              : "No incidents match those filters."
          }
          className="mt-12"
        />
      )}

      <GlassModal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.code || ""}>
        {open && (
          <div className="space-y-3.5">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_STYLE[open.severity]}`}>
                {open.severity}
              </span>
              <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase text-content-muted">
                {open.service}
              </span>
              <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase text-content-muted">
                {open.environment}
              </span>
            </div>

            <dl className="divide-y divide-divider text-[12.5px]">
              {[
                ["Occurrences", open.occurrences],
                ["Endpoint", open.endpoint ? `${open.method} ${open.endpoint}` : "—"],
                ["Status code", open.statusCode],
                ["First seen", open.firstSeenAt ? new Date(open.firstSeenAt).toLocaleString() : "—"],
                ["Last seen", open.lastSeenAt ? new Date(open.lastSeenAt).toLocaleString() : "—"],
                ["Request ID", open.context?.requestId || "—"],
                ["User role", open.context?.userRole || "—"],
                ["Alerts sent", open.alertsSent ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 py-2">
                  <dt className="text-content-muted">{label}</dt>
                  <dd className="data-mono text-right font-bold text-content">{String(value)}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className={labelClass}>Message</p>
              <p className="rounded-input bg-surface-2 p-3 text-[12px] leading-relaxed text-content">
                {open.message || "—"}
              </p>
            </div>

            {open.stack && (
              <div>
                <p className={labelClass}>Stack</p>
                <pre className="max-h-64 overflow-auto rounded-input bg-surface-2 p-3 text-[11px] leading-relaxed text-content-muted">
                  {open.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-2">
              {open.status !== "acknowledged" && (
                <button
                  type="button"
                  onClick={() => setStatus(open._id, "acknowledged")}
                  className="h-10 flex-1 rounded-input border border-line text-[13px] font-bold text-content"
                >
                  Acknowledge
                </button>
              )}
              {open.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => setStatus(open._id, "resolved")}
                  className="h-10 flex-1 rounded-input bg-accent text-[13px] font-bold text-white"
                >
                  Resolve
                </button>
              )}
            </div>

            {/* Resolving closes this incident for good: the reporter only ever
                groups into a row that is not resolved, so the same failure
                happening again opens a fresh one rather than quietly reviving
                this. That is what makes "resolved" mean something. */}
            <p className="text-[11px] text-content-muted">
              Resolving closes this incident. If it happens again it opens a new one.
            </p>
          </div>
        )}
      </GlassModal>
    </AdminLayout>
  );
}

export default SystemHealth;
