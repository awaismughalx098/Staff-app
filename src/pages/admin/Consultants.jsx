import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import EntityCard from "../../components/admin/EntityCard";
import ConsultantForm, {
  EMPTY_CONSULTANT,
  consultantFormProblem,
  consultantToForm,
} from "../../components/admin/ConsultantForm";
import { GlassModal, GlassSkeleton, GlassEmptyState } from "../../components/glass";
import {
  addButtonClass,
  searchInputClass,
  searchWrapClass,
} from "../../components/admin/adminFormStyles";
import {
  getConsultants,
  createConsultant,
  updateConsultant,
  deleteConsultant,
} from "../../services/consultantService";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

function Consultants() {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CONSULTANT);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getConsultants();
      setConsultants(Array.isArray(res?.data) ? res.data : []);
    } catch {
      toast.error("Unable to load consultants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_CONSULTANT);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (consultant) => {
    setEditing(consultant);
    setForm(consultantToForm(consultant));
    setImageFile(null);
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    const problem = consultantFormProblem(form);

    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (imageFile) data.append("image", imageFile);

      if (editing) {
        const res = await updateConsultant(editing._id, data);
        setConsultants((prev) =>
          prev.map((c) => (c._id === editing._id ? res.data : c))
        );
        toast.success("Consultant updated");
      } else {
        const res = await createConsultant(data);
        setConsultants((prev) => [res.data, ...prev]);
        toast.success("Consultant added");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save that consultant");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (consultant) => {
    try {
      await deleteConsultant(consultant._id);
      setConsultants((prev) => prev.filter((c) => c._id !== consultant._id));
      toast.success("Consultant deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete that consultant");
    }
  };

  /* Hiding takes a consultancy off the app without losing its details. */
  const toggleActive = async (consultant) => {
    try {
      const data = new FormData();
      data.append("isActive", consultant.isActive === false);
      const res = await updateConsultant(consultant._id, data);
      setConsultants((prev) =>
        prev.map((c) => (c._id === consultant._id ? res.data : c))
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't change that");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return consultants;
    return consultants.filter((c) =>
      [c.name, c.city, ...(c.destinations || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [consultants, search]);

  return (
    <AdminLayout
      requireSuperAdmin
      title="Consultants"
      subtitle="Study and visa consultancies"
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
          placeholder="Search consultants..."
          aria-label="Search consultants"
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
            icon={GraduationCap}
            title={search ? "No consultants match your search" : "No consultants yet"}
            actionLabel={!search ? "Add your first consultant" : undefined}
            onAction={!search ? openCreate : undefined}
            className="mt-16"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((consultant) => (
              <EntityCard
                key={consultant._id}
                image={getImageUrl(consultant.image)}
                icon={GraduationCap}
                title={consultant.name}
                subtitle={consultant.city}
                meta={
                  (consultant.destinations || []).join(", ") || "No countries listed"
                }
                status={{
                  label: consultant.isActive !== false ? "Active" : "Hidden",
                  active: consultant.isActive !== false,
                }}
                onToggleStatus={() => toggleActive(consultant)}
                onEdit={() => openEdit(consultant)}
                onDelete={() => remove(consultant)}
              />
            ))}
          </div>
        )}
      </div>

      <GlassModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Consultant" : "Add Consultant"}
      >
        <form onSubmit={save} className="space-y-3.5">
          <ConsultantForm
            form={form}
            setForm={setForm}
            imageFile={imageFile}
            setImageFile={setImageFile}
            editing={Boolean(editing)}
          />

          <button
            type="submit"
            disabled={saving}
            className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-[14px] font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Consultant"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default Consultants;
