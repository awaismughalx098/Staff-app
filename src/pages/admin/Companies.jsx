import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  BusFront,
  Camera,
  ImageMinus,
  Plus,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassModal } from "../../components/glass";
import EntityCard from "../../components/admin/EntityCard";
import BusesPanel from "../../components/admin/BusesPanel";
import {
  addButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  searchInputClass,
  searchWrapClass,
  selectClass,
  textareaClass,
} from "../../components/admin/adminFormStyles";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from "../../services/companyService";
import { getCompanyBookings } from "../../services/bookingService";
import { getUploadUrl } from "../../config";

const getImageUrl = (image, width) => getUploadUrl(image, width);

const normalizeData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.companies)) return response.companies;
  if (Array.isArray(response?.buses)) return response.buses;
  return [];
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

/* ---------------------------------------------------------------- */
/* Company picker — superadmin only. Tap a card to drill into its   */
/* buses/bookings; edit/delete icons manage the company itself.     */
/* ---------------------------------------------------------------- */

const COMPANY_KINDS = [
  { id: "bus", label: "Bus company", hint: "Runs buses on scheduled routes" },
  { id: "tour", label: "Tour company", hint: "Northern and adventure packages" },
  { id: "religious", label: "Religious tours", hint: "Umrah and Ziyarat packages" },
];

const EMPTY_COMPANY_FORM = {
  name: "",
  kind: "bus",
  category: "Luxury",
  contact: "",
  description: "",
  image: null,
  preview: "",
};

