import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import DataTable from "../../components/admin/DataTable";
import { GlassModal } from "../../components/glass";
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
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from "../../services/adminService";
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from "../../services/driverService";
import { getCompanies } from "../../services/companyService";
import { getHotels } from "../../services/hotelService";
import { getAirlines } from "../../services/airlineService";
import { getEvents } from "../../services/eventService";
import { getConsultants } from "../../services/consultantService";
import { getRentalCompanies } from "../../services/rentalService";
import { ADMIN_ROLES, normalizeRole, roleConfig } from "../../config/adminRoles";

/* The categories the owner browses. Bus Companies is the only one with two
   kinds of account behind it, so it carries sub-tabs. */
const CATEGORIES = [
  {
    id: "bus",
    label: "Bus Companies",
    blurb: "Company admins and their drivers",
    role: "busAdmin",
    tabs: [
      { id: "admins", label: "Company Admins" },
      { id: "drivers", label: "Drivers" },
    ],
  },
  { id: "tour", label: "Tour Companies", blurb: "Northern and adventure operators", role: "tourAdmin" },
  { id: "religious", label: "Religious Tours", blurb: "Umrah and Ziyarat operators", role: "religiousAdmin" },
  { id: "rental", label: "Rental Companies", blurb: "Wedding, car and shuttle rentals", role: "rentalAdmin" },
  { id: "hotel", label: "Hotels", blurb: "One admin per property", role: "hotelAdmin" },
  { id: "airline", label: "Airlines", blurb: "One admin per airline", role: "airlineAdmin" },
  { id: "event", label: "Events", blurb: "One admin per event", role: "eventAdmin" },
  { id: "consultant", label: "Consultants", blurb: "One admin per consultancy", role: "consultantAdmin" },
  { id: "owner", label: "Super Admins", blurb: "Full access to everything", role: null },
];

const EMPTY_ADMIN = {
  name: "",
  email: "",
  password: "",
  role: "superadmin",
  company: "",
  rentalCompany: "",
  hotel: "",
  airline: "",
  event: "",
  consultant: "",
};

const EMPTY_DRIVER = { name: "", email: "", password: "", company: "" };

/* Mirrors the backend's floor in adminController. */
const MIN_PASSWORD_LENGTH = 8;

const normalizeData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

