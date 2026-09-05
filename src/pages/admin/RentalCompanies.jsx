import { useCallback, useEffect, useState } from "react";
import { Ban, Building2, Car, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassModal, GlassEmptyState, GlassSkeleton } from "../../components/glass";
import { inputClass, labelClass } from "../../components/admin/adminFormStyles";
import {
  getRentalCompanies,
  createRentalCompany,
  suspendRentalCompany,
} from "../../services/rentalService";
import { useRentalCatalog } from "../../hooks/useRentalCatalog";
import { getUploadUrl } from "../../config";

/**
 * The operators allowed to hire vehicles out on the platform.
 *
 * Creating one here IS the approval — the Super Admin typing a company in has
 * already decided it may trade. The pending state exists for a future
 * self-signup route and is shown, not set, from this screen.
 */

const STATUS_STYLE = {
  approved: "bg-status-live-soft text-status-live",
  pending: "bg-status-delayed-soft text-status-delayed",
  suspended: "bg-danger/10 text-danger",
};

const EMPTY = {
  name: "",
  types: [],
  categories: [],
  serviceAreas: "",
  bookingMode: "quote",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  address: "",
  description: "",
  platformFee: "",
};

function RentalCompanies() {
  const catalog = useRentalCatalog();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;

      const res = await getRentalCompanies(params);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load rental companies");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (field, id) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id)
        ? f[field].filter((v) => v !== id)
        : [...f[field], id],
    }));

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Give the company a name");
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      data.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
    });
    if (logo) data.append("logo", logo);

    setSaving(true);
    try {
      const res = await createRentalCompany(data);
      toast.success(res.message || "Company created");
      setOpen(false);
      setForm(EMPTY);
      setLogo(null);
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't create the company");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (company) => {
    if (
      !window.confirm(
        `Suspend ${company.name}? Its vehicles come off the market and its sign-in stops working. Bookings are kept.`
      )
    ) {
      return;
    }

    try {
      const res = await suspendRentalCompany(company._id);
      toast.success(res.message || "Company suspended");
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't suspend the company");
    }
  };

  return (
    <AdminLayout
      title="Rental Companies"
      subtitle="Operators hiring vehicles out for weddings and private trips"
      actions={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-input bg-accent px-3.5 text-[13px] font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add company
        </button>
      }
    >
      <div className="flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-faint" />
          <input
            className={`${inputClass} pl-9`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email…"
          />
        </div>
        <select
          className={`${inputClass} w-40 shrink-0`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Any status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {loading && <GlassSkeleton className="h-24" count={4} />}

        {!loading &&
          rows.map((company) => (
            <div
              key={company._id}
              className="flex gap-3.5 rounded-card border border-line bg-surface p-3.5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
                {company.logo ? (
                  <img
                    src={getUploadUrl(company.logo, 120)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Car className="h-6 w-6 text-content-faint" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[14px] font-bold text-content">
                    {company.name}
                  </p>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      STATUS_STYLE[company.status] || STATUS_STYLE.pending
                    }`}
                  >
                    {company.status}
                  </span>
                </div>

                <p className="mt-0.5 truncate text-[11.5px] text-content-muted">
                  {(company.types || []).map(catalog.typeLabel).join(" · ") ||
                    "No type set"}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-content-muted">
                  <span className="data-mono">
                    {(company.categories || []).length} categories
                  </span>
                  <span className="data-mono">
                    {company.bookingMode === "instant"
                      ? "Instant booking"
                      : company.bookingMode === "both"
                      ? "Instant or quote"
                      : "Quote first"}
                  </span>
                  {company.platformFee > 0 && (
                    <span className="data-mono">Rs {company.platformFee}/booking</span>
                  )}
                </div>

                {company.status !== "suspended" && (
                  <button
                    type="button"
                    onClick={() => handleSuspend(company)}
                    className="mt-2 flex items-center gap-1.5 rounded-lg border border-danger/30 px-2.5 py-1 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {!loading && rows.length === 0 && (
        <GlassEmptyState
          icon={Building2}
          title={search || status ? "No companies match" : "No rental companies yet"}
          description={
            search || status
              ? "Try a different search or status."
              : "Add the operators who hire out wedding buses, cars, Hiaces and shuttles. Each one gets its own sign-in and sees only its own work."
          }
          actionLabel={search || status ? undefined : "Add the first company"}
          onAction={search || status ? undefined : () => setOpen(true)}
          className="mt-12"
        />
      )}

      <GlassModal open={open} onClose={() => setOpen(false)} title="Add rental company">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className={labelClass}>Company name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={set("name")}
              placeholder="ABC Wedding & Transport"
            />
          </div>

          {catalog.ready && (
            <>
              <div>
                <label className={labelClass}>What they do</label>
                <div className="flex flex-wrap gap-1.5">
                  {catalog.companyTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggle("types", type.id)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        form.types.includes(type.id)
                          ? "bg-accent text-white"
                          : "border border-line bg-surface text-content-muted"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Vehicle categories they offer</label>
                <div className="flex flex-wrap gap-1.5">
                  {catalog.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggle("categories", cat.id)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        form.categories.includes(cat.id)
                          ? "bg-accent text-white"
                          : "border border-line bg-surface text-content-muted"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className={labelClass}>How they take work</label>
            <select className={inputClass} value={form.bookingMode} onChange={set("bookingMode")}>
              <option value="quote">Quote first — they price every request</option>
              <option value="instant">Instant — listed prices, booked directly</option>
              <option value="both">Both — instant where a price is listed</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Service areas (comma separated)</label>
            <input
              className={inputClass}
              value={form.serviceAreas}
              onChange={set("serviceAreas")}
              placeholder="Lahore, Okara, Faisalabad"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Contact name</label>
              <input className={inputClass} value={form.contactName} onChange={set("contactName")} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={form.contactPhone} onChange={set("contactPhone")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} value={form.contactEmail} onChange={set("contactEmail")} />
            </div>
            <div>
              <label className={labelClass}>Platform fee (Rs / booking)</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.platformFee}
                onChange={set("platformFee")}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] || null)}
              className="w-full text-[12.5px] text-content-muted"
            />
          </div>

          {/* Said here because it is the next thing the operator has to do and
              is easy to miss: a company without an admin account cannot sign
              in, however complete its profile. */}
          <p className="rounded-input bg-surface-2 p-3 text-[11.5px] leading-relaxed text-content-muted">
            Creating the company does not create its sign-in. Add an admin for it
            under <span className="font-semibold text-content">Admins</span>, with the
            role <span className="font-semibold text-content">Rental Company Admin</span>.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-input bg-accent text-[14px] font-bold text-white disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create company"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default RentalCompanies;
