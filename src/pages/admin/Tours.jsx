import { useEffect, useMemo, useState } from "react";
import { Globe, ImagePlus, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import EntityCard from "../../components/admin/EntityCard";
import { GlassModal, GlassSkeleton, GlassEmptyState } from "../../components/glass";
import {
  addButtonClass,
  inputClass,
  textareaClass,
  labelClass,
  searchInputClass,
  searchWrapClass,
} from "../../components/admin/adminFormStyles";
import { getCompanies } from "../../services/companyService";
import { getTours, createTour, updateTour, deleteTour } from "../../services/tourService";
import { formatDeparture, formatPrice } from "../../utils/tours";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const EMPTY_FORM = {
  company: "",
  type: "Religious",
  groupType: "Both",
  title: "",
  description: "",
  price: "",
  durationDays: 1,
  departureCity: "",
  departureDate: "",
  departureTime: "",
};

/* <input type="date"> wants YYYY-MM-DD in local time; toISOString would shift
   the day backwards for anyone east of UTC, which is everyone here. */
const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function Tours() {
  const [tours, setTours] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tourRes, companyRes] = await Promise.all([getTours(), getCompanies()]);
      setTours(Array.isArray(tourRes?.data) ? tourRes.data : []);
      const companyList = Array.isArray(companyRes)
        ? companyRes
        : Array.isArray(companyRes?.data)
        ? companyRes.data
        : [];
      /* Tours belong to tour and religious operators only — a bus company
         here would create a package no tour admin could manage. */
      setCompanies(
        companyList.filter(
          (c) => c.isActive !== false && (c.kind || "bus") !== "bus"
        )
      );
    } catch {
      toast.error("Unable to load tours");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((t) =>
      [t.title, t.type, t.groupType, t.company?.name, t.departureCity]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [tours, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (tour) => {
    setEditing(tour);
    setForm({
      company: tour.company?._id || "",
      type: tour.type,
      groupType: tour.groupType || "Both",
      title: tour.title,
      description: tour.description,
      price: tour.price,
      durationDays: tour.durationDays || 1,
      departureCity: tour.departureCity || "",
      departureDate: toDateInput(tour.departureDate),
      departureTime: tour.departureTime || "",
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.company || !form.title.trim() || !form.description.trim() || form.price === "") {
      toast.error("Company, title, description and price are required");
      return;
    }
    if (!form.departureDate) {
      toast.error("Set the departure date travellers will be booking");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (imageFile) data.append("image", imageFile);

      if (editing) {
        const res = await updateTour(editing._id, data);
        setTours((prev) => prev.map((t) => (t._id === editing._id ? res.data : t)));
        toast.success("Tour updated");
      } else {
        const res = await createTour(data);
        setTours((prev) => [res.data, ...prev]);
        toast.success("Tour created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save tour");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (tour) => {
    try {
      await deleteTour(tour._id);
      setTours((prev) => prev.filter((t) => t._id !== tour._id));
      toast.success("Tour deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete tour");
    }
  };

  const toggleActive = async (tour) => {
    try {
      const data = new FormData();
      data.append("isActive", !tour.isActive);
      const res = await updateTour(tour._id, data);
      setTours((prev) => prev.map((t) => (t._id === tour._id ? res.data : t)));
      toast.success(res.data.isActive ? "Tour activated" : "Tour hidden");
    } catch {
      toast.error("Failed to update tour");
    }
  };

  return (
    <AdminLayout
      requireSuperAdmin
      title="Tours"
      subtitle="Religious & Northern packages"
      actions={
        <>
          <button
            type="button"
            onClick={fetchData}
            aria-label="Refresh"
            className="glass-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={openCreate} className={addButtonClass}>
            <Plus className="h-4 w-4" />
            Add
          </button>
        </>
      }
    >
      <div className={searchWrapClass}>
        <Search className="h-4 w-4 shrink-0 text-content-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tours..."
          aria-label="Search tours"
          className={searchInputClass}
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <GlassSkeleton className="h-[160px]" count={4} />
          </div>
        ) : filtered.length === 0 ? (
          <GlassEmptyState
            icon={Globe}
            title={search ? "No tours match your search" : "No tours yet"}
            actionLabel={!search ? "Add your first tour" : undefined}
            onAction={!search ? openCreate : undefined}
            className="mt-16"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((tour) => (
              <EntityCard
                key={tour._id}
                image={getImageUrl(tour.image)}
                icon={Globe}
                title={tour.title}
                subtitle={tour.type}
                meta={`${tour.company?.name || "—"} · ${formatPrice(tour.price)} · ${tour.durationDays}d · ${
                  formatDeparture(tour.departureDate, tour.departureTime) ||
                  "No departure set"
                }`}
                status={{
                  label: tour.isActive !== false ? "Active" : "Hidden",
                  active: tour.isActive !== false,
                }}
                onToggleStatus={() => toggleActive(tour)}
                onEdit={() => openEdit(tour)}
                onDelete={() => performDelete(tour)}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Tour" : "Add Tour"}
      >
              <form onSubmit={handleSave} className="space-y-3.5">
                <label className="block">
                  <span className={labelClass}>Company *</span>
                  <select
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClass}>Type *</span>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="Religious">Religious</option>
                      <option value="Northern">Northern</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Travel style</span>
                    <select
                      value={form.groupType}
                      onChange={(e) => setForm((f) => ({ ...f, groupType: e.target.value }))}
                      className={inputClass}
                      disabled={form.type === "Religious"}
                    >
                      <option value="Both">Both</option>
                      <option value="Solo">Solo</option>
                      <option value="Group">Group</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Title *</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. 7-Day Hunza Valley Tour"
                    className={inputClass}
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className={labelClass}>Price (Rs) *</span>
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="45000"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Days</span>
                    <input
                      type="number"
                      min="1"
                      value={form.durationDays}
                      onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Departs from</span>
                    <input
                      type="text"
                      value={form.departureCity}
                      onChange={(e) => setForm((f) => ({ ...f, departureCity: e.target.value }))}
                      placeholder="Lahore"
                      className={inputClass}
                    />
                  </label>
                </div>

                {/* Travellers book the date the operator sets here — there is
                    no date picker on their side. */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClass}>Departure date *</span>
                    <input
                      type="date"
                      value={form.departureDate}
                      onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Departure time</span>
                    <input
                      type="text"
                      value={form.departureTime}
                      onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
                      placeholder="6:00 AM"
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Description *</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What's included, itinerary highlights..."
                    className={textareaClass}
                  />
                </label>

                <label className="glass-surface flex cursor-pointer items-center gap-3 rounded-card p-3.5">
                  <ImagePlus className="h-5 w-5 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-content-muted">
                    {imageFile
                      ? imageFile.name
                      : editing?.image
                      ? "Replace cover photo"
                      : "Upload cover photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-[50px] w-full cursor-pointer rounded-full bg-accent font-display text-[14px] font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Tour"}
                </button>
              </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default Tours;
