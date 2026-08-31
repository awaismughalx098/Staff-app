import { ImagePlus, MapPin } from "lucide-react";

import {
  inputClass,
  labelClass,
  textareaClass,
} from "./adminFormStyles";

export const EMPTY_CONSULTANT = {
  name: "",
  city: "",
  address: "",
  description: "",
  contact: "",
  email: "",
  destinations: "",
  requirements: "",
  services: "",
  lat: "",
  lng: "",
};

/* The API takes these three as comma-separated strings and splits them, so
   the form edits them the same way rather than juggling arrays. */
export const consultantToForm = (c) => ({
  name: c.name || "",
  city: c.city || "",
  address: c.address || "",
  description: c.description || "",
  contact: c.contact || "",
  email: c.email || "",
  destinations: (c.destinations || []).join(", "),
  requirements: (c.requirements || []).join(", "),
  services: (c.services || []).join(", "),
  lat: Number.isFinite(c.location?.lat) ? c.location.lat : "",
  lng: Number.isFinite(c.location?.lng) ? c.location.lng : "",
});

/** Shared validation, so the owner's page and the consultancy's own console
 *  refuse exactly the same things. Returns a message, or null when fine. */
export const consultantFormProblem = (form) => {
  if (
    !form.name.trim() ||
    !form.city.trim() ||
    !form.description.trim() ||
    !form.contact.trim()
  ) {
    return "Name, city, description and contact are required";
  }

  /* One coordinate on its own is not a pin — it would silently drop. */
  if (
    (form.lat === "") !== (form.lng === "") ||
    (form.lat !== "" && !Number.isFinite(Number(form.lat))) ||
    (form.lng !== "" && !Number.isFinite(Number(form.lng)))
  ) {
    return "Give both latitude and longitude, or leave both empty";
  }

  return null;
};

/**
 * Everything about one consultancy except who is allowed to save it.
 *
 * @param {object}   form        state held by the parent
 * @param {function} setForm
 * @param {File|null} imageFile
 * @param {function} setImageFile
 * @param {boolean}  editing     changes the cover-photo wording only
 */
function ConsultantForm({ form, setForm, imageFile, setImageFile, editing }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <label className="block">
        <span className={labelClass}>Name *</span>
        <input
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Bright Future Consultants"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>City *</span>
          <input
            value={form.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Lahore"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Phone *</span>
          <input
            value={form.contact}
            onChange={(e) => set({ contact: e.target.value })}
            placeholder="0300 1234567"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Office address</span>
        <input
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
          placeholder="2nd Floor, Main Boulevard, Gulberg"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Email</span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="info@consultants.com"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>About *</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Who you are and how long you've been placing students..."
          className={textareaClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Countries you send to</span>
        <input
          value={form.destinations}
          onChange={(e) => set({ destinations: e.target.value })}
          placeholder="UK, Canada, Australia, Germany"
          className={inputClass}
        />
        <span className="mt-1 block text-[11.5px] text-content-muted">
          Separate with commas. These show as tags on your card.
        </span>
      </label>

      <label className="block">
        <span className={labelClass}>What you help with</span>
        <input
          value={form.services}
          onChange={(e) => set({ services: e.target.value })}
          placeholder="Admissions, Visa filing, IELTS prep"
          className={inputClass}
        />
        <span className="mt-1 block text-[11.5px] text-content-muted">
          Separate with commas.
        </span>
      </label>

      <label className="block">
        <span className={labelClass}>What applicants need</span>
        <input
          value={form.requirements}
          onChange={(e) => set({ requirements: e.target.value })}
          placeholder="Passport, Matric & FSc certificates, IELTS 6.0"
          className={inputClass}
        />
        <span className="mt-1 block text-[11.5px] text-content-muted">
          Separate with commas.
        </span>
      </label>

      {/* Drives the visitor's "Get Location" directions */}
      <div className="rounded-card border border-line p-3.5">
        <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-content">
          <MapPin className="h-4 w-4 text-accent" />
          Office on the map
        </p>
        <p className="mt-1 text-[11.5px] leading-5 text-content-muted">
          Paste the coordinates from Google Maps (right-click the spot → click
          the lat, lng to copy). Visitors get road directions to this pin.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>Latitude</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.lat}
              onChange={(e) => set({ lat: e.target.value })}
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
              onChange={(e) => set({ lng: e.target.value })}
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
            : editing
            ? "Replace cover photo"
            : "Cover photo"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>
    </>
  );
}

export default ConsultantForm;
