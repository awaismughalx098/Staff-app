import { useCallback, useEffect, useState } from "react";
import {
  Car,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Snowflake,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassModal, GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  selectClass,
  textareaClass,
} from "../../../components/admin/adminFormStyles";
import {
  getRentalVehicles,
  createRentalVehicle,
  updateRentalVehicle,
  deleteRentalVehicle,
} from "../../../services/rentalService";
import { useRentalCatalog } from "../../../hooks/useRentalCatalog";
import { formatPrice } from "../../../utils/tours";
import { getUploadUrl } from "../../../config";
import useMyRentalCompany from "./useMyRentalCompany";

/**
 * The company's fleet.
 *
 * There is deliberately nothing about location on this page. A hired vehicle
 * is not tracked — the model has no position fields to show and the API has no
 * endpoint to ask — so a "where is it?" control here would be a promise the
 * platform does not keep.
 */

const EMPTY = {
  name: "",
  category: "",
  seats: "",
  registrationNumber: "",
  model: "",
  modelYear: "",
  luggageCapacity: "",
  transmission: "",
  fuelType: "",
  hasAC: true,
  description: "",
  features: "",

  isBridalVehicle: false,
  decorationAvailable: false,
  decorationPackage: "",
  uniformedDriver: false,
  weddingNotes: "",

  pricingModel: "custom_quote",
  basePrice: "",
  hourlyRate: "",
  dailyRate: "",
  extraHourRate: "",
  extraKmRate: "",
  driverCharges: "",
  decorationCharges: "",
  securityDeposit: "",
  fuelIncluded: false,
  otherCharges: "",

  driverIncluded: true,
  driverName: "",
  driverPhone: "",
  driverNotes: "",
};

/** A saved vehicle back into the flat shape the form and the API both use. */
const toForm = (v) => ({
  ...EMPTY,
  name: v.name || "",
  category: v.category || "",
  seats: v.seats ?? "",
  registrationNumber: v.registrationNumber || "",
  model: v.model || "",
  modelYear: v.modelYear ?? "",
  luggageCapacity: v.luggageCapacity || "",
  transmission: v.transmission || "",
  fuelType: v.fuelType || "",
  hasAC: v.hasAC !== false,
  description: v.description || "",
  features: (v.features || []).join(", "),

  isBridalVehicle: Boolean(v.wedding?.isBridalVehicle),
  decorationAvailable: Boolean(v.wedding?.decorationAvailable),
  decorationPackage: v.wedding?.decorationPackage || "",
  uniformedDriver: Boolean(v.wedding?.uniformedDriver),
  weddingNotes: v.wedding?.notes || "",

  pricingModel: v.pricing?.model || "custom_quote",
  basePrice: v.pricing?.basePrice ?? "",
  hourlyRate: v.pricing?.hourlyRate ?? "",
  dailyRate: v.pricing?.dailyRate ?? "",
  extraHourRate: v.pricing?.extraHourRate ?? "",
  extraKmRate: v.pricing?.extraKmRate ?? "",
  driverCharges: v.pricing?.driverCharges ?? "",
  decorationCharges: v.pricing?.decorationCharges ?? "",
  securityDeposit: v.pricing?.securityDeposit ?? "",
  fuelIncluded: Boolean(v.pricing?.fuelIncluded),
  otherCharges: v.pricing?.otherCharges || "",

  driverIncluded: v.driver?.included !== false,
  driverName: v.driver?.name || "",
  driverPhone: v.driver?.phone || "",
  driverNotes: v.driver?.notes || "",
});

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-content">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      {label}
    </label>
  );
}

function Money({ label, value, onChange }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        min="0"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  );
}

/** The headline figure for a vehicle, or nothing when it is quote-only. */
const priceLine = (v) => {
  const p = v.pricing || {};
  if (p.model === "per_hour" && p.hourlyRate) return `${formatPrice(p.hourlyRate)} / hour`;
  if (p.model === "per_day" && p.dailyRate) return `${formatPrice(p.dailyRate)} / day`;
  if (p.basePrice) return formatPrice(p.basePrice);
  return "Priced on request";
};

