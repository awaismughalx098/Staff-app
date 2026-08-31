import { useEffect, useMemo, useState } from "react";
import {
  Hotel as HotelIcon,
  ImagePlus,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
} from "lucide-react";
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
import { getHotels, createHotel, updateHotel, deleteHotel } from "../../services/hotelService";
import { formatPrice } from "../../utils/tours";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const EMPTY_FORM = {
  name: "",
  city: "",
  address: "",
  description: "",
  pricePerNight: "",
  rating: "",
  amenities: "",
  contact: "",
  lat: "",
  lng: "",
};

function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  /* Media already stored on the hotel; dropping one here removes it on save. */
  const [keepImages, setKeepImages] = useState([]);
  const [keepVideos, setKeepVideos] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const res = await getHotels();
      setHotels(Array.isArray(res?.data) ? res.data : []);
    } catch {
      toast.error("Unable to load hotels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter((h) =>
      [h.name, h.city, h.address].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [hotels, search]);

  const resetMedia = () => {
    setImageFile(null);
    setGalleryFiles([]);
    setVideoFiles([]);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    resetMedia();
    setKeepImages([]);
    setKeepVideos([]);
    setModalOpen(true);
  };

  const openEdit = (hotel) => {
    setEditing(hotel);
    setForm({
      name: hotel.name,
      city: hotel.city,
      address: hotel.address || "",
      description: hotel.description,
      pricePerNight: hotel.pricePerNight,
      rating: hotel.rating || "",
      amenities: (hotel.amenities || []).join(", "),
      contact: hotel.contact,
      lat: Number.isFinite(hotel.location?.lat) ? hotel.location.lat : "",
      lng: Number.isFinite(hotel.location?.lng) ? hotel.location.lng : "",
    });
    resetMedia();
    setKeepImages(hotel.images || []);
    setKeepVideos(hotel.videos || []);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.city.trim() ||
      !form.description.trim() ||
      form.pricePerNight === "" ||
      !form.contact.trim()
    ) {
      toast.error("Name, city, description, price and contact are required");
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
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (imageFile) data.append("image", imageFile);
      galleryFiles.forEach((file) => data.append("images", file));
      videoFiles.forEach((file) => data.append("videos", file));

      if (editing) {
        /* Sent even when empty, so clearing every photo actually sticks. */
        data.append("keepImages", keepImages.join(","));
        data.append("keepVideos", keepVideos.join(","));
      }

      if (editing) {
        const res = await updateHotel(editing._id, data);
        setHotels((prev) => prev.map((h) => (h._id === editing._id ? res.data : h)));
        toast.success("Hotel updated");
      } else {
        const res = await createHotel(data);
        setHotels((prev) => [res.data, ...prev]);
        toast.success("Hotel created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save hotel");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (hotel) => {
    try {
      await deleteHotel(hotel._id);
      setHotels((prev) => prev.filter((h) => h._id !== hotel._id));
      toast.success("Hotel deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete hotel");
    }
  };

  const toggleActive = async (hotel) => {
    try {
      const data = new FormData();
      data.append("isActive", !hotel.isActive);
      const res = await updateHotel(hotel._id, data);
      setHotels((prev) => prev.map((h) => (h._id === hotel._id ? res.data : h)));
      toast.success(res.data.isActive ? "Hotel activated" : "Hotel hidden");
    } catch {
      toast.error("Failed to update hotel");
    }
  };

  return (
    <AdminLayout
      requireSuperAdmin
      title="Hotels"
      subtitle="Rooms & availability management"
      actions={
        <>
          <button
            type="button"
            onClick={fetchHotels}
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
          placeholder="Search hotels..."
          aria-label="Search hotels"
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
            icon={HotelIcon}
            title={search ? "No hotels match your search" : "No hotels yet"}
            actionLabel={!search ? "Add your first hotel" : undefined}
            onAction={!search ? openCreate : undefined}
            className="mt-16"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((hotel) => (
              <EntityCard
                key={hotel._id}
                image={getImageUrl(hotel.image)}
                icon={HotelIcon}
                title={hotel.name}
                subtitle={hotel.rating > 0 ? `★ ${Number(hotel.rating).toFixed(1)}` : undefined}
                meta={`${hotel.city} · ${formatPrice(hotel.pricePerNight)}/night · ${
                  Number.isFinite(hotel.location?.lat) &&
                  Number.isFinite(hotel.location?.lng)
                    ? "📍 pinned"
                    : "no location"
                }`}
                status={{
                  label: hotel.isActive !== false ? "Active" : "Hidden",
                  active: hotel.isActive !== false,
                }}
                onToggleStatus={() => toggleActive(hotel)}
                onEdit={() => openEdit(hotel)}
                onDelete={() => performDelete(hotel)}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Hotel" : "Add Hotel"}
      >
              <form onSubmit={handleSave} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClass}>Hotel name *</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Serena Hotel"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>City *</span>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="Islamabad"
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Address</span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Street address"
                    className={inputClass}
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className={labelClass}>Price/night *</span>
                    <input
                      type="number"
                      min="0"
                      value={form.pricePerNight}
                      onChange={(e) => setForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                      placeholder="12000"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Rating (0-5)</span>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={form.rating}
                      onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                      placeholder="4.5"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Contact *</span>
                    <input
                      type="tel"
                      value={form.contact}
                      onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                      placeholder="051-1234567"
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Amenities (comma separated)</span>
                  <input
                    type="text"
                    value={form.amenities}
                    onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                    placeholder="WiFi, Breakfast, Parking, Pool"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Description *</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What makes this hotel special..."
                    className={textareaClass}
                  />
                </label>

                {/* LOCATION — drives the guest's "Get Location" directions */}
                <div className="rounded-card border border-line p-3.5">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-content">
                    <MapPin className="h-4 w-4 text-accent" />
                    Location on map
                  </p>
                  <p className="mt-1 text-[11.5px] leading-5 text-content-muted">
                    Paste the coordinates from Google Maps (right-click the spot
                    → click the lat, lng to copy). Guests get road directions to
                    this pin.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Latitude</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.lat}
                        onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                        placeholder="31.5204"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Longitude</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.lng}
                        onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                        placeholder="74.3587"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>

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

                {/* GALLERY */}
                <div className="rounded-card border border-line p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-bold text-content">
                      Gallery photos
                    </p>
                    <label className="cursor-pointer text-[12px] font-bold text-accent">
                      + Add
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          setGalleryFiles((prev) => [
                            ...prev,
                            ...Array.from(e.target.files || []),
                          ])
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
                              setKeepImages((prev) => prev.filter((s) => s !== src))
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
                              setGalleryFiles((prev) => prev.filter((_, j) => j !== i))
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
                          setVideoFiles((prev) => [
                            ...prev,
                            ...Array.from(e.target.files || []),
                          ])
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
                              setKeepVideos((prev) => prev.filter((s) => s !== src))
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
                              setVideoFiles((prev) => prev.filter((_, j) => j !== i))
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

                <button
                  type="submit"
                  disabled={saving}
                  className="h-[50px] w-full cursor-pointer rounded-full bg-accent font-display text-[14px] font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Hotel"}
                </button>
              </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default Hotels;
