import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageMinus, Newspaper, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassModal } from "../../components/glass";
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
import { createNews, deleteNews, getNews, updateNews } from "../../services/newsService";
import { API_ORIGIN } from "../../config";

const API_IMAGE = API_ORIGIN;

const EMPTY_FORM = { title: "", description: "", image: null, preview: "" };

function News() {
  const fileRef = useRef(null);

  const [news, setNews] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const normalize = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.news)) return response.news;
    return [];
  };

  const imageUrl = (img) => {
    if (!img) return "";
    if (img.startsWith("http") || img.startsWith("data:image")) return img;
    return `${API_IMAGE}${img}`;
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await getNews();
      setNews(normalize(response));
    } catch {
      toast.error("Unable to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredNews = useMemo(() => {
    const text = query.toLowerCase().trim();
    if (!text) return news;
    return news.filter(
      (item) =>
        item.title?.toLowerCase().includes(text) ||
        item.description?.toLowerCase().includes(text)
    );
  }, [news, query]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm({ ...form, image: file, preview: URL.createObjectURL(file) });
  };

  const removeImage = () => {
    setForm({ ...form, image: null, preview: "" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      image: null,
      preview: imageUrl(item.image),
    });
    setModalOpen(true);
  };

  const submitNews = async (e) => {
    e.preventDefault();

    if (!form.title || !form.description) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setSaving(true);

      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      if (form.image) data.append("image", form.image);

      if (editingId) {
        await updateNews(editingId, data);
        toast.success("News updated");
      } else {
        await createNews(data);
        toast.success("News created");
      }

      setModalOpen(false);
      resetForm();
      fetchNews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const removeNews = async (id) => {
    try {
      await deleteNews(id);
      toast.success("Deleted");
      fetchNews();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <AdminLayout
      requireSuperAdmin
      title="Transit News"
      subtitle="Announcements shown to passengers"
      actions={
        <>
          <button
            type="button"
            onClick={fetchNews}
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
          placeholder="Search news..."
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
        ) : filteredNews.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Newspaper className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-content">No news found</h2>
            <p className="mt-2 text-sm text-content-muted">
              Add your first transit announcement.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredNews.map((item) => (
              <EntityCard
                key={item._id}
                image={imageUrl(item.image)}
                icon={Newspaper}
                title={item.title}
                meta={item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Today"}
                onEdit={() => openEdit(item)}
                onDelete={() => removeNews(item._id)}
              />
            ))}
          </div>
        )}
      </div>

      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit News" : "Add News"}
      >
        <form onSubmit={submitNews} className="space-y-4">
          <div className="glass-surface rounded-xl p-3.5">
            <div className="flex items-center gap-3.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                {form.preview ? (
                  <img
              loading="lazy"
              decoding="async" src={form.preview} alt="News" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-accent">
                    <Newspaper className="h-7 w-7" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-content-muted">News Image</p>
                <p className="mt-1 text-[11px] leading-4 text-content-muted">
                  Upload an attractive cover image.
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
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
            <label className={labelClass}>News Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter news title"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Write news description..."
              rows={4}
              className={textareaClass}
            />
          </div>

          <button type="submit" disabled={saving} className={primaryButtonClass}>
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : editingId ? "Update News" : "Add News"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default News;
