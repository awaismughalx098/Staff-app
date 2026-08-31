import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import {
  GlassEmptyState,
  GlassSkeleton,
  GlassModal,
} from "../../../components/glass";
import {
  addButtonClass,
  inputClass,
  labelClass,
  searchInputClass,
  searchWrapClass,
} from "../../../components/admin/adminFormStyles";
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from "../../../services/driverService";
import useMyCompany from "./useMyCompany";

const EMPTY = { name: "", email: "", password: "" };

/* Mirrors the floor the API enforces on driver accounts. */
const MIN_PASSWORD_LENGTH = 8;

function BusAdminDrivers() {
  const company = useMyCompany();

  const [drivers, setDrivers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      /* Scoped server-side to the caller's company. */
      const res = await getDrivers();
      setDrivers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (driver) => {
    setEditing(driver);
    setForm({ name: driver.name || "", email: driver.email || "", password: "" });
    setShowPassword(false);
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editing && !form.password) {
      toast.error("Set a password for the new driver");
      return;
    }
    if (form.password && form.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setSaving(true);
    try {
      /* No company is sent: the API pins new drivers to the company on the
         caller's own account, and refuses edits to anyone else's. */
      const payload = { name: form.name.trim(), email: form.email.trim() };
      if (form.password) payload.password = form.password;

      if (editing) {
        const res = await updateDriver(editing._id, payload);
        setDrivers((prev) =>
          prev.map((d) => (d._id === editing._id ? { ...d, ...res.data } : d))
        );
        toast.success("Driver updated");
      } else {
        const res = await createDriver(payload);
        setDrivers((prev) => [res.data, ...prev]);
        toast.success("Driver added");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save that driver");
    } finally {
      setSaving(false);
    }
  };

  /* Second tap confirms, so a mis-tap cannot delete a login. */
  const remove = async (driver) => {
    if (confirmingId !== driver._id) {
      setConfirmingId(driver._id);
      setTimeout(
        () => setConfirmingId((id) => (id === driver._id ? null : id)),
        4000
      );
      return;
    }
    setConfirmingId(null);
    try {
      await deleteDriver(driver._id);
      setDrivers((prev) => prev.filter((d) => d._id !== driver._id));
      toast.success("Driver removed");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't remove that driver");
    }
  };

  const toggleActive = async (driver) => {
    try {
      const res = await updateDriver(driver._id, {
        isActive: driver.isActive === false,
      });
      setDrivers((prev) =>
        prev.map((d) => (d._id === driver._id ? { ...d, ...res.data } : d))
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't change that");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      [d.name, d.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [drivers, query]);

  return (
    <AdminLayout
      requireRole="busAdmin"
      title="Drivers"
      subtitle={company.name || "Your drivers"}
      actions={
        <>
          <button
            type="button"
            onClick={load}
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
          placeholder="Search drivers..."
          aria-label="Search drivers"
          className={searchInputClass}
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <GlassSkeleton className="h-[68px]" count={4} />
        ) : filtered.length === 0 ? (
          <GlassEmptyState
            icon={UserRound}
            title={drivers.length === 0 ? "No drivers yet" : "No drivers match"}
            description={
              drivers.length === 0
                ? "Add a driver so they can sign in and run your trips."
                : "Try a different search term."
            }
            actionLabel={drivers.length === 0 ? "Add a driver" : undefined}
            onAction={drivers.length === 0 ? openCreate : undefined}
            className="mt-12"
          />
        ) : (
          filtered.map((d, i) => (
            <motion.div
              key={d._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
              className="glass-surface flex items-center gap-3 rounded-card p-3.5 shadow-glass"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <UserRound className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-content">
                  {d.name}
                </span>
                {d.email && (
                  <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-content-muted">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{d.email}</span>
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => toggleActive(d)}
                className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-colors ${
                  d.isActive === false
                    ? "bg-content-muted/15 text-content-muted"
                    : "bg-success/15 text-success"
                }`}
              >
                {d.isActive === false ? "Inactive" : "Active"}
              </button>

              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEdit(d)}
                  aria-label={`Edit ${d.name}`}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content-muted transition-colors hover:text-accent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(d)}
                  aria-label={`Remove ${d.name}`}
                  className={`flex h-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    confirmingId === d._id
                      ? "bg-danger px-2.5 text-[10.5px] font-bold text-white"
                      : "w-8 bg-white/60 text-content-muted hover:text-danger"
                  }`}
                >
                  {confirmingId === d._id ? "Sure?" : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </span>
            </motion.div>
          ))
        )}
      </div>

      <GlassModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Driver" : "Add Driver"}
        subtitle={company.name || undefined}
      >
        <form onSubmit={save} className="space-y-3.5">
          <label className="block">
            <span className={labelClass}>Name *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Email *</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="driver@company.com"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>
              {editing ? "New password" : "Password *"}
            </span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder={
                  editing ? "Leave empty to keep the current one" : "At least 8 characters"
                }
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center text-content-muted"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </span>
          </label>

          <p className="text-[11.5px] leading-5 text-content-muted">
            The driver signs in at{" "}
            <span className="font-mono">/driver/login</span> with this email and
            password.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-[14px] font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Driver"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default BusAdminDrivers;
