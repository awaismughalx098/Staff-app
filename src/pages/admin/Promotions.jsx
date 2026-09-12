import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Megaphone, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassEmptyState, GlassModal, GlassSkeleton } from "../../components/glass";
import EntityCard from "../../components/admin/EntityCard";
import {
  addButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  searchInputClass,
  searchWrapClass,
  textareaClass,
} from "../../components/admin/adminFormStyles";
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
} from "../../services/promotionService";
import { API_ORIGIN } from "../../config";

/* Mirrors the server's own upload filter, so the obvious mistakes are caught
   before a 5MB photo goes up the wire only to be refused. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

const EMPTY_FORM = {
  title: "",
  description: "",
  link: "",
  sortOrder: "0",
  isActive: true,
  image: null,
  preview: "",
};

const imageUrl = (img) => {
  if (!img) return "";
  if (img.startsWith("http") || img.startsWith("data:image")) return img;
  return `${API_ORIGIN}${img}`;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—";

function Promotions() {
  const fileRef = useRef(null);

  const [promotions, setPromotions] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await getPromotions();
      setPromotions(Array.isArray(res?.data) ? res.data : []);
    } catch {
      toast.error("Couldn't load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return promotions;
    return promotions.filter((p) =>
      [p.title, p.description, p.link].filter(Boolean).some((f) => f.toLowerCase().includes(text))
    );
  }, [promotions, query]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (promo) => {
    setEditingId(promo._id);
    setForm({
      title: promo.title || "",
      description: promo.description || "",
      link: promo.link || "",
      sortOrder: String(promo.sortOrder ?? 0),
      isActive: promo.isActive !== false,
      image: null,
      preview: imageUrl(promo.image),
    });
    setErrors({});
    setModalOpen(true);
  };

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setErrors((e) => ({ ...e, image: "Use a JPG, PNG or WebP image" }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, image: "That image is over 5MB — please use a smaller one" }));
      return;
    }

    setErrors((e) => ({ ...e, image: undefined }));
    setForm((f) => ({ ...f, image: file, preview: URL.createObjectURL(file) }));
  };

  const validate = () => {
    const next = {};
    if (!editingId && !form.image) next.image = "Choose an image for the banner";

    const link = form.link.trim();
    if (link && !link.startsWith("/") && !/^https?:\/\/\S+$/i.test(link)) {
      next.link = "Use an app route like /schedules, or a full https:// address";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (event) => {
    event.preventDefault();
    if (!validate() || saving) return;

    const body = new FormData();
    if (form.image) body.append("image", form.image);
    body.append("title", form.title.trim());
    body.append("description", form.description.trim());
    body.append("link", form.link.trim());
    body.append("sortOrder", String(Number(form.sortOrder) || 0));
    body.append("isActive", form.isActive ? "true" : "false");

    try {
      setSaving(true);
      if (editingId) await updatePromotion(editingId, body);
      else await createPromotion(body);

      toast.success(editingId ? "Promotion updated" : "Promotion added");
      setModalOpen(false);
      load();
    } catch (error) {
      /* The server's own validation wording is safe to show; anything else
         gets one plain sentence. */
      const message = error?.response?.status === 400 ? error.response?.data?.message : null;
      toast.error(message || "Couldn't save that promotion");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promo) => {
    const body = new FormData();
    body.append("isActive", promo.isActive === false ? "true" : "false");

    try {
      await updatePromotion(promo._id, body);
      toast.success(promo.isActive === false ? "Promotion is live" : "Promotion hidden");
      load();
    } catch {
      toast.error("Couldn't change that promotion");
    }
  };

  const remove = async (promo) => {
    try {
      await deletePromotion(promo._id);
      toast.success("Promotion deleted");
      load();
    } catch {
      toast.error("Couldn't delete that promotion");
    }
  };

  const liveCount = promotions.filter((p) => p.isActive !== false).length;

  return (
    <AdminLayout
      title="Promotions"
      subtitle="Banners on the passenger Home page"
      requireSuperAdmin
      actions={
        <button type="button" onClick={openAdd} className={addButtonClass}>
          <Plus className="h-4 w-4" />
          Add Promotion
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className={`${searchWrapClass} min-w-[200px] flex-1`}>
          <Search className="h-4 w-4 shrink-0 text-content-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, text or link"
            className={searchInputClass}
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-input border border-line px-3.5 text-[13px] font-bold text-content-muted transition-colors hover:text-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {!loading && promotions.length > 0 && (
        <p className="mb-3 px-1 text-[12.5px] text-content-muted">
          {liveCount} live on Home{promotions.length !== liveCount ? `, ${promotions.length - liveCount} hidden` : ""}.
          Lower order shows first.
        </p>
      )}

      {loading && <GlassSkeleton className="h-[160px]" count={3} />}

      {!loading && filtered.length === 0 && (
        <GlassEmptyState
          icon={Megaphone}
          title={query ? "Nothing matches that search" : "No promotions yet"}
          description={
            query
              ? "Try a different word."
              : "Add one and it appears at the top of the passenger Home page."
          }
          className="mt-12"
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((promo) => (
            <EntityCard
              key={promo._id}
              image={imageUrl(promo.image)}
              icon={ImageIcon}
              title={promo.title || "Untitled banner"}
              subtitle={promo.link || ""}
              meta={`Order ${promo.sortOrder ?? 0} · added ${formatDate(promo.createdAt)}`}
              badges={promo.description ? [promo.description.slice(0, 40)] : []}
              status={{
                active: promo.isActive !== false,
                label: promo.isActive !== false ? "Live" : "Hidden",
              }}
              onToggleStatus={() => toggleActive(promo)}
              onEdit={() => openEdit(promo)}
              onDelete={() => remove(promo)}
            />
          ))}
        </div>
      )}

      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit promotion" : "Add promotion"}
        subtitle="Shown at the top of the passenger Home page"
      >
        <form onSubmit={save} noValidate className="space-y-3.5">
          <div>
            <label className={labelClass}>Banner image</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full cursor-pointer items-center gap-3 rounded-input border border-line p-2 text-left transition-colors hover:border-accent-line"
            >
              <span className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/50">
                {form.preview ? (
                  <img src={form.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-content-muted" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-[12.5px] text-content-muted">
                {form.image?.name || (editingId ? "Keep the current image, or choose a new one" : "Choose an image")}
                <span className="mt-0.5 block text-[11.5px] text-content-faint">
                  JPG, PNG or WebP · up to 5MB · wide banners look best
                </span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pickImage}
              className="hidden"
            />
            {errors.image && (
              <p className="mt-1 text-[11.5px] font-semibold text-danger">{errors.image}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Title (optional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={80}
              placeholder="Leave empty to show the image alone"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Short description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={160}
              rows={2}
              placeholder="Only shown if you fill it in"
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>Link (optional)</label>
            <input
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="/schedules or https://…"
              className={inputClass}
            />
            {errors.link && (
              <p className="mt-1 text-[11.5px] font-semibold text-danger">{errors.link}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Status</label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={`h-[46px] w-full cursor-pointer rounded-input text-[13px] font-bold transition-colors ${
                  form.isActive
                    ? "bg-route-green-soft text-route-green"
                    : "bg-elevated text-content-muted"
                }`}
              >
                {form.isActive ? "Live on Home" : "Hidden"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : editingId ? "Save changes" : "Add promotion"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default Promotions;