function Admins() {
  const [category, setCategory] = useState(null);
  const [tab, setTab] = useState("admins");

  const [admins, setAdmins] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [events, setEvents] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [rentalCompanies, setRentalCompanies] = useState([]);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* One modal serves both kinds of account; `mode` says which. */
  const [modal, setModal] = useState(null); // { mode: "admin"|"driver", id?: string }
  const [form, setForm] = useState(EMPTY_ADMIN);
  const [issued, setIssued] = useState(null);

  const load = async () => {
    setLoading(true);
    const [a, d, c, h, al, e, cn, rc] = await Promise.allSettled([
      getAdmins(),
      getDrivers(),
      getCompanies(),
      getHotels(),
      getAirlines(),
      getEvents(),
      getConsultants(),
      /* A high limit rather than the default page: this list only fills a
         picker, and a company missing from it cannot be given an admin. */
      getRentalCompanies({ limit: 200 }),
    ]);
    if (a.status === "fulfilled") setAdmins(normalizeData(a.value));
    if (d.status === "fulfilled") setDrivers(normalizeData(d.value));
    if (c.status === "fulfilled") setCompanies(normalizeData(c.value));
    if (h.status === "fulfilled") setHotels(normalizeData(h.value));
    if (al.status === "fulfilled") setAirlines(normalizeData(al.value));
    if (e.status === "fulfilled") setEvents(normalizeData(e.value));
    if (cn.status === "fulfilled") setConsultants(normalizeData(cn.value));
    if (rc.status === "fulfilled") setRentalCompanies(normalizeData(rc.value));
    if (a.status === "rejected") toast.error("Unable to load admins");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* Which admins belong to each category. Compared on the normalised role
     itself — matching on loginPath was indirect and silently miscounted. */
  const adminsIn = (cat) =>
    cat.role
      ? admins.filter((x) => normalizeRole(x.role) === cat.role)
      : admins.filter((x) => !roleConfig(x.role));

  const countFor = (cat) =>
    cat.id === "bus" ? adminsIn(cat).length + drivers.length : adminsIn(cat).length;

  const active = CATEGORIES.find((c) => c.id === category) || null;
  const showingDrivers = active?.id === "bus" && tab === "drivers";

  const rows = useMemo(() => {
    if (!active) return [];
    const list = showingDrivers ? drivers : adminsIn(active);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [
        r.name,
        r.email,
        r.company?.name,
        r.rentalCompany?.name,
        r.hotel?.name,
        r.airline?.name,
        r.event?.title,
        r.consultant?.name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [active, tab, admins, drivers, query]);

  const config = roleConfig(form.role);

  const scopeOptions = useMemo(() => {
    if (!config) return [];
    if (config.scopeField === "company") {
      return companies
        .filter((c) => (c.kind || "bus") === config.companyKind)
        .map((c) => ({ id: c._id, label: c.name }));
    }
    if (config.scopeField === "rentalCompany")
      return rentalCompanies.map((c) => ({
        id: c._id,
        /* The status is shown because a suspended company can still be given
           an admin, and that admin would sign in to a console with nothing
           on the market. */
        label: c.status === "approved" ? c.name : `${c.name} (${c.status})`,
      }));
    if (config.scopeField === "hotel")
      return hotels.map((h) => ({ id: h._id, label: `${h.name} — ${h.city}` }));
    if (config.scopeField === "airline")
      return airlines.map((a) => ({ id: a._id, label: `${a.name} (${a.code})` }));
    if (config.scopeField === "consultant")
      return consultants.map((c) => ({ id: c._id, label: `${c.name} — ${c.city}` }));
    if (config.scopeField === "event")
      return events.map((e) => ({ id: e._id, label: `${e.title} — ${e.city}` }));
    /* Every scope field is named above. Falling through to one of the lists
       would quietly offer the wrong entities for a role added later. */
    return [];
  }, [config, companies, rentalCompanies, hotels, airlines, events, consultants]);

  const busCompanies = useMemo(
    () => companies.filter((c) => (c.kind || "bus") === "bus"),
    [companies]
  );

  /* ── Actions ────────────────────────────────────────────────────────── */

  const openAdd = () => {
    setIssued(null);
    if (showingDrivers) {
      setForm(EMPTY_DRIVER);
      setModal({ mode: "driver" });
      return;
    }
    setForm({ ...EMPTY_ADMIN, role: active?.role || "superadmin" });
    setModal({ mode: "admin" });
  };

  const openEdit = (row) => {
    setIssued(null);
    if (showingDrivers) {
      setForm({
        name: row.name || "",
        email: row.email || "",
        password: "",
        company: row.company?._id || row.company || "",
      });
      setModal({ mode: "driver", id: row._id });
      return;
    }
    setForm({
      name: row.name || "",
      email: row.email || "",
      password: "",
      role: ADMIN_ROLES[row.role] ? row.role : "superadmin",
      company: row.company?._id || row.company || "",
      rentalCompany: row.rentalCompany?._id || row.rentalCompany || "",
      hotel: row.hotel?._id || row.hotel || "",
      airline: row.airline?._id || row.airline || "",
      event: row.event?._id || row.event || "",
      consultant: row.consultant?._id || row.consultant || "",
    });
    setModal({ mode: "admin", id: row._id });
  };

  const handleDelete = async (row) => {
    const label = showingDrivers ? "Driver" : "Admin";
    try {
      if (showingDrivers) await deleteDriver(row._id);
      else await deleteAdmin(row._id);
      toast.success(`${label} deleted`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || `${label} delete failed`);
    }
  };

  const submitDriver = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return false;
    }
    if (!form.company) {
      toast.error("Pick the bus company this driver belongs to");
      return false;
    }
    if (!modal.id && !form.password) {
      toast.error("Password is required for a new driver");
      return false;
    }

    const payload = { name: form.name, email: form.email, company: form.company };
    if (form.password) payload.password = form.password;

    if (modal.id) await updateDriver(modal.id, payload);
    else await createDriver(payload);
    toast.success(modal.id ? "Driver updated" : "Driver created");
    return true;
  };

  const submitAdmin = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return false;
    }
    if (config && !form[config.scopeField]) {
      toast.error(`Pick the ${config.scopeLabel.toLowerCase()} this admin manages`);
      return false;
    }
    if (!modal.id && !form.password) {
      toast.error("Password is required for a new admin");
      return false;
    }
    /* Same floor the API enforces — caught here so the form can say so
       before the round trip. */
    if (form.password && form.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return false;
    }

    const payload = { name: form.name, email: form.email, role: form.role };
    if (config) payload[config.scopeField] = form[config.scopeField];
    if (form.password) payload.password = form.password;

    if (modal.id) {
      await updateAdmin(modal.id, payload);
      toast.success("Admin updated");
      return true;
    }

    await createAdmin(payload);
    toast.success("Admin created");

    /* Show where the new admin signs in before the modal closes. */
    if (config) {
      setIssued({
        email: form.email,
        password: form.password,
        loginPath: config.loginPath,
        label: config.label,
      });
      load();
      return false; // keep the modal open on the credentials panel
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const done =
        modal.mode === "driver" ? await submitDriver() : await submitAdmin();
      if (done) {
        setModal(null);
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const copyDetails = () => {
    const text = `${issued.label} sign-in\n${window.location.origin}${issued.loginPath}\nEmail: ${issued.email}\nPassword: ${issued.password}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast.success("Sign-in details copied"))
      .catch(() => toast.error("Couldn't copy — select the text instead"));
  };

  /* ── Table shape per view ───────────────────────────────────────────── */

  const columns = showingDrivers
    ? [
        { key: "name", label: "Driver" },
        { key: "email", label: "Email" },
        { key: "company", label: "Company" },
        { key: "status", label: "Status" },
      ]
    : [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "scope", label: active?.role ? "Manages" : "Access" },
        { key: "signin", label: "Signs in at" },
      ];

  const cell = (row) => {
    if (showingDrivers) {
      return {
        name: row.name,
        email: row.email,
        company: row.company?.name || "—",
        status: (
          <span
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
              row.isActive === false
                ? "bg-content-muted/15 text-content-muted"
                : "bg-success/15 text-success"
            }`}
          >
            {row.isActive === false ? "Inactive" : "Active"}
          </span>
        ),
      };
    }

    const c = roleConfig(row.role);
    const scope = c ? row[c.scopeField] : null;
    return {
      name: row.name,
      email: row.email,
      scope: scope?.name || scope?.title || (c ? "— not linked —" : "Everything"),
      signin: (
        <span className="font-mono text-[11.5px] text-content-muted">
          {c?.loginPath || "/admin/login"}
        </span>
      ),
    };
  };

  return (
    <AdminLayout
      requireSuperAdmin
      title={active ? active.label : "Admins"}
      subtitle={
        active ? active.blurb : "Pick a section to see and manage its accounts"
      }
      actions={
        <>
          {active && (
            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setQuery("");
                setTab("admins");
              }}
              className="glass-surface flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-content-muted transition-colors hover:text-content"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className="glass-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {active && (
            <button type="button" onClick={openAdd} className={addButtonClass}>
              <Plus className="h-4 w-4" />
              Add
            </button>
          )}
        </>
      }
    >
      {/* A keyed motion.div remounts and replays its intro on every switch.
          AnimatePresence is deliberately not used: with mode="wait" the
          outgoing block never finished exiting, so the incoming one stayed
          pinned at opacity 0 and the page looked frozen on the old view. */}
      <motion.div
        key={active ? `table-${active.id}-${tab}` : "categories"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* LEVEL 1 — categories */}
        {!active && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.role ? ADMIN_ROLES[cat.role].icon : ShieldCheck;
              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setTab("admins");
                    setQuery("");
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
                  className="glass-surface flex cursor-pointer items-center gap-3 rounded-card p-4 text-left shadow-glass transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[14.5px] font-bold text-content">
                      {cat.label}
                    </span>
                    <span className="block truncate text-[11.5px] text-content-muted">
                      {cat.blurb}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-[16px] font-black text-content">
                      {loading ? "–" : countFor(cat)}
                    </span>
                    <span className="block text-[10.5px] text-content-muted">
                      {cat.id === "bus" ? "accounts" : "admins"}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
                </motion.button>
              );
            })}
          </div>
        )}

        {/* LEVEL 2 — one category, as a table */}
        {active && (
          <div>
            {active.tabs && (
              <div className="mb-4 flex flex-wrap gap-2">
                {active.tabs.map((t) => {
                  const on = tab === t.id;
                  const n =
                    t.id === "drivers" ? drivers.length : adminsIn(active).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTab(t.id);
                        setQuery("");
                      }}
                      className={`flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-[12.5px] font-bold transition-colors duration-200 ${
                        on
                          ? "bg-accent text-white"
                          : "glass-surface text-content-muted hover:text-content"
                      }`}
                    >
                      {t.id === "drivers" ? (
                        <UserRound className="h-3.5 w-3.5" />
                      ) : (
                        <UserCog className="h-3.5 w-3.5" />
                      )}
                      {t.label}
                      <span className={on ? "text-white/70" : "text-content-faint"}>
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className={searchWrapClass}>
              <Search className="h-4 w-4 shrink-0 text-content-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={showingDrivers ? "Search drivers..." : "Search admins..."}
                aria-label="Search"
                className={searchInputClass}
              />
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="glass-surface h-40 animate-pulse rounded-card" />
              ) : (
                <DataTable
                  columns={columns}
                  rows={rows}
                  cell={cell}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  emptyLabel={
                    query
                      ? "Nothing matches that search"
                      : showingDrivers
                      ? "No drivers yet — add one with the button above"
                      : `No ${active.label.toLowerCase()} accounts yet — add one with the button above`
                  }
                />
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ADD / EDIT */}
      <GlassModal
        open={Boolean(modal)}
        onClose={() => {
          setModal(null);
          setIssued(null);
        }}
        title={
          issued
            ? "Account created"
            : modal?.mode === "driver"
            ? modal?.id
              ? "Edit Driver"
              : "Add Driver"
            : modal?.id
            ? "Edit Admin"
            : "Add Admin"
        }
        subtitle={
          issued
            ? undefined
            : modal?.mode === "driver"
            ? "Drivers sign in on the driver app"
            : "Each admin signs in on their own page and sees only what they manage."
        }
      >
        {issued ? (
          <div className="space-y-4">
            <div className="rounded-card bg-accent-soft p-4">
              <p className="font-display text-[14px] font-bold text-accent">
                {issued.label} created
              </p>
              <p className="mt-1 text-[12.5px] leading-6 text-content-muted">
                Send these on. The password is not shown again.
              </p>
              <div className="mt-3 space-y-1.5 font-mono text-[12px] text-content">
                <p className="break-all">
                  {window.location.origin}
                  {issued.loginPath}
                </p>
                <p className="break-all">{issued.email}</p>
                <p>{issued.password}</p>
              </div>
            </div>
            <button type="button" onClick={copyDetails} className={primaryButtonClass}>
              <Copy className="h-4 w-4" />
              Copy sign-in details
            </button>
            <button
              type="button"
              onClick={() => {
                setModal(null);
                setIssued(null);
              }}
              className="h-11 w-full cursor-pointer rounded-full text-[13px] font-bold text-content-muted"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g Ahmed Raza"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@email.com"
                className={inputClass}
              />
            </div>

            {modal?.mode === "driver" ? (
              <div>
                <label className={labelClass}>Bus company</label>
                <select
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Select bus company</option>
                  {busCompanies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className={labelClass}>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className={selectClass}
                  >
                    <option value="superadmin">Super Admin</option>
                    {Object.keys(ADMIN_ROLES).map((r) => (
                      <option key={r} value={r}>
                        {ADMIN_ROLES[r].label}
                      </option>
                    ))}
                  </select>
                </div>

                {config && (
                  <div>
                    <label className={labelClass}>{config.scopeLabel}</label>
                    <select
                      value={form[config.scopeField]}
                      onChange={(e) =>
                        setForm({ ...form, [config.scopeField]: e.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="">
                        Select {config.scopeLabel.toLowerCase()}
                      </option>
                      {scopeOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {scopeOptions.length === 0 && (
                      <p className="mt-1.5 text-[11.5px] text-content-muted">
                        None exists yet — create one first.
                      </p>
                    )}
                    <p className="mt-1.5 text-[11.5px] text-content-muted">
                      Signs in at{" "}
                      <span className="font-mono text-accent">{config.loginPath}</span>
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className={labelClass}>
                {modal?.id ? "New Password (optional)" : "Password"}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={
                  modal?.id ? "Leave empty to keep old password" : "Password"
                }
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={saving} className={primaryButtonClass}>
              <Plus className="h-4 w-4" />
              {saving ? "Saving..." : modal?.id ? "Save Changes" : "Create Account"}
            </button>
          </form>
        )}
      </GlassModal>
    </AdminLayout>
  );
}

export default Admins;
