import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Package, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import EntityCard from "../../../components/admin/EntityCard";
import {
  GlassEmptyState,
  GlassSkeleton,
  GlassModal,
} from "../../../components/glass";
import {
  addButtonClass,
  inputClass,
  labelClass,
  searchInputClass,
  searchWrapClass,
  textareaClass,
} from "../../../components/admin/adminFormStyles";
import {
  getTours,
  createTour,
  updateTour,
  deleteTour,
} from "../../../services/tourService";
import { formatDeparture, formatPrice } from "../../../utils/tours";
import { roleConfig } from "../../../config/adminRoles";
import { getUploadUrl } from "../../../config";
import useMyCompany from "../busAdmin/useMyCompany";

/* Tour.type is what passengers browse by, and it follows from the operator
   rather than being theirs to pick: a religious operator lists Umrah and
   Ziyarat, a tour operator lists northern trips. */
const TYPE_FOR_ROLE = {
  tourAdmin: "Northern",
  religiousAdmin: "Religious",
};

const EMPTY = {
  title: "",
  description: "",
  price: "",
  durationDays: 1,
  departureCity: "",
  departureDate: "",
  departureTime: "",
  groupType: "Both",
  /* Empty means no limit, which is how packages worked before seats. */
  totalSeats: "",
};

/* "3 of 20 seats left", or nothing when the package has no limit. */
const seatsLine = (tour) =>
  Number.isFinite(tour?.seatsLeft) && tour.totalSeats
    ? `${tour.seatsLeft} of ${tour.totalSeats} seats left`
    : "";

const getImageUrl = (img, width) => getUploadUrl(img, width);

/* <input type="date"> wants YYYY-MM-DD in local time; toISOString would shift
   the day backwards for anyone east of UTC. */
const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * An operator's own packages, listed and editable from their console.
 *
 * Same page for both tour and religious operators — they run the same model
 * and differ only in Company.kind, which the server reads off the account.
 * Nothing here sends a company: createTour pins new packages to the caller's
 * own operator, and update/delete refuse anything that is not theirs.
 *
 * @param {"tourAdmin"|"religiousAdmin"} role
 */
