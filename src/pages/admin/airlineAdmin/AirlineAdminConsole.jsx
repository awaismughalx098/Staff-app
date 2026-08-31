import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Info, Plane, Save } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { useAdminSession } from "../../../components/admin/AdminSession";
import { GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import {
  inputClass,
  textareaClass,
  labelClass,
} from "../../../components/admin/adminFormStyles";
import { getAirlineById, updateAirline } from "../../../services/airlineService";
import { getUploadUrl } from "../../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

/**
 * The airline's own listing.
 *
 * There is deliberately no revenue or bookings here: an Airline record holds
 * only a name, code, description, image and contact — there are no flights,
 * schedules or fares in the system yet, so there is nothing to sell or count.
 * Showing zeroed-out figures would imply the numbers were real.
 */
function AirlineAdminConsole() {
  const { scope, scopeId } = useAdminSession();
  const airline = { id: scopeId, name: scope?.name || null, code: scope?.code || null };

  const [form, setForm] = useState(null);
  const [current, setCurrent] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!airline.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getAirlineById(airline.id);
      const data = res?.data;
      setCurrent(data);
      setForm({
        name: data.name || "",
        code: data.code || "",
        description: data.description || "",
        contact: data.contact || "",
        isActive: data.isActive !== false,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your airline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [airline.id]);

  const save = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.code.trim() || !form.description.trim()) {
      toast.error("Name, code and description are required");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (imageFile) data.append("image", imageFile);

      const res = await updateAirline(airline.id, data);
      setCurrent(res.data);
      setImageFile(null);
      toast.success("Your airline is updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      requireRole="airlineAdmin"
      title={airline.name || "My Airline"}
      subtitle="Airline Admin"
    >
      {!airline.id ? (
        <GlassEmptyState
          icon={Plane}
          title="No airline assigned yet"
          description="Ask the Super Admin to link your account to an airline."
          className="mt-16"
        />
      ) : loading || !form ? (
        <div className="space-y-3">
          <GlassSkeleton className="h-40" />
          <GlassSkeleton className="h-16" count={3} />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-surface flex items-start gap-2.5 rounded-card p-3.5"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-[12px] leading-5 text-content-muted">
              Flight schedules and seat booking are not built yet, so there are
              no bookings or revenue to show. This page manages how your airline
              appears to passengers.
            </p>
          </motion.div>

          {getImageUrl(current?.image) && (
            <div className="mt-4 h-40 overflow-hidden rounded-card shadow-glass">
              <img
              loading="lazy"
              decoding="async"
                src={getImageUrl(current.image)}
                alt={current.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <form onSubmit={save} className="mt-4 space-y-3.5">
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 block">
                <span className={labelClass}>Airline name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Code *</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="PK"
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Contact</span>
              <input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Description *</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={textareaClass}
              />
            </label>

            <label className="glass-surface flex cursor-pointer items-center gap-3 rounded-card p-3.5">
              <ImagePlus className="h-5 w-5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-content-muted">
                {imageFile ? imageFile.name : "Replace cover photo"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            <label className="glass-surface flex cursor-pointer items-center justify-between rounded-card p-3.5">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-content">
                  Show on app
                </span>
                <span className="block text-[11.5px] text-content-muted">
                  Turn off to hide your airline from passengers
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
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

export default AirlineAdminConsole;
