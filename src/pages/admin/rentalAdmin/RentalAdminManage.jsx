import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  selectClass,
  textareaClass,
} from "../../../components/admin/adminFormStyles";
import { getRentalCompany, updateRentalCompany } from "../../../services/rentalService";
import { useRentalCatalog } from "../../../hooks/useRentalCatalog";
import { formatPrice } from "../../../utils/tours";
import { getUploadUrl } from "../../../config";
import useMyRentalCompany from "./useMyRentalCompany";

/**
 * The company's own profile.
 *
 * Its status and its platform fee are shown but not editable — those are the
 * platform's decisions, and the server ignores them from a company admin
 * whatever this form sends. Showing them read-only is honest about that;
 * hiding them would leave the operator guessing what fee they are paying.
 */

function RentalAdminManage() {
  const company = useMyRentalCompany();
  const catalog = useRentalCatalog();

  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    bookingMode: "quote",
    serviceAreas: "",
    types: [],
    categories: [],
  });
  const [logo, setLogo] = useState(null);

  const load = useCallback(async () => {
    if (!company.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getRentalCompany(company.id);
      const data = res?.data || null;
      setSaved(data);

      if (data) {
        setForm({
          name: data.name || "",
          description: data.description || "",
          contactName: data.contactName || "",
          contactPhone: data.contactPhone || "",
          contactEmail: data.contactEmail || "",
          address: data.address || "",
          bookingMode: data.bookingMode || "quote",
          serviceAreas: (data.serviceAreas || []).join(", "),
          types: data.types || [],
          categories: data.categories || [],
        });
      }
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load your company");
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggle = (field, id) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id)
        ? f[field].filter((v) => v !== id)
        : [...f[field], id],
    }));

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Your company needs a name");
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      data.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
    });
    if (logo) data.append("logo", logo);

    setSaving(true);
    try {
      const res = await updateRentalCompany(company.id, data);
      toast.success(res.message || "Saved");
      setLogo(null);
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't save your changes");
    } finally {
      setSaving(false);
    }
  };

  if (!company.id) {
    return (
      <AdminLayout requireRole="rentalAdmin" title="My Company">
        <GlassEmptyState
          icon={Building2}
          title="No company assigned yet"
          description="Ask the Super Admin to link your account to a rental company."
          className="mt-16"
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      requireRole="rentalAdmin"
      title="My Company"
      subtitle="What customers see about you"
    >
      {loading ? (
        <GlassSkeleton className="h-96" />
      ) : (
        <form onSubmit={handleSave} className="max-w-2xl space-y-3.5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
              {saved?.logo ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={getUploadUrl(saved.logo, 160)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-7 w-7 text-content-faint" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <label className={labelClass}>Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogo(e.target.files?.[0] || null)}
                className="w-full text-[12.5px] text-content-muted"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Company name</label>
            <input className={inputClass} value={form.name} onChange={set("name")} />
          </div>

          <div>
            <label className={labelClass}>About you</label>
            <textarea
              rows={3}
              className={textareaClass}
              value={form.description}
              onChange={set("description")}
              placeholder="Twelve years of wedding transport across central Punjab."
            />
          </div>

          {catalog.ready && (
            <>
              <div>
                <label className={labelClass}>What you do</label>
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
                <label className={labelClass}>Vehicle categories you offer</label>
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
            <label className={labelClass}>How you take work</label>
            <select
              className={selectClass}
              value={form.bookingMode}
              onChange={set("bookingMode")}
            >
              <option value="quote">Quote first — you price every request</option>
              <option value="instant">Instant — your listed prices, booked directly</option>
              <option value="both">Both — instant where a vehicle has a price</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Areas you serve (comma separated)</label>
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
              <input
                className={inputClass}
                value={form.contactName}
                onChange={set("contactName")}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                className={inputClass}
                value={form.contactPhone}
                onChange={set("contactPhone")}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              className={inputClass}
              value={form.contactEmail}
              onChange={set("contactEmail")}
            />
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input className={inputClass} value={form.address} onChange={set("address")} />
          </div>

          {/* Read-only: the platform's decisions about this company. */}
          <div className="rounded-card border border-line bg-surface p-3.5">
            <p className="text-[12.5px] font-semibold text-content">Set by the platform</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-content-muted">
              <span>
                Status:{" "}
                <span className="font-semibold text-content">{saved?.status || "—"}</span>
              </span>
              <span>
                Booking fee:{" "}
                <span className="font-semibold text-content">
                  {formatPrice(saved?.platformFee || 0)} per booking
                </span>
              </span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-content-faint">
              Added on top of the price you quote, so it comes out of what the
              customer pays rather than out of your figure.
            </p>
          </div>

          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </AdminLayout>
  );
}

export default RentalAdminManage;
