import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Building2,
  BusFront,
  CalendarDays,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Newspaper,
  Package,
  Plane,
  QrCode,
  Ticket,
  Undo2,
  UserCog,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { homeFor, roleConfig } from "../../config/adminRoles";
import { GlassSkeleton } from "../glass";
import { useAdminSession } from "./AdminSession";
import logo from "../../assets/logo.webp";

/* Every section, tagged with the roles allowed to see it. Sub-admins get
   their own small console; none of the owner's sections appear for them. */
export const ADMIN_NAV = [
  /* Super Admin */
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, roles: ["superadmin"] },
  { label: "Revenue", path: "/admin/revenue", icon: Wallet, roles: ["superadmin"] },
  { label: "Bookings", path: "/admin/bookings", icon: Ticket, roles: ["superadmin"] },
  { label: "Refunds", path: "/admin/refunds", icon: Undo2, roles: ["superadmin"] },
  { label: "Companies", path: "/admin/companies", icon: Building2, roles: ["superadmin"] },
  { label: "Drivers", path: "/admin/drivers", icon: UserRound, roles: ["superadmin"] },
  { label: "Tours", path: "/admin/tours", icon: Globe, roles: ["superadmin"] },
  { label: "Hotels", path: "/admin/hotels", icon: Building2, roles: ["superadmin"] },
  { label: "Airlines", path: "/admin/airlines", icon: Plane, roles: ["superadmin"] },
  { label: "Consultants", path: "/admin/consultants", icon: GraduationCap, roles: ["superadmin"] },
  { label: "Events", path: "/admin/events", icon: CalendarDays, roles: ["superadmin"] },
  { label: "News", path: "/admin/news", icon: Newspaper, roles: ["superadmin"] },
  { label: "Admins", path: "/admin/admins", icon: UserCog, roles: ["superadmin"] },

  /* Event Admin */
  { label: "Dashboard", path: "/admin/event", icon: LayoutDashboard, roles: ["eventAdmin"] },
  { label: "My Event", path: "/admin/event/manage", icon: CalendarDays, roles: ["eventAdmin"] },
  { label: "Tickets", path: "/admin/event/tickets", icon: Ticket, roles: ["eventAdmin"] },
  { label: "Scan", path: "/admin/event/scan", icon: QrCode, roles: ["eventAdmin"] },

  /* Bus Company Admin */
  { label: "Dashboard", path: "/bus-admin", icon: LayoutDashboard, roles: ["busAdmin"] },
  { label: "My Fleet", path: "/bus-admin/fleet", icon: BusFront, roles: ["busAdmin"] },
  { label: "Bookings", path: "/bus-admin/bookings", icon: Ticket, roles: ["busAdmin"] },
  { label: "Drivers", path: "/bus-admin/drivers", icon: UserRound, roles: ["busAdmin"] },
  { label: "Earnings", path: "/bus-admin/buses", icon: Wallet, roles: ["busAdmin"] },

  /* Tour, Religious and Airline Admins */
  { label: "Bookings", path: "/tour-admin", icon: Globe, roles: ["tourAdmin"] },
  { label: "My Packages", path: "/tour-admin/packages", icon: Package, roles: ["tourAdmin"] },
  { label: "Bookings", path: "/religious-admin", icon: Globe, roles: ["religiousAdmin"] },
  { label: "My Packages", path: "/religious-admin/packages", icon: Package, roles: ["religiousAdmin"] },

  /* Hotel Admin */
  { label: "Dashboard", path: "/hotel-admin", icon: LayoutDashboard, roles: ["hotelAdmin"] },
  { label: "Bookings", path: "/hotel-admin/bookings", icon: BedDouble, roles: ["hotelAdmin"] },
  { label: "Rooms", path: "/hotel-admin/rooms", icon: BedDouble, roles: ["hotelAdmin"] },
  { label: "My Hotel", path: "/hotel-admin/manage", icon: Building2, roles: ["hotelAdmin"] },
  { label: "My Airline", path: "/airline-admin", icon: Plane, roles: ["airlineAdmin"] },

  /* Consultant Admin */
  { label: "My Listing", path: "/consultant-admin", icon: GraduationCap, roles: ["consultantAdmin"] },
];

export function getNavForRole(role) {
  return ADMIN_NAV.filter((item) => item.roles.includes(role));
}

/* Where each role belongs when it lands somewhere it may not see. */
export const homePathForRole = (role) => homeFor(role);

