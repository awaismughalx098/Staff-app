import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Hotel as HotelIcon,
  ImagePlus,
  MessageSquare,
  Save,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import {
  inputClass,
  textareaClass,
  labelClass,
} from "../../../components/admin/adminFormStyles";
import {
  getHotelById,
  updateHotel,
  getHotelReviews,
} from "../../../services/hotelService";
import { getUploadUrl } from "../../../config";
import useMyHotel from "./useMyHotel";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const formatWhen = (date) =>
  new Date(date).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function HotelAdminManage() {
  const myHotel = useMyHotel();

  const [hotel, setHotel] = useState(null);
  const [form, setForm] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [coverFile, setCoverFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [keepImages, setKeepImages] = useState([]);
  const [keepVideos, setKeepVideos] = useState([]);

  const load = async () => {
    if (!myHotel.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [h, r] = await Promise.allSettled([
        getHotelById(myHotel.id),
        getHotelReviews(myHotel.id),
      ]);

      if (h.status === "fulfilled") {
        const data = h.value?.data;
        setHotel(data);
        setForm({
          name: data.name || "",
          city: data.city || "",
          address: data.address || "",
          description: data.description || "",
          pricePerNight: data.pricePerNight ?? "",
          contact: data.contact || "",
          amenities: (data.amenities || []).join(", "),
          lat: Number.isFinite(data.location?.lat) ? data.location.lat : "",
          lng: Number.isFinite(data.location?.lng) ? data.location.lng : "",
          isActive: data.isActive !== false,
        });
        setKeepImages(data.images || []);
        setKeepVideos(data.videos || []);
      }

      if (r.status === "fulfilled") {
        setReviews(Array.isArray(r.value?.data) ? r.value.data : []);
      }
    } catch {
      toast.error("Couldn't load your hotel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [myHotel.id]);

  const save = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.city.trim() || !form.description.trim()) {
      toast.error("Name, city and description are required");
      return;
    }
    if (
      (form.lat === "") !== (form.lng === "") ||
      (form.lat !== "" && !Number.isFinite(Number(form.lat))) ||
      (form.lng !== "" && !Number.isFinite(Number(form.lng)))
    ) {
      toast.error("Give both latitude and longitude, or leave both empty");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (coverFile) data.append("image", coverFile);
      galleryFiles.forEach((f) => data.append("images", f));
      videoFiles.forEach((f) => data.append("videos", f));
      /* Sent even when empty so removing every photo actually sticks. */
      data.append("keepImages", keepImages.join(","));
      data.append("keepVideos", keepVideos.join(","));

      const res = await updateHotel(myHotel.id, data);
      setHotel(res.data);
      setKeepImages(res.data.images || []);
      setKeepVideos(res.data.videos || []);
      setCoverFile(null);
      setGalleryFiles([]);
      setVideoFiles([]);
      toast.success("Your hotel is updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      requireRole="hotelAdmin"
      title="My Hotel"
      subtitle="This is what guests see in the app"
    >
      {!myHotel.id ? (
        <GlassEmptyState
          icon={HotelIcon}
          title="No hotel assigned yet"
          description="Ask the Super Admin to link your account to a hotel."
          className="mt-16"
        />
      ) : loading || !form ? (
        <div className="space-y-3">
          <GlassSkeleton className="h-40" />
          <GlassSkeleton className="h-16" count={4} />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          {getImageUrl(hotel?.image) && (
            <div className="mb-4 h-44 overflow-hidden rounded-card shadow-glass">
              <img
              loading="lazy"
              decoding="async"
                src={getImageUrl(hotel.image)}
                alt={hotel.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <form onSubmit={save} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Hotel name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>City *</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Address</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Price per night</span>
                <input
                  type="number"
                  min="0"
                  value={form.pricePerNight}
                  onChange={(e) =>
                    setForm({ ...form, pricePerNight: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Contact</span>
                <input
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Amenities (comma separated)</span>
              <input
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                placeholder="WiFi, Breakfast, Parking, Pool"
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

            <div className="rounded-card border border-line p-3.5">
              <p className="text-[12.5px] font-bold text-content">Location on map</p>
              <p className="mt-1 text-[11.5px] leading-5 text-content-muted">
                Paste the coordinates from Google Maps. Guests get road
                directions to this pin.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Latitude</span>
                  <input
                    inputMode="decimal"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    placeholder="31.5204"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Longitude</span>
                  <input
                    inputMode="decimal"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    placeholder="74.3587"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            <label className="glass-surface flex cursor-pointer items-center gap-3 rounded-card p-3.5">
              <ImagePlus className="h-5 w-5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-content-muted">
                {coverFile ? coverFile.name : "Replace cover photo"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            {/* GALLERY */}
            <div className="rounded-card border border-line p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-bold text-content">Gallery photos</p>
                <label className="cursor-pointer text-[12px] font-bold text-accent">
                  + Add
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      setGalleryFiles((p) => [...p, ...Array.from(e.target.files || [])])
                    }
                    className="hidden"
                  />
                </label>
              </div>

              {keepImages.length + galleryFiles.length === 0 ? (
                <p className="mt-2 text-[11.5px] text-content-muted">
                  No gallery photos yet.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {keepImages.map((src) => (
                    <span key={src} className="relative h-16 w-20">
                      <img
              loading="lazy"
              decoding="async"
                        src={getImageUrl(src)}
                        alt=""
                        className="h-full w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setKeepImages((p) => p.filter((s) => s !== src))
                        }
                        aria-label="Remove photo"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-danger text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {galleryFiles.map((file, i) => (
                    <span key={`${file.name}-${i}`} className="relative h-16 w-20">
                      <img
              loading="lazy"
              decoding="async"
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="h-full w-full rounded-lg object-cover ring-2 ring-accent"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setGalleryFiles((p) => p.filter((_, j) => j !== i))
                        }
                        aria-label="Remove photo"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-danger text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* VIDEOS */}
            <div className="rounded-card border border-line p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-content">
                  <Video className="h-4 w-4 text-accent" />
                  Videos
                </p>
                <label className="cursor-pointer text-[12px] font-bold text-accent">
                  + Add
                  <input
                    type="file"
                    multiple
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) =>
                      setVideoFiles((p) => [...p, ...Array.from(e.target.files || [])])
                    }
                    className="hidden"
                  />
                </label>
              </div>

              {keepVideos.length + videoFiles.length === 0 ? (
                <p className="mt-2 text-[11.5px] text-content-muted">
                  No videos yet. Up to 5 clips, 60MB each.
                </p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {keepVideos.map((src) => (
                    <div
                      key={src}
                      className="flex items-center gap-2 rounded-lg bg-elevated px-2.5 py-1.5"
                    >
                      <Video className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-content-muted">
                        {src.split("/").pop()}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setKeepVideos((p) => p.filter((s) => s !== src))
                        }
                        aria-label="Remove video"
                        className="shrink-0 cursor-pointer text-content-muted hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {videoFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-accent-soft px-2.5 py-1.5"
                    >
                      <Video className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-content">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVideoFiles((p) => p.filter((_, j) => j !== i))
                        }
                        aria-label="Remove video"
                        className="shrink-0 cursor-pointer text-content-muted hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="glass-surface flex cursor-pointer items-center justify-between rounded-card p-3.5">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-content">
                  Show on app
                </span>
                <span className="block text-[11.5px] text-content-muted">
                  Turn off to stop taking bookings
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

          {/* REVIEWS — read-only; guests own what they wrote */}
          <section className="glass-surface mt-6 rounded-card p-5 shadow-glass">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-[15px] font-bold text-content">
                Guest reviews
              </h3>
              {hotel?.reviewCount > 0 && (
                <span className="flex items-center gap-1 text-[12.5px] font-bold text-accent">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  {Number(hotel.rating).toFixed(1)} · {hotel.reviewCount}
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {reviews.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <MessageSquare className="h-8 w-8 text-content-faint" />
                  <p className="mt-2 text-[13px] text-content-muted">
                    No reviews yet.
                  </p>
                </div>
              ) : (
                reviews.map((r) => (
                  <motion.div
                    key={r._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-card border border-line bg-surface p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[13px] font-bold text-content">
                        {r.passenger?.name || "Guest"}
                      </p>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-3 w-3 ${
                              n <= r.rating
                                ? "fill-accent text-accent"
                                : "text-content-faint"
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-content-muted">
                      {formatWhen(r.createdAt)}
                    </p>
                    {r.comment && (
                      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-6 text-content-muted">
                        {r.comment}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

export default HotelAdminManage;
