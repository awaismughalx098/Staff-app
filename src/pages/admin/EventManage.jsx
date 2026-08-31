import { useEffect, useState } from "react";
import { CalendarDays, ImagePlus, Save } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton } from "../../components/glass";
import {
  inputClass,
  textareaClass,
  labelClass,
  selectClass,
} from "../../components/admin/adminFormStyles";
import { getEventById, updateEvent } from "../../services/eventService";
import { useMyEventId } from "./EventDashboard";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const CATEGORIES = [
  "Concert",
  "Sports",
  "Festival",
  "Conference",
  "Theatre",
  "Other",
];

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

function EventManage() {
  const eventId = useMyEventId();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState(null);

  const fetchEvent = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getEventById(eventId);
      const data = res?.data;
      setEvent(data);
      setForm({
        title: data.title || "",
        category: data.category || "Other",
        description: data.description || "",
        venue: data.venue || "",
        city: data.city || "",
        eventDate: toDateInput(data.eventDate),
        startTime: data.startTime || "",
        ticketPrice: data.ticketPrice ?? "",
        totalTickets: data.totalTickets ?? "",
        contact: data.contact || "",
        isActive: data.isActive !== false,
      });
    } catch {
      toast.error("Unable to load your event");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [eventId]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.venue.trim() ||
      !form.city.trim() ||
      !form.eventDate
    ) {
      toast.error("Title, description, venue, city and date are required");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (imageFile) data.append("image", imageFile);

      const res = await updateEvent(eventId, data);
      setEvent(res.data);
      setImageFile(null);
      toast.success("Your event card is updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      requireEventAdmin
      title="My Event"
      subtitle="This is what passengers see in the app"
    >
      {!eventId ? (
        <GlassEmptyState
          icon={CalendarDays}
          title="No event assigned yet"
          description="Ask the Super Admin to link your account to an event."
          className="mt-16"
        />
      ) : loading || !form ? (
        <div className="space-y-3">
          <GlassSkeleton className="h-40" />
          <GlassSkeleton className="h-16" count={4} />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          {getImageUrl(event?.image) && (
            <div className="relative mb-4 h-44 overflow-hidden rounded-card shadow-glass">
              <img
              loading="lazy"
              decoding="async"
                src={getImageUrl(event.image)}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Event title *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Category</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className={selectClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Venue *</span>
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, venue: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>City *</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Date *</span>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, eventDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Start time</span>
                <input
                  type="text"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                  placeholder="7:00 PM"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className={labelClass}>Ticket price</span>
                <input
                  type="number"
                  min="0"
                  value={form.ticketPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ticketPrice: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Capacity</span>
                <input
                  type="number"
                  min={event?.ticketsSold || 1}
                  value={form.totalTickets}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, totalTickets: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Contact</span>
                <input
                  type="tel"
                  value={form.contact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Description *</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className={textareaClass}
              />
            </label>

            <label className="glass-surface flex cursor-pointer items-center gap-3 rounded-card p-3.5">
              <ImagePlus className="h-5 w-5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-content-muted">
                {imageFile
                  ? imageFile.name
                  : event?.image
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

            <label className="glass-surface flex cursor-pointer items-center justify-between rounded-card p-3.5">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-content">
                  Show on app
                </span>
                <span className="block text-[11.5px] text-content-muted">
                  Turn off to hide your event from passengers
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
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

export default EventManage;
