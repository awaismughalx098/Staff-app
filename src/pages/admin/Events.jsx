import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ImagePlus, Plus, RefreshCw, Search } from "lucide-react";
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
  selectClass,
} from "../../components/admin/adminFormStyles";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../../services/eventService";
import { formatPrice } from "../../utils/tours";
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

/* <input type="date"> needs yyyy-mm-dd, Mongo hands back an ISO string. */
const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const EMPTY_FORM = {
  title: "",
  category: "Concert",
  description: "",
  venue: "",
  city: "",
  eventDate: "",
  startTime: "",
  ticketPrice: "",
  totalTickets: "",
  contact: "",
};

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await getEvents();
      setEvents(Array.isArray(res?.data) ? res.data : []);
    } catch {
      toast.error("Unable to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      [e.title, e.city, e.venue, e.category]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [events, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setForm({
      title: event.title,
      category: event.category || "Other",
      description: event.description,
      venue: event.venue,
      city: event.city,
      eventDate: toDateInput(event.eventDate),
      startTime: event.startTime || "",
      ticketPrice: event.ticketPrice,
      totalTickets: event.totalTickets,
      contact: event.contact || "",
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.venue.trim() ||
      !form.city.trim() ||
      !form.eventDate ||
      form.ticketPrice === "" ||
      form.totalTickets === ""
    ) {
      toast.error("Title, description, venue, city, date, price and capacity are required");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (imageFile) data.append("image", imageFile);

      if (editing) {
        const res = await updateEvent(editing._id, data);
        setEvents((prev) =>
          prev.map((ev) => (ev._id === editing._id ? res.data : ev))
        );
        toast.success("Event updated");
      } else {
        const res = await createEvent(data);
        setEvents((prev) => [res.data, ...prev]);
        toast.success("Event created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (event) => {
    try {
      await deleteEvent(event._id);
      setEvents((prev) => prev.filter((ev) => ev._id !== event._id));
      toast.success("Event deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete event");
    }
  };

  const toggleActive = async (event) => {
    try {
      const data = new FormData();
      data.append("isActive", !event.isActive);
      const res = await updateEvent(event._id, data);
      setEvents((prev) =>
        prev.map((ev) => (ev._id === event._id ? res.data : ev))
      );
      toast.success(res.data.isActive ? "Event published" : "Event hidden");
    } catch {
      toast.error("Failed to update event");
    }
  };

  return (
    <AdminLayout
      requireSuperAdmin
      title="Events"
      subtitle="Concerts, matches & ticketed shows"
      actions={
        <>
          <button
            type="button"
            onClick={fetchEvents}
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
          placeholder="Search events..."
          aria-label="Search events"
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
            icon={CalendarDays}
            title={search ? "No events match your search" : "No events yet"}
            actionLabel={!search ? "Add your first event" : undefined}
            onAction={!search ? openCreate : undefined}
            className="mt-16"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((event) => (
              <EntityCard
                key={event._id}
                image={getImageUrl(event.image)}
                icon={CalendarDays}
                title={event.title}
                subtitle={event.category}
                meta={`${event.venue}, ${event.city} · ${formatPrice(
                  event.ticketPrice
                )} · ${event.ticketsSold}/${event.totalTickets} sold`}
                status={{
                  label: event.isActive !== false ? "Live" : "Hidden",
                  active: event.isActive !== false,
                }}
                onToggleStatus={() => toggleActive(event)}
                onEdit={() => openEdit(event)}
                onDelete={() => performDelete(event)}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Event" : "Add Event"}
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Event title *</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Coke Studio Live"
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
                onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                placeholder="Expo Centre"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>City *</span>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Lahore"
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
              <span className={labelClass}>Ticket price *</span>
              <input
                type="number"
                min="0"
                value={form.ticketPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ticketPrice: e.target.value }))
                }
                placeholder="2500"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Capacity *</span>
              <input
                type="number"
                min="1"
                value={form.totalTickets}
                onChange={(e) =>
                  setForm((f) => ({ ...f, totalTickets: e.target.value }))
                }
                placeholder="500"
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
                placeholder="042-1234567"
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Description *</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What's happening at this event..."
              className={textareaClass}
            />
          </label>

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

          <button
            type="submit"
            disabled={saving}
            className="h-[50px] w-full cursor-pointer rounded-full bg-accent font-display text-[14px] font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Create Event"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default Events;