function RentalAdminFleet() {
  const company = useMyRentalCompany();
  const catalog = useRentalCatalog();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null); // { id? }
  const [form, setForm] = useState(EMPTY);
  const [keepImages, setKeepImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search.trim()) params.search = search.trim();

      const res = await getRentalVehicles(params);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load your fleet");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const setValue = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const openAdd = () => {
    setForm(EMPTY);
    setKeepImages([]);
    setNewImages([]);
    setModal({});
  };

  const openEdit = (vehicle) => {
    setForm(toForm(vehicle));
    setKeepImages(vehicle.images || []);
    setNewImages([]);
    setModal({ id: vehicle._id });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.category || !form.seats) {
      toast.error("A vehicle needs a name, a category and a seat count");
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));

    /* Sent on every save, including when it is empty: the server only rebuilds
       the gallery when it hears about it, so omitting this would make removing
       the last photo impossible. */
    data.append("keepImages", JSON.stringify(keepImages));
    newImages.forEach((file) => data.append("images", file));

    setSaving(true);
    try {
      const res = modal.id
        ? await updateRentalVehicle(modal.id, data)
        : await createRentalVehicle(data);

      toast.success(res.message || "Saved");
      setModal(null);
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't save the vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicle) => {
    if (
      !window.confirm(
        `Take ${vehicle.name} off the market? Customers stop seeing it. Its existing bookings are kept.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteRentalVehicle(vehicle._id);
      toast.success(res.message || "Taken off the market");
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't remove the vehicle");
    }
  };

  const weddingRelevant =
    form.category === "wedding_bus" ||
    form.category === "luxury_car" ||
    form.isBridalVehicle ||
    form.decorationAvailable;

  return (
    <AdminLayout
      requireRole="rentalAdmin"
      title="My Fleet"
      subtitle={company.name || "Rental Company Admin"}
      actions={
        <button
          type="button"
          onClick={openAdd}
          className="flex h-9 items-center gap-1.5 rounded-input bg-accent px-3.5 text-[13px] font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add vehicle
        </button>
      }
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-faint" />
        <input
          className={`${inputClass} pl-9`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, registration or model…"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {loading && <GlassSkeleton className="h-28" count={4} />}

        {!loading &&
          rows.map((vehicle) => (
            <div
              key={vehicle._id}
              className={`flex gap-3.5 rounded-card border border-line bg-surface p-3.5 ${
                vehicle.isActive === false ? "opacity-60" : ""
              }`}
            >
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
                {vehicle.images?.[0] ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={getUploadUrl(vehicle.images[0], 200)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageOff className="h-6 w-6 text-content-faint" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[14px] font-bold text-content">
                    {vehicle.name}
                  </p>
                  {vehicle.isActive === false && (
                    <span className="shrink-0 rounded bg-content-muted/15 px-2 py-0.5 text-[10px] font-bold uppercase text-content-muted">
                      Off market
                    </span>
                  )}
                </div>

                <p className="mt-0.5 truncate text-[11.5px] text-content-muted">
                  {catalog.categoryLabel(vehicle.category)}
                  {vehicle.registrationNumber ? ` · ${vehicle.registrationNumber}` : ""}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-content-muted">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {vehicle.seats}
                  </span>
                  {vehicle.hasAC && (
                    <span className="flex items-center gap-1">
                      <Snowflake className="h-3.5 w-3.5" />
                      AC
                    </span>
                  )}
                  <span className="data-mono">{priceLine(vehicle)}</span>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(vehicle)}
                    className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-content-muted transition-colors hover:text-content"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {vehicle.isActive !== false && (
                    <button
                      type="button"
                      onClick={() => handleDelete(vehicle)}
                      className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-2.5 py-1 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {!loading && rows.length === 0 && (
        <GlassEmptyState
          icon={Car}
          title={search ? "No vehicles match" : "No vehicles yet"}
          description={
            search
              ? "Try a different search."
              : "Add the cars, Hiaces, coasters and wedding buses you hire out. Customers see them as soon as they are saved."
          }
          actionLabel={search ? undefined : "Add your first vehicle"}
          onAction={search ? undefined : openAdd}
          className="mt-12"
        />
      )}

      <GlassModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.id ? "Edit vehicle" : "Add vehicle"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={set("name")}
                placeholder="Decorated Coaster"
              />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select className={selectClass} value={form.category} onChange={set("category")}>
                <option value="">Pick one</option>
                {catalog.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Seats</label>
              <input
                type="number"
                min="1"
                max="80"
                className={inputClass}
                value={form.seats}
                onChange={set("seats")}
              />
            </div>

            <div>
              <label className={labelClass}>Registration</label>
              <input
                className={inputClass}
                value={form.registrationNumber}
                onChange={set("registrationNumber")}
                placeholder="LEA-1234"
              />
            </div>

            <div>
              <label className={labelClass}>Model</label>
              <input
                className={inputClass}
                value={form.model}
                onChange={set("model")}
                placeholder="Toyota Coaster"
              />
            </div>

            <div>
              <label className={labelClass}>Year</label>
              <input
                type="number"
                className={inputClass}
                value={form.modelYear}
                onChange={set("modelYear")}
                placeholder="2021"
              />
            </div>

            <div>
              <label className={labelClass}>Transmission</label>
              <select
                className={selectClass}
                value={form.transmission}
                onChange={set("transmission")}
              >
                <option value="">Not stated</option>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Fuel</label>
              <input
                className={inputClass}
                value={form.fuelType}
                onChange={set("fuelType")}
                placeholder="Diesel"
              />
            </div>

            <div>
              <label className={labelClass}>Luggage</label>
              <input
                className={inputClass}
                value={form.luggageCapacity}
                onChange={set("luggageCapacity")}
                placeholder="4 large bags"
              />
            </div>
          </div>

          <Toggle label="Air conditioned" checked={form.hasAC} onChange={setValue("hasAC")} />

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              className={textareaClass}
              value={form.description}
              onChange={set("description")}
              placeholder="What makes this vehicle worth hiring."
            />
          </div>

          <div>
            <label className={labelClass}>Features (comma separated)</label>
            <input
              className={inputClass}
              value={form.features}
              onChange={set("features")}
              placeholder="Reclining seats, Sound system, Curtains"
            />
          </div>

          {/* ── Photos ─────────────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>Photos</label>

            {keepImages.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {keepImages.map((src) => (
                  <span key={src} className="relative">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={getUploadUrl(src, 160)}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setKeepImages((k) => k.filter((x) => x !== src))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewImages(Array.from(e.target.files || []).slice(0, 8))}
              className="w-full text-[12.5px] text-content-muted"
            />
            {newImages.length > 0 && (
              <p className="mt-1 text-[11.5px] text-content-muted">
                {newImages.length} new photo{newImages.length === 1 ? "" : "s"} will be
                added when you save.
              </p>
            )}
          </div>

          {/* ── Pricing ────────────────────────────────────────────────── */}
          <div className="border-t border-line pt-3.5">
            <label className={labelClass}>How this vehicle is priced</label>
            <select
              className={selectClass}
              value={form.pricingModel}
              onChange={set("pricingModel")}
            >
              {catalog.pricingModels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            {catalog.isQuoteOnly(form.pricingModel) && (
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-content-muted">
                No price is shown to the customer. Every request comes to you to
                price before it can be confirmed.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Money label="Base price" value={form.basePrice} onChange={setValue("basePrice")} />
            <Money label="Per hour" value={form.hourlyRate} onChange={setValue("hourlyRate")} />
            <Money label="Per day" value={form.dailyRate} onChange={setValue("dailyRate")} />
            <Money
              label="Extra hour"
              value={form.extraHourRate}
              onChange={setValue("extraHourRate")}
            />
            <Money label="Per extra km" value={form.extraKmRate} onChange={setValue("extraKmRate")} />
            <Money
              label="Driver charges"
              value={form.driverCharges}
              onChange={setValue("driverCharges")}
            />
            <Money
              label="Decoration"
              value={form.decorationCharges}
              onChange={setValue("decorationCharges")}
            />
            <Money
              label="Security deposit"
              value={form.securityDeposit}
              onChange={setValue("securityDeposit")}
            />
          </div>

          <Toggle
            label="Fuel included in the price"
            checked={form.fuelIncluded}
            onChange={setValue("fuelIncluded")}
          />

          <div>
            <label className={labelClass}>Anything else the customer pays</label>
            <input
              className={inputClass}
              value={form.otherCharges}
              onChange={set("otherCharges")}
              placeholder="Toll and parking at actuals"
            />
          </div>

          {/* ── Driver ─────────────────────────────────────────────────── */}
          <div className="border-t border-line pt-3.5">
            <Toggle
              label="A driver comes with the vehicle"
              checked={form.driverIncluded}
              onChange={setValue("driverIncluded")}
            />

            {form.driverIncluded && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Driver name</label>
                    <input
                      className={inputClass}
                      value={form.driverName}
                      onChange={set("driverName")}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Driver phone</label>
                    <input
                      className={inputClass}
                      value={form.driverPhone}
                      onChange={set("driverPhone")}
                    />
                  </div>
                </div>

                {/* Says plainly what this driver is and is not, because the same
                    company may also run tracked intercity buses. */}
                <p className="mt-2 rounded-input bg-surface-2 p-3 text-[11.5px] leading-relaxed text-content-muted">
                  These are contact details printed on the booking. A rental
                  driver has no app account and a hired vehicle is not tracked —
                  the customer gets the phone number, not a live map.
                </p>
              </>
            )}
          </div>

          {/* ── Wedding extras ─────────────────────────────────────────── */}
          {weddingRelevant && (
            <div className="space-y-2.5 border-t border-line pt-3.5">
              <p className="font-display text-[13px] font-bold text-content">
                Wedding extras
              </p>
              <Toggle
                label="Suitable as the bridal vehicle"
                checked={form.isBridalVehicle}
                onChange={setValue("isBridalVehicle")}
              />
              <Toggle
                label="Decoration available"
                checked={form.decorationAvailable}
                onChange={setValue("decorationAvailable")}
              />
              <Toggle
                label="Driver in uniform"
                checked={form.uniformedDriver}
                onChange={setValue("uniformedDriver")}
              />
              <div>
                <label className={labelClass}>Decoration package</label>
                <input
                  className={inputClass}
                  value={form.decorationPackage}
                  onChange={set("decorationPackage")}
                  placeholder="Fresh flowers, ribbons and number plate"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : modal?.id ? "Save changes" : "Add vehicle"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default RentalAdminFleet;
