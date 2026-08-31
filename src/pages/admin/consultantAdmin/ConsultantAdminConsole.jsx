import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Save } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { useAdminSession } from "../../../components/admin/AdminSession";
import ConsultantForm, {
  EMPTY_CONSULTANT,
  consultantFormProblem,
  consultantToForm,
} from "../../../components/admin/ConsultantForm";
import { GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import {
  getConsultantById,
  updateConsultant,
} from "../../../services/consultantService";
import { getUploadUrl } from "../../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

/**
 * A consultancy's own listing.
 *
 * They edit everything visitors see — description, countries, services,
 * requirements, office pin and phone — but listing a new consultancy or
 * removing one stays with the Super Admin, the same split hotels and
 * airlines already use. The API enforces that; this only draws it.
 */
function ConsultantAdminConsole() {
  const { scopeId, scopeName } = useAdminSession();

  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!scopeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getConsultantById(scopeId);
      setCurrent(res?.data || null);
      setForm(consultantToForm(res?.data || EMPTY_CONSULTANT));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your listing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [scopeId]);

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

      const res = await updateConsultant(scopeId, data);
      setCurrent(res.data);
      setForm(consultantToForm(res.data));
      setImageFile(null);
      toast.success("Your listing is updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  const cover = getImageUrl(current?.image);

  return (
    <AdminLayout
      requireRole="consultantAdmin"
      title={scopeName || "My Consultancy"}
      subtitle="Consultant Admin"
    >
      {!scopeId ? (
        <GlassEmptyState
          icon={GraduationCap}
          title="No consultancy assigned yet"
          description="Ask the Super Admin to link your account to a consultancy."
          className="mt-16"
        />
      ) : loading || !form ? (
        <div className="space-y-3">
          <GlassSkeleton className="h-40" />
          <GlassSkeleton className="h-16" count={3} />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          {cover && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-40 overflow-hidden rounded-card shadow-glass"
            >
              <img
              loading="lazy"
              decoding="async"
                src={cover}
                alt={current.name}
                className="h-full w-full object-cover"
              />
            </motion.div>
          )}

          <form onSubmit={save} className={`space-y-3.5 ${cover ? "mt-4" : ""}`}>
            <ConsultantForm
              form={form}
              setForm={setForm}
              imageFile={imageFile}
              setImageFile={setImageFile}
              editing
            />

            <label className="glass-surface flex cursor-pointer items-center justify-between rounded-card p-3.5">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-content">
                  Show on app
                </span>
                <span className="block text-[11.5px] text-content-muted">
                  Turn off to hide your listing from visitors
                </span>
              </span>
              <input
                type="checkbox"
                checked={current?.isActive !== false}
                onChange={async (e) => {
                  const data = new FormData();
                  data.append("isActive", e.target.checked);
                  try {
                    const res = await updateConsultant(scopeId, data);
                    setCurrent(res.data);
                  } catch (err) {
                    toast.error(
                      err?.response?.data?.message || "Couldn't change that"
                    );
                  }
                }}
                className="h-5 w-5 shrink-0 cursor-pointer accent-[color:var(--accent)]"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-[14px] font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

export default ConsultantAdminConsole;