function CompanyPicker({ onSelectCompany }) {
  const fileRef = useRef(null);

  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_COMPANY_FORM);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await getCompanies();
      setCompanies(normalizeData(response));
    } catch {
      toast.error("Unable to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const text = query.toLowerCase().trim();

    return companies.filter((company) => {
      /* Rows created before `kind` existed are bus operators. */
      if (kindFilter !== "all" && (company.kind || "bus") !== kindFilter) {
        return false;
      }
      if (!text) return true;
      return (
        company.name?.toLowerCase().includes(text) ||
        company.category?.toLowerCase().includes(text) ||
        company.contact?.toLowerCase().includes(text)
      );
    });
  }, [companies, query, kindFilter]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_COMPANY_FORM);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (company) => {
    setEditingId(company._id);
    setForm({
      name: company.name || "",
      kind: company.kind || "bus",
      category: company.category || "Luxury",
      contact: company.contact || "",
      description: company.description || "",
      image: null,
      preview: getImageUrl(company.image),
    });
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm({ ...form, image: file, preview: URL.createObjectURL(file) });
  };

  const removeImage = () => {
    setForm({ ...form, image: null, preview: "" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id) => {
    try {
      await deleteCompany(id);
      toast.success("Company deleted successfully");
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.message || "Company delete failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.category || !form.contact || !form.description) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("kind", form.kind);
      formData.append("category", form.category);
      formData.append("contact", form.contact);
      formData.append("description", form.description);
      if (form.image) formData.append("image", form.image);

      if (editingId) {
        await updateCompany(editingId, formData);
        toast.success("Company updated successfully");
      } else {
        await createCompany(formData);
        toast.success("Company added successfully");
      }

      setModalOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.message || "Company operation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Companies"
      subtitle="Select a company to manage its buses & bookings"
      actions={
        <>
          <button
            type="button"
            onClick={fetchCompanies}
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies..."
          className={searchInputClass}
        />
      </div>

      {/* Bus, tour and religious operators are separate sections */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[{ id: "all", label: "All" }, ...COMPANY_KINDS].map((k) => {
          const active = kindFilter === k.id;
          const count =
            k.id === "all"
              ? companies.length
              : companies.filter((c) => (c.kind || "bus") === k.id).length;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setKindFilter(k.id)}
              className={`flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-[12.5px] font-bold transition-colors duration-200 ${
                active
                  ? "bg-accent text-white"
                  : "glass-surface text-content-muted hover:text-content"
              }`}
            >
              {k.label}
              <span className={active ? "text-white/70" : "text-content-faint"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-surface h-[160px] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Building2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-content">No companies found</h2>
            <p className="mt-2 text-sm text-content-muted">
              Add your first company to show it in the passenger app.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCompanies.map((company) => (
              <EntityCard
                key={company._id}
                image={getImageUrl(company.image)}
                icon={Building2}
                title={company.name}
                subtitle={
                  COMPANY_KINDS.find((k) => k.id === (company.kind || "bus"))
                    ?.label
                }
                meta={`${company.category} · ${company.contact}`}
                status={{
                  label: company.isActive === false ? "Inactive" : "Active",
                  active: company.isActive !== false,
                }}
                onClick={() => onSelectCompany(company)}
                onEdit={() => openEdit(company)}
                onDelete={() => handleDelete(company._id)}
              />
            ))}
          </div>
        )}
      </div>

      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Company" : "Add Company"}
        subtitle="Company details must match backend fields."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass-surface rounded-xl p-3.5">
            <div className="flex items-center gap-3.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                {form.preview ? (
                  <img
              loading="lazy"
              decoding="async" src={form.preview} alt="Company" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-accent">
                    <Building2 className="h-7 w-7" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-content-muted">Company Logo</p>
                <p className="mt-1 text-[11px] leading-4 text-content-muted">
                  Shown on passenger home and route screens.
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-9 items-center justify-center gap-1.5 rounded-input bg-accent text-[12.5px] font-bold text-white"
              >
                <Camera className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="flex h-9 items-center justify-center gap-1.5 rounded-input bg-white/50 text-[12.5px] font-bold text-content-muted"
              >
                <ImageMinus className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Company Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g Faisal Movers"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Type of operator</label>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              className={selectClass}
            >
              {COMPANY_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11.5px] text-content-muted">
              {COMPANY_KINDS.find((k) => k.id === form.kind)?.hint}
            </p>
          </div>

          {form.kind === "bus" && (
            <div>
              <label className={labelClass}>Service tier</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={selectClass}
              >
                <option value="Luxury">Luxury</option>
                <option value="Business">Business</option>
                <option value="Local">Local</option>
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Contact Number</label>
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="03xxxxxxxxx"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Write company description..."
              rows={3}
              className={textareaClass}
            />
          </div>

          <button type="submit" disabled={saving} className={primaryButtonClass}>
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : editingId ? "Update Company" : "Add Company"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

/* ---------------------------------------------------------------- */
/* Bookings panel — always scoped to one company.                   */
/* ---------------------------------------------------------------- */

function BookingsPanel({ companyId }) {
  const [scope, setScope] = useState("current");
  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBookings = async (nextScope = scope) => {
    try {
      setLoading(true);
      const response = await getCompanyBookings(nextScope, companyId);
      setBookings(Array.isArray(response?.data) ? response.data : []);
    } catch {
      toast.error("Unable to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, companyId]);

  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    if (!text) return bookings;
    return bookings.filter(
      (b) =>
        b.passengerName?.toLowerCase().includes(text) ||
        b.bus?.busNo?.toLowerCase().includes(text)
    );
  }, [bookings, query]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {[
            { id: "current", label: "Current" },
            { id: "past", label: "Past" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={`h-9 cursor-pointer rounded-full px-4 text-[12.5px] font-bold transition-colors duration-200 ${
                scope === tab.id
                  ? "bg-accent text-white"
                  : "glass-surface text-content-muted hover:text-content"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fetchBookings()}
          aria-label="Refresh"
          className="glass-surface flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className={searchWrapClass}>
        <Search className="h-4 w-4 shrink-0 text-content-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bookings..."
          className={searchInputClass}
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-surface h-[160px] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Ticket className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-content">
              No {scope} bookings
            </h2>
            <p className="mt-2 text-sm text-content-muted">
              {scope === "current"
                ? "New ticket bookings for this company will show up here."
                : "Bookings move here 24 hours after departure."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((booking) => (
              <EntityCard
                key={booking._id}
                icon={Ticket}
                title={booking.passengerName}
                subtitle={`Seat ${booking.seatNumber}`}
                meta={`${booking.bus?.busNo || "—"} · ${booking.fromCity} → ${booking.toCity} · ${formatDate(
                  booking.travelDate
                )}`}
                badges={[booking.gender].filter(Boolean)}
                status={{
                  label: booking.status,
                  active: booking.status === "Confirmed",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Page: superadmin sees the company picker first, companyAdmin      */
/* lands straight on their own company's buses/bookings.            */
/* ---------------------------------------------------------------- */

/* Owner-only. A bus company admin has their own console at /bus-admin, so
   this page never has to narrow itself to one operator. */
function Companies() {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [tab, setTab] = useState("buses");

  if (!selectedCompany) {
    return <CompanyPicker onSelectCompany={setSelectedCompany} />;
  }

  return (
    <AdminLayout
      requireSuperAdmin
      title={selectedCompany.name}
      subtitle="Buses & bookings for this company"
      actions={
        <button
          type="button"
          onClick={() => setSelectedCompany(null)}
          className="glass-surface flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-content-muted transition-colors duration-200 hover:text-content"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Companies
        </button>
      }
    >
      <div className="mb-5 flex gap-2">
        {[
          { id: "buses", label: "Buses", icon: BusFront },
          { id: "bookings", label: "Bookings", icon: Ticket },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-bold transition-colors duration-200 ${
                active
                  ? "bg-accent text-white"
                  : "glass-surface text-content-muted hover:text-content"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "buses" ? (
        <BusesPanel companyId={selectedCompany._id} />
      ) : (
        <BookingsPanel companyId={selectedCompany._id} />
      )}
    </AdminLayout>
  );
}

export default Companies;