function TourAdminPackages({ role }) {
  const company = useMyCompany();
  const config = roleConfig(role);
  const type = TYPE_FOR_ROLE[role];

  const [tours, setTours] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);

  const load = async () => {
    if (!company.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getTours({ company: company.id });
      setTours(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load your packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [company.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (tour) => {
    setEditing(tour);
    setForm({
      title: tour.title || "",
      description: tour.description || "",
      price: tour.price ?? "",
      durationDays: tour.durationDays || 1,
      departureCity: tour.departureCity || "",
      departureDate: toDateInput(tour.departureDate),
      departureTime: tour.departureTime || "",
      groupType: tour.groupType || "Both",
      totalSeats: tour.totalSeats ?? "",
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim() || form.price === "") {
      toast.error("Title, description and price are required");
      return;
    }
    if (!form.departureDate) {
      toast.error("Set the departure date travellers will be booking");
      return;
    }

    setSaving(true);
    try {
      /* No type is sent: the server takes it from the company. */
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (imageFile) data.append("image", imageFile);

      if (editing) {
        const res = await updateTour(editing._id, data);
        setTours((prev) =>
          prev.map((t) => (t._id === editing._id ? res.data : t))
        );
        toast.success("Package updated");
      } else {
        const res = await createTour(data);
        setTours((prev) => [res.data, ...prev]);
        toast.success("Package added");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't save that package");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tour) => {
    try {
      const res = await deleteTour(tour._id);
      /* A package with bookings is hidden by the server rather than deleted,
         so it stays in the list — marked Hidden — instead of vanishing. */
      if (res?.data?._id) {
        setTours((prev) => prev.map((t) => (t._id === tour._id ? { ...t, ...res.data, company: t.company } : t)));
      } else {
        setTours((prev) => prev.filter((t) => t._id !== tour._id));
      }
      toast.success(res?.message || "Package deleted");
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't delete that package");
    }
  };

  /* Hiding a package leaves its bookings alone — it only stops new ones. */
  const toggleActive = async (tour) => {
    try {
      const data = new FormData();
      data.append("isActive", tour.isActive === false);
      const res = await updateTour(tour._id, data);
      setTours((prev) => prev.map((t) => (t._id === tour._id ? res.data : t)));
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't change that");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((t) =>
      [t.title, t.departureCity, t.groupType]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [tours, query]);

  return (
    <AdminLayout
      requireRole={role}
      title="My Packages"
      subtitle={company.name || config?.label}
      actions={
        <>
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className="glass-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {company.id && (
            <button type="button" onClick={openCreate} className={addButtonClass}>
              <Plus className="h-4 w-4" />
              Add
            </button>
          )}
        </>
      }
    >
      {!company.id ? (
        <GlassEmptyState
          icon={Package}
          title="No company assigned yet"
          description="Ask the Super Admin to link your account to a company."
          className="mt-16"
        />
      ) : (
        <>
          <div className={searchWrapClass}>
            <Search className="h-4 w-4 shrink-0 text-content-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your packages..."
              aria-label="Search packages"
              className={searchInputClass}
            />
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <GlassSkeleton className="h-[160px]" count={3} />
              </div>
            ) : filtered.length === 0 ? (
              <GlassEmptyState
                icon={Package}
                title={query ? "No packages match your search" : "No packages yet"}
                description={
                  query ? undefined : "Add your first trip so travellers can book it."
                }
                actionLabel={!query ? "Add a package" : undefined}
                onAction={!query ? openCreate : undefined}
                className="mt-16"
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((tour) => (
                  <EntityCard
                    key={tour._id}
                    image={getImageUrl(tour.image)}
                    icon={Package}
                    title={tour.title}
                    subtitle={`${formatPrice(tour.price)} · ${tour.durationDays}d`}
                    meta={[
                      formatDeparture(tour.departureDate, tour.departureTime) || "No departure set",
                      seatsLine(tour),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    status={{
                      label: tour.isActive !== false ? "Active" : "Hidden",
                      active: tour.isActive !== false,
                    }}
                    onToggleStatus={() => toggleActive(tour)}
                    onEdit={() => openEdit(tour)}
                    onDelete={() => remove(tour)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <GlassModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Package" : "Add Package"}
        subtitle={company.name || undefined}
      >
        <form onSubmit={save} className="space-y-3.5">
          <label className="block">
            <span className={labelClass}>Title *</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="7 Days Hunza & Skardu"
              className={inputClass}
            />
          </label>

          {/* Two columns on a phone, three from small tablets up: three
              inputs across a 320px sheet left each about 80px wide. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Price *</span>
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationDays: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="col-span-2 block sm:col-span-1">
              <span className={labelClass}>Departs from</span>
              <input
                value={form.departureCity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureCity: e.target.value }))
                }
                placeholder="Lahore"
                className={inputClass}
              />
            </label>
          </div>

          {/* Travellers book the date set here — they have no picker. */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Departure date *</span>
              <input
                type="date"
                value={form.departureDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureDate: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Departure time</span>
              <input
                value={form.departureTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureTime: e.target.value }))
                }
                placeholder="6:00 AM"
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Seats on this departure</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.totalSeats}
              onChange={(e) => setForm((f) => ({ ...f, totalSeats: e.target.value }))}
              placeholder="Leave empty for no limit"
              className={inputClass}
            />
            {editing && Number.isFinite(editing.seatsBooked) && editing.seatsBooked > 0 && (
              <span className="mt-1 block text-[11.5px] text-content-muted">
                {editing.seatsBooked} already booked
              </span>
            )}
          </label>

          {/* Only northern trips are filtered by travel style on the app. */}
          {type === "Northern" && (
            <label className="block">
              <span className={labelClass}>Travel style</span>
              <select
                value={form.groupType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, groupType: e.target.value }))
                }
                className={inputClass}
              >
                <option value="Both">Solo or Group</option>
                <option value="Solo">Solo only</option>
                <option value="Group">Group only</option>
              </select>
            </label>
          )}

          <label className="block">
            <span className={labelClass}>Description *</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What's included, itinerary highlights..."
              className={textareaClass}
            />
          </label>

          <label className="glass-surface flex cursor-pointer items-center gap-3 rounded-card p-3.5">
            <ImagePlus className="h-5 w-5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-content-muted">
              {imageFile
                ? imageFile.name
                : editing
                ? "Replace cover photo"
                : "Cover photo"}
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
            className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-[14px] font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Package"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default TourAdminPackages;
