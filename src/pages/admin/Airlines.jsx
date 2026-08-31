import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Plane, Plus, RefreshCw, Search } from "lucide-react";
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
import {
  getAirlines,
  createAirline,
  updateAirline,
  deleteAirline,
} from "../../services/airlineService";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const EMPTY_FORM = { name: "", code: "", description: "", contact: "" };

function Airlines() {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAirlines = async () => {
    try {
      setLoading(true);
      const res = await getAirlines();
      setAirlines(Array.isArray(res?.data) ? res.data : []);
    } catch {
      toast.error("Unable to load airlines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAirlines();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return airlines;
    return airlines.filter((a) =>
      [a.name, a.code, a.contact].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [airlines, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (airline) => {
    setEditing(airline);
    setForm({
      name: airline.name,
      code: airline.code,
      description: airline.description,
      contact: airline.contact,
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.description.trim() || !form.contact.trim()) {
      toast.error("Name, code, description and contact are required");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (imageFile) data.append("image", imageFile);

      if (editing) {
        const res = await updateAirline(editing._id, data);
        setAirlines((prev) => prev.map((a) => (a._id === editing._id ? res.data : a)));
        toast.success("Airline updated");
      } else {
        const res = await createAirline(data);
        setAirlines((prev) => [res.data, ...prev]);
        toast.success("Airline created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save airline");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (airline) => {
    try {
      await deleteAirline(airline._id);
      setAirlines((prev) => prev.filter((a) => a._id !== airline._id));
      toast.success("Airline deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete airline");
    }
  };

  const toggleActive = async (airline) => {
    try {
      const data = new FormData();
      data.append("isActive", !airline.isActive);
      const res = await updateAirline(airline._id, data);
      setAirlines((prev) => prev.map((a) => (a._id === airline._id ? res.data : a)));
      toast.success(res.data.isActive ? "Airline activated" : "Airline hidden");
    } catch {
      toast.error("Failed to update airline");
    }
  };

  return (
    <AdminLayout
      requireSuperAdmin
      title="Airlines"
      subtitle="Airline ticket listings"
      actions={
        <>
          <button
            type="button"
            onClick={fetchAirlines}
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
          placeholder="Search airlines..."
          aria-label="Search airlines"
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
            icon={Plane}
            title={search ? "No airlines match your search" : "No airlines yet"}
            actionLabel={!search ? "Add your first airline" : undefined}
            onAction={!search ? openCreate : undefined}
            className="mt-16"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((airline) => (
              <EntityCard
                key={airline._id}
                image={getImageUrl(airline.image)}
                icon={Plane}
                title={airline.name}
                subtitle={airline.code}
                meta={airline.contact}
                status={{
                  label: airline.isActive !== false ? "Active" : "Hidden",
                  active: airline.isActive !== false,
                }}
                onToggleStatus={() => toggleActive(airline)}
                onEdit={() => openEdit(airline)}
                onDelete={() => performDelete(airline)}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Airline" : "Add Airline"}
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Airline name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Pakistan International Airlines"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Code *</span>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="PIA"
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Contact *</span>
            <input
              type="tel"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              placeholder="021-111-786-786"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Description *</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Routes, fleet, and what makes this airline stand out..."
              className={textareaClass}
            />
          </label>

          <label className="glass-surface flex cursor-pointer items-center gap-3 rounded-card p-3.5">
            <ImagePlus className="h-5 w-5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-content-muted">
              {imageFile
                ? imageFile.name
                : editing?.image
                ? "Replace logo"
                : "Upload airline logo"}
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
            {saving ? "Saving..." : editing ? "Save Changes" : "Create Airline"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default Airlines;
