import {
  BusFront,
  CalendarDays,
  Car,
  GraduationCap,
  Hotel,
  Mountain,
  Plane,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/* Mirrors backend/config/roles.js. Kept in step by hand — the backend is the
   authority on what a role may do; this only drives labels, routing and which
   picker the credential form shows. */
export const ADMIN_ROLES = {
  busAdmin: {
    label: "Bus Company Admin",
    short: "Bus Company",
    scopeField: "company",
    companyKind: "bus",
    scopeLabel: "Bus company",
    loginPath: "/bus-admin/login",
    home: "/bus-admin",
    icon: BusFront,
    blurb: "Manage your fleet, drivers, bookings and revenue.",
  },
  tourAdmin: {
    label: "Tour Company Admin",
    short: "Tour Company",
    scopeField: "company",
    companyKind: "tour",
    scopeLabel: "Tour company",
    loginPath: "/tour-admin/login",
    home: "/tour-admin",
    icon: Mountain,
    blurb: "Manage your tour packages, bookings and revenue.",
  },
  religiousAdmin: {
    label: "Religious Tour Admin",
    short: "Religious Tours",
    scopeField: "company",
    companyKind: "religious",
    scopeLabel: "Religious tour company",
    loginPath: "/religious-admin/login",
    home: "/religious-admin",
    icon: Sparkles,
    blurb: "Manage your Umrah and Ziyarat packages and bookings.",
  },
  /* Scoped to a RentalCompany, not a Company — the two businesses share no
     data, and the distinct field is what keeps a rental operator out of every
     intercity query. Mirrors ROLE_SCOPE.rentalAdmin on the backend. */
  rentalAdmin: {
    label: "Rental Company Admin",
    short: "Rentals",
    scopeField: "rentalCompany",
    scopeLabel: "Rental company",
    loginPath: "/rental-admin/login",
    home: "/rental-admin",
    icon: Car,
    blurb: "Manage your fleet, hire requests and earnings.",
  },
  hotelAdmin: {
    label: "Hotel Admin",
    short: "Hotel",
    scopeField: "hotel",
    scopeLabel: "Hotel",
    loginPath: "/hotel-admin/login",
    home: "/hotel-admin",
    icon: Hotel,
    blurb: "Manage your hotel's details, bookings and reviews.",
  },
  airlineAdmin: {
    label: "Airline Admin",
    short: "Airline",
    scopeField: "airline",
    scopeLabel: "Airline",
    loginPath: "/airline-admin/login",
    home: "/airline-admin",
    icon: Plane,
    blurb: "Manage your flights, bookings and revenue.",
  },
  eventAdmin: {
    label: "Event Admin",
    short: "Event",
    scopeField: "event",
    scopeLabel: "Event",
    loginPath: "/event-admin/login",
    home: "/admin/event",
    icon: CalendarDays,
    blurb: "Manage your event, tickets and gate check-in.",
  },
  consultantAdmin: {
    label: "Consultant Admin",
    short: "Consultant",
    scopeField: "consultant",
    scopeLabel: "Consultancy",
    loginPath: "/consultant-admin/login",
    home: "/consultant-admin",
    icon: GraduationCap,
    blurb: "Manage your listing, services and requirements.",
  },
};

export const ASSIGNABLE_ROLES = Object.keys(ADMIN_ROLES);

/* The owner. "admin" is the original account's legacy value. */
export const FULL_ACCESS_ROLES = ["superadmin", "admin"];

export const SUPERADMIN = {
  label: "Super Admin",
  loginPath: "/admin/login",
  home: "/admin",
  icon: ShieldCheck,
};

export const isFullAdmin = (role) => FULL_ACCESS_ROLES.includes(role);

/* Written before busAdmin existed. */
const LEGACY_ALIASES = { companyAdmin: "busAdmin" };

export const normalizeRole = (role) => LEGACY_ALIASES[role] || role;

export const roleConfig = (role) => ADMIN_ROLES[normalizeRole(role)] || null;

/** Where a signed-in admin belongs. */
export const homeFor = (role) =>
  isFullAdmin(normalizeRole(role))
    ? SUPERADMIN.home
    : roleConfig(role)?.home || SUPERADMIN.home;