function NavList({ items, pathname, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200 ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-content-muted hover:bg-elevated hover:text-content"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-3 py-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-danger transition-colors duration-200 hover:bg-danger/10"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

function BrandHeader({ roleLabel }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        <img
              loading="lazy"
              decoding="async" src={logo} alt="Let's Goo Transit" className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-[13px] font-bold leading-none text-content">
          Let&apos;s Goo
        </p>
        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-content-muted">
          {roleLabel}
        </p>
      </div>
    </div>
  );
}

/**
 * @param {boolean} requireSuperAdmin  owner-only page
 * @param {string}  requireRole        pin the page to one scoped role
 * @param {boolean} requireEventAdmin  shorthand kept for the event console
 */
function AdminLayout({
  title,
  subtitle,
  actions,
  children,
  requireSuperAdmin,
  requireEventAdmin,
  requireRole,
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { status, role, scopeName, signOut } = useAdminSession();

  const nav = useMemo(() => getNavForRole(role), [role]);
  const primaryMobile = nav.slice(0, 4);

  /* A sub-admin's sidebar shows what they manage, not their job title —
     "Daewoo Express" is more useful to them than "Bus Company Admin". */
  const roleLabel = scopeName || roleConfig(role)?.label || "Super Admin";

  const home = homeFor(role);

  const handleLogout = () => {
    const loginPath = roleConfig(role)?.loginPath || "/admin/login";
    signOut();
    toast.success("Logged out");
    /* Back to the page they actually sign in on. */
    navigate(loginPath, { replace: true });
  };

  /* The role decides which console to draw, and it comes from the server, so
     nothing can be rendered until the answer arrives. Redirecting during the
     wait would bounce a perfectly good session to the sign-in page. */
  if (status === "loading") {
    return (
      <div className="min-h-dvh w-full bg-bg p-6">
        <GlassSkeleton className="mx-auto mt-24 h-10 max-w-xs" />
        <GlassSkeleton className="mx-auto mt-3 h-64 max-w-3xl" />
      </div>
    );
  }

  if (status !== "ready" || !role) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireSuperAdmin && role !== "superadmin") {
    return <Navigate to={home} replace />;
  }

  if (requireEventAdmin && role !== "eventAdmin") {
    return <Navigate to={home} replace />;
  }

  if (requireRole && role !== requireRole) {
    return <Navigate to={home} replace />;
  }

  /* A scoped admin lives entirely inside their own console. Owner pages that
     carry no requireSuperAdmin flag would otherwise be reachable by typing
     the URL. The trailing-slash test matters: "/admin/events" is the owner's
     CRUD page and must not count as being inside "/admin/event". */
  const inOwnConsole =
    pathname === home || pathname.startsWith(`${home}/`);

  if (role !== "superadmin" && !inOwnConsole) {
    return <Navigate to={home} replace />;
  }

  return (
    <div className="min-h-dvh w-full bg-bg text-content">
      {/* Desktop persistent sidebar */}
      <div className="glass-surface fixed inset-y-0 left-0 z-40 hidden w-[208px] lg:block">
        <BrandHeader roleLabel={roleLabel} />
        <NavList items={nav} pathname={pathname} onLogout={handleLogout} />
      </div>

      <div className="lg:pl-[208px]">
        <header className="sticky top-0 z-30 bg-bg/70 px-4 backdrop-blur-2xl sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3 pt-safe">
            <div className="min-w-0">
              <h1 className="truncate font-display text-[16px] font-bold leading-tight text-content">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-[11px] text-content-muted">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
          </div>
        </header>

        <main className="px-4 pb-nav pt-4 sm:px-6 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="glass-surface fixed inset-x-0 bottom-0 z-[70] shadow-premium pb-safe lg:hidden"
        aria-label="Admin navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-2 py-1">
          {primaryMobile.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors duration-200 ${
                  active ? "text-accent" : "text-content-muted"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="More sections"
            className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-content-muted"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer — all sections + logout */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[80] bg-black/65 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="glass-surface fixed left-0 top-0 z-[90] flex h-full w-[82%] max-w-[300px] flex-col pt-safe lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <p className="font-display text-sm font-bold text-content">Menu</p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/50"
                >
                  <X className="h-4 w-4 text-content" />
                </button>
              </div>
              <NavList
                items={nav}
                pathname={pathname}
                onNavigate={() => setDrawerOpen(false)}
                onLogout={handleLogout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminLayout;
