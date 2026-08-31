import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, RefreshCw, Search, UserRound } from "lucide-react";
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
  selectClass,
} from "../../components/admin/adminFormStyles";
import {
  createDriver,
  deleteDriver,
  getDrivers,
  updateDriver,
} from "../../services/driverService";
import { getCompanies } from "../../services/companyService";

const EMPTY_FORM = { name: "", email: "", password: "", company: "" };

/* Owner-only. A bus company admin manages their own drivers at
   /bus-admin/drivers, so nothing here narrows to one operator. */
function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const normalizeData = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.drivers)) return response.drivers;
    if (Array.isArray(response?.companies)) return response.companies;
    return [];
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await getDrivers();
      setDrivers(normalizeData(response));
    } catch {
      toast.error("Unable to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await getCompanies({ kind: "bus" });
      setCompanies(normalizeData(response));
    } catch {
      toast.error("Unable to load companies");
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDrivers = useMemo(() => {
    const text = query.toLowerCase().trim();
    if (!text) return drivers;
    return drivers.filter(
      (driver) =>
        driver.name?.toLowerCase().includes(text) ||
        driver.email?.toLowerCase().includes(text)
    );
  }, [drivers, query]);

  const resetForm = () => {
    setEditingId(null);
    setShowPassword(false);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (driver) => {
    setEditingId(driver._id);
    setForm({
      name: driver.name || "",
      email: driver.email || "",
      password: "",
      company: driver.company?._id || driver.company || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDriver(id);
      toast.success("Driver deleted successfully");
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Driver delete failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email) {
      toast.error("Driver name and email are required");
      return;
    }
    if (!form.company) {
      toast.error("Please assign a bus company to this driver");
      return;
    }
    if (!editingId && !form.password) {
      toast.error("Password is required for new driver");
      return;
    }

    try {
      setSaving(true);

      const payload = { name: form.name, email: form.email, company: form.company };
      if (form.password) payload.password = form.password;

      if (editingId) {
        await updateDriver(editingId, payload);
        toast.success("Driver updated successfully");
      } else {
        await createDriver(payload);
        toast.success("Driver created successfully");
      }

      setModalOpen(false);
      resetForm();
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Driver operation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      requireSuperAdmin
      title="Drivers"
      subtitle="Driver login accounts"
      actions={
        <>
          <button
            type="button"
            onClick={fetchDrivers}
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
        ) : filteredDrivers.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <UserRound className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-content">No drivers found</h2>
            <p className="mt-2 text-sm text-content-muted">
              Add your first driver to allow GPS trip tracking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDrivers.map((driver) => (
              <EntityCard
                key={driver._id}
                icon={UserRound}
                title={driver.name}
                subtitle={driver.email}
                badges={driver.company?.name ? [driver.company.name] : []}
                status={{
                  label: driver.isActive === false ? "Inactive" : "Active",
                  active: driver.isActive !== false,
                }}
                onEdit={() => openEdit(driver)}
                onDelete={() => handleDelete(driver._id)}
              />
            ))}
          </div>
        )}
      </div>

      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Driver" : "Add Driver"}
        subtitle="Name, email, password and a bus company are required."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Driver Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g Ali Khan"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Driver Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="driver@email.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Bus Company</label>
            <select
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={selectClass}
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] leading-4 text-content-muted">
              The driver will only see buses belonging to this company.
            </p>
          </div>

          <div>
            <label className={labelClass}>
              {editingId ? "New Password (optional)" : "Driver Password"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? "Leave empty to keep old password" : "Password"}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-content-faint"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={saving} className={primaryButtonClass}>
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : editingId ? "Update Driver" : "Add Driver"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default Drivers;
