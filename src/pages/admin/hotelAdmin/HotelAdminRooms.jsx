import { useCallback, useEffect, useState } from "react";
import {
  BedDouble,
  Crown,
  Pencil,
  Plus,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassModal, GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import { inputClass, labelClass } from "../../../components/admin/adminFormStyles";
import { getHotelById } from "../../../services/hotelService";
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../../../services/roomService";
import { planFor } from "../../../config/hotelPlans";
import { getUploadUrl } from "../../../config";
import useMyHotel from "./useMyHotel";

const ROOM_TYPES = ["Standard", "Deluxe", "Executive", "Suite", "Family"];

const EMPTY = {
  name: "",
  roomType: "Standard",
  capacity: 2,
  bedType: "",
  pricePerNight: "",
  totalUnits: 1,
  description: "",
  amenities: "",
  isActive: true,
};

function RoomCard({ room, onEdit, onDelete }) {
  const cover = room.images?.[0] ? getUploadUrl(room.images[0], 240) : null;

  return (
    <div className="flex gap-3.5 rounded-card border border-line bg-surface p-3">
      <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {cover ? (
          <img src={cover} alt={room.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <BedDouble className="h-7 w-7 text-content-faint" />
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-content">{room.name}</p>
            <p className="mt-0.5 text-[11.5px] text-content-muted">
              {room.roomType}
              {room.bedType ? ` · ${room.bedType}` : ""}
            </p>
          </div>

          {!room.isActive && (
            <span className="status-pill is-departed shrink-0">Off sale</span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-content-muted">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {room.capacity} {room.capacity === 1 ? "person" : "persons"}
          </span>
          <span className="data-mono font-bold text-accent">
            Rs {Number(room.pricePerNight).toLocaleString()}
            <span className="font-normal text-content-muted"> /night</span>
          </span>
          <span className="data-mono">{room.totalUnits} rooms</span>
          {room.videos?.length > 0 && (
            <span className="flex items-center gap-1">
              <Video className="h-3.5 w-3.5" />
              {room.videos.length}
            </span>
          )}
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(room)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-content transition-colors hover:border-accent-line hover:text-accent"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(room)}
            className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-2.5 py-1 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The rooms a hotel sells, and what each costs.
 *
 * How much media a room may carry is decided by the hotel's plan, which the
 * Super Admin sets. The limits are shown here so an admin knows where they
 * stand, but the server enforces them — this screen only saves them a failed
 * upload.
 */
function HotelAdminRooms() {
  const myHotel = useMyHotel();

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [keepImages, setKeepImages] = useState([]);
  const [keepVideos, setKeepVideos] = useState([]);
  const [saving, setSaving] = useState(false);

  const plan = planFor(hotel);

  const load = useCallback(async () => {
    if (!myHotel.id) return;
    setLoading(true);
    try {
      const [hotelRes, roomRes] = await Promise.all([
        getHotelById(myHotel.id),
        getRooms(myHotel.id),
      ]);
      setHotel(hotelRes?.data || null);
      setRooms(Array.isArray(roomRes?.data) ? roomRes.data : []);
    } catch {
      toast.error("Couldn't load your rooms");
    } finally {
      setLoading(false);
    }
  }, [myHotel.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setImageFiles([]);
    setVideoFiles([]);
    setKeepImages([]);
    setKeepVideos([]);
    setOpen(true);
  };

  const openEdit = (room) => {
    setEditing(room);
    setForm({
      name: room.name || "",
      roomType: room.roomType || "Standard",
      capacity: room.capacity || 2,
      bedType: room.bedType || "",
      pricePerNight: room.pricePerNight ?? "",
      totalUnits: room.totalUnits || 1,
      description: room.description || "",
      amenities: (room.amenities || []).join(", "),
      isActive: room.isActive !== false,
    });
    setImageFiles([]);
    setVideoFiles([]);
    setKeepImages(room.images || []);
    setKeepVideos(room.videos || []);
    setOpen(true);
  };

  const set = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Give the room a name"); return; }
    if (form.pricePerNight === "") { toast.error("Set a nightly price"); return; }

    /* Checked here so an over-limit choice is caught before the upload rather
       than after it; the server refuses it either way. */
    if (keepImages.length + imageFiles.length > plan.maxRoomImages) {
      toast.error(
        `The ${plan.label} plan allows ${plan.maxRoomImages} photo${
          plan.maxRoomImages === 1 ? "" : "s"
        } per room.`
      );
      return;
    }
    if (keepVideos.length + videoFiles.length > plan.maxRoomVideos) {
      toast.error(
        plan.maxRoomVideos === 0
          ? "Room videos need the Pro plan."
          : `The ${plan.label} plan allows ${plan.maxRoomVideos} videos per room.`
      );
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    imageFiles.forEach((f) => data.append("images", f));
    videoFiles.forEach((f) => data.append("videos", f));
    keepImages.forEach((url) => data.append("keepImages", url));
    keepVideos.forEach((url) => data.append("keepVideos", url));

    setSaving(true);
    try {
      const res = editing
        ? await updateRoom(myHotel.id, editing._id, data)
        : await createRoom(myHotel.id, data);

      toast.success(res.message || "Saved");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the room");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Delete "${room.name}"?`)) return;
    try {
      const res = await deleteRoom(myHotel.id, room._id);
      toast.success(res.message || "Deleted");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the room");
    }
  };

  return (
    <AdminLayout
      title="Rooms"
      subtitle={myHotel.name ? `What ${myHotel.name} sells` : "What your hotel sells"}
      actions={
        <button
          type="button"
          onClick={openNew}
          className="flex h-9 items-center gap-1.5 rounded-input bg-accent px-3.5 text-[13px] font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add room
        </button>
      }
    >
      {/* What this hotel's plan allows, stated plainly */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-card border border-line bg-surface px-4 py-3">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-content">
          <Crown className={`h-4 w-4 ${plan === undefined ? "" : "text-accent"}`} />
          {plan.label} plan
        </span>
        <span className="text-[12px] text-content-muted">
          {plan.maxRoomImages} photo{plan.maxRoomImages === 1 ? "" : "s"} per room
        </span>
        <span className="text-[12px] text-content-muted">
          {plan.maxRoomVideos === 0
            ? "no room videos"
            : `${plan.maxRoomVideos} videos per room`}
        </span>
        <span className="text-[12px] text-content-muted">
          {plan.chargesBookingFee
            ? "Rs 100 booking fee applies"
            : "no booking fee"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {loading && <GlassSkeleton className="h-28" count={4} />}

        {!loading &&
          rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={room}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
      </div>

      {!loading && rooms.length === 0 && (
        <GlassEmptyState
          icon={BedDouble}
          title="No rooms yet"
          description="Add the room types your hotel sells, with how many people each sleeps and what it costs a night."
          actionLabel="Add your first room"
          onAction={openNew}
          className="mt-12"
        />
      )}

      <GlassModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit room" : "Add room"}
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className={labelClass}>Room name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={set("name")}
              placeholder="Deluxe Double"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.roomType} onChange={set("roomType")}>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sleeps</label>
              <select className={inputClass} value={form.capacity} onChange={set("capacity")}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "person" : "persons"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Price per night (Rs)</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.pricePerNight}
                onChange={set("pricePerNight")}
                placeholder="6500"
              />
            </div>
            <div>
              <label className={labelClass}>How many rooms</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.totalUnits}
                onChange={set("totalUnits")}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Beds</label>
            <input
              className={inputClass}
              value={form.bedType}
              onChange={set("bedType")}
              placeholder="1 king bed"
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${inputClass} min-h-[80px] py-2.5`}
              value={form.description}
              onChange={set("description")}
              placeholder="What's in the room"
            />
          </div>

          <div>
            <label className={labelClass}>Amenities (comma separated)</label>
            <input
              className={inputClass}
              value={form.amenities}
              onChange={set("amenities")}
              placeholder="AC, TV, Attached bath"
            />
          </div>

          {/* Media, capped by the plan */}
          <div>
            <label className={labelClass}>
              Photos — {plan.maxRoomImages} allowed on {plan.label}
            </label>
            {keepImages.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {keepImages.map((url) => (
                  <span key={url} className="relative">
                    <img
                      src={getUploadUrl(url, 120)}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setKeepImages((p) => p.filter((u) => u !== url))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-white"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple={plan.maxRoomImages > 1}
              onChange={(e) => setImageFiles([...e.target.files])}
              className="w-full text-[12.5px] text-content-muted"
            />
          </div>

          <div>
            <label className={labelClass}>
              Videos —{" "}
              {plan.maxRoomVideos === 0
                ? "Pro plan only"
                : `${plan.maxRoomVideos} allowed on ${plan.label}`}
            </label>
            {keepVideos.length > 0 && (
              <ul className="mb-2 space-y-1">
                {keepVideos.map((url) => (
                  <li key={url} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate text-content-muted">{url.split("/").pop()}</span>
                    <button
                      type="button"
                      onClick={() => setKeepVideos((p) => p.filter((u) => u !== url))}
                      className="shrink-0 font-bold text-danger"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="file"
              accept="video/*"
              multiple={plan.maxRoomVideos > 1}
              disabled={plan.maxRoomVideos === 0}
              onChange={(e) => setVideoFiles([...e.target.files])}
              className="w-full text-[12.5px] text-content-muted disabled:opacity-50"
            />
            {plan.maxRoomVideos === 0 && (
              <p className="mt-1 text-[11.5px] text-content-muted">
                Ask the Super Admin to upgrade this hotel to Pro to add room videos.
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={set("isActive")}
              className="h-4 w-4 cursor-pointer rounded accent-accent"
            />
            <span className="text-[13px] text-content">On sale</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-input bg-accent text-[14px] font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add room"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default HotelAdminRooms;
