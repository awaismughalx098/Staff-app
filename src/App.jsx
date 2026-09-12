import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminSessionProvider from "./components/admin/AdminSession";
import StaffLogin from "./pages/StaffLogin";
import NotFound from "./pages/NotFound";

/* ===== DRIVER ===== */
const DriverDashboard = lazy(() => import("./pages/driver/Dashboard"));
const StartTrip = lazy(() => import("./pages/driver/StartTrip"));
const LiveTrip = lazy(() => import("./pages/driver/LiveTrip"));
const DriverProfile = lazy(() => import("./pages/driver/Profile"));
const ScanTicket = lazy(() => import("./pages/driver/ScanTicket"));

/* ===== SUPER ADMIN ===== */
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Companies = lazy(() => import("./pages/admin/Companies"));
const Drivers = lazy(() => import("./pages/admin/Drivers"));
const AdminNews = lazy(() => import("./pages/admin/News"));
const AdminTours = lazy(() => import("./pages/admin/Tours"));
const AdminHotels = lazy(() => import("./pages/admin/Hotels"));
const AdminAirlines = lazy(() => import("./pages/admin/Airlines"));
const AdminRentals = lazy(() => import("./pages/admin/RentalCompanies"));
const AdminConsultants = lazy(() => import("./pages/admin/Consultants"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminAdmins = lazy(() => import("./pages/admin/Admins"));
const AdminRevenue = lazy(() => import("./pages/admin/Revenue"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));
const AdminRefunds = lazy(() => import("./pages/admin/Refunds"));
const AdminSupport = lazy(() => import("./pages/admin/Support"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));

/* ===== EVENT ADMIN ===== */
const EventDashboard = lazy(() => import("./pages/admin/EventDashboard"));
const EventManage = lazy(() => import("./pages/admin/EventManage"));
const EventTickets = lazy(() => import("./pages/admin/EventTickets"));
const EventScan = lazy(() => import("./pages/admin/EventScan"));

/* ===== BUS COMPANY ADMIN ===== */
const BusAdminDashboard = lazy(() => import("./pages/admin/busAdmin/BusAdminDashboard"));
const BusAdminBuses = lazy(() => import("./pages/admin/busAdmin/BusAdminBuses"));
const BusAdminFleet = lazy(() => import("./pages/admin/busAdmin/BusAdminFleet"));
const BusAdminBookings = lazy(() => import("./pages/admin/busAdmin/BusAdminBookings"));
const BusAdminDrivers = lazy(() => import("./pages/admin/busAdmin/BusAdminDrivers"));

/* ===== HOTEL ADMIN ===== */
const HotelAdminDashboard = lazy(() => import("./pages/admin/hotelAdmin/HotelAdminDashboard"));
const HotelAdminBookings = lazy(() => import("./pages/admin/hotelAdmin/HotelAdminBookings"));
const HotelAdminManage = lazy(() => import("./pages/admin/hotelAdmin/HotelAdminManage"));
const HotelAdminRooms = lazy(() => import("./pages/admin/hotelAdmin/HotelAdminRooms"));

/* ===== TOUR / RELIGIOUS / AIRLINE / CONSULTANT ADMIN ===== */
/* Rental Company Admin. No live-tracking page in this console by design — a
   hired vehicle is not tracked. */
const RentalAdminDashboard = lazy(() => import("./pages/admin/rentalAdmin/RentalAdminDashboard"));
const RentalAdminFleet = lazy(() => import("./pages/admin/rentalAdmin/RentalAdminFleet"));
const RentalAdminBookings = lazy(() => import("./pages/admin/rentalAdmin/RentalAdminBookings"));
const RentalAdminRevenue = lazy(() => import("./pages/admin/rentalAdmin/RentalAdminRevenue"));
const RentalAdminManage = lazy(() => import("./pages/admin/rentalAdmin/RentalAdminManage"));

const TourAdminConsole = lazy(() => import("./pages/admin/tourAdmin/TourAdminConsole"));
const TourAdminPackages = lazy(() => import("./pages/admin/tourAdmin/TourAdminPackages"));
const AirlineAdminConsole = lazy(() => import("./pages/admin/airlineAdmin/AirlineAdminConsole"));
const ConsultantAdminConsole = lazy(() => import("./pages/admin/consultantAdmin/ConsultantAdminConsole"));

function RouteFallback() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" />
    </div>
  );
}

/**
 * The staff application.
 *
 * Same routes the consoles were reached by before, so every dashboard, its
 * links and its deep URLs keep working unchanged — only the sign-in is now
 * one page instead of one per role. Route guards here are convenience; the
 * backend remains the authority on what each token may read or write.
 */
function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" />

      <AdminSessionProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* One sign-in for every staff role */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<StaffLogin />} />

            {/* The per-role sign-in URLs the old app used, and the ones the
                backend still names in "this account signs in at …" — all now
                land on the single staff login. */}
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin-login" element={<Navigate to="/login" replace />} />
            <Route path="/driver/login" element={<Navigate to="/login" replace />} />
            <Route path="/driver-login" element={<Navigate to="/login" replace />} />
            <Route path="/bus-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/tour-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/religious-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/rental-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/hotel-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/airline-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/event-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/consultant-admin/login" element={<Navigate to="/login" replace />} />

            {/* Driver */}
            <Route path="/driver" element={<ProtectedRoute role="driver"><DriverDashboard /></ProtectedRoute>} />
            <Route path="/driver/dashboard" element={<ProtectedRoute role="driver"><DriverDashboard /></ProtectedRoute>} />
            <Route path="/driver/start-trip" element={<ProtectedRoute role="driver"><StartTrip /></ProtectedRoute>} />
            <Route path="/driver/live-trip" element={<ProtectedRoute role="driver"><LiveTrip /></ProtectedRoute>} />
            <Route path="/driver/profile" element={<ProtectedRoute role="driver"><DriverProfile /></ProtectedRoute>} />
            <Route path="/driver/scan-ticket" element={<ProtectedRoute role="driver"><ScanTicket /></ProtectedRoute>} />

            {/* Super Admin */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/companies" element={<ProtectedRoute role="admin"><Companies /></ProtectedRoute>} />
            <Route path="/admin/drivers" element={<ProtectedRoute role="admin"><Drivers /></ProtectedRoute>} />
            <Route path="/admin/news" element={<ProtectedRoute role="admin"><AdminNews /></ProtectedRoute>} />
            <Route path="/admin/tours" element={<ProtectedRoute role="admin"><AdminTours /></ProtectedRoute>} />
            <Route path="/admin/hotels" element={<ProtectedRoute role="admin"><AdminHotels /></ProtectedRoute>} />
            <Route path="/admin/airlines" element={<ProtectedRoute role="admin"><AdminAirlines /></ProtectedRoute>} />
            <Route path="/admin/rentals" element={<ProtectedRoute role="admin"><AdminRentals /></ProtectedRoute>} />
            <Route path="/admin/consultants" element={<ProtectedRoute role="admin"><AdminConsultants /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute role="admin"><AdminEvents /></ProtectedRoute>} />
            <Route path="/admin/admins" element={<ProtectedRoute role="admin"><AdminAdmins /></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute role="admin"><AdminRevenue /></ProtectedRoute>} />
            <Route path="/admin/bookings" element={<ProtectedRoute role="admin"><AdminBookings /></ProtectedRoute>} />
            <Route path="/admin/refunds" element={<ProtectedRoute role="admin"><AdminRefunds /></ProtectedRoute>} />
            <Route path="/admin/support" element={<ProtectedRoute role="admin"><AdminSupport /></ProtectedRoute>} />
            <Route path="/admin/system-health" element={<ProtectedRoute role="admin"><SystemHealth /></ProtectedRoute>} />

            {/* Event Admin */}
            <Route path="/admin/event" element={<ProtectedRoute role="admin"><EventDashboard /></ProtectedRoute>} />
            <Route path="/admin/event/manage" element={<ProtectedRoute role="admin"><EventManage /></ProtectedRoute>} />
            <Route path="/admin/event/tickets" element={<ProtectedRoute role="admin"><EventTickets /></ProtectedRoute>} />
            <Route path="/admin/event/scan" element={<ProtectedRoute role="admin"><EventScan /></ProtectedRoute>} />

            {/* Bus Company Admin */}
            <Route path="/bus-admin" element={<ProtectedRoute role="admin"><BusAdminDashboard /></ProtectedRoute>} />
            <Route path="/bus-admin/buses" element={<ProtectedRoute role="admin"><BusAdminBuses /></ProtectedRoute>} />
            <Route path="/bus-admin/fleet" element={<ProtectedRoute role="admin"><BusAdminFleet /></ProtectedRoute>} />
            <Route path="/bus-admin/bookings" element={<ProtectedRoute role="admin"><BusAdminBookings /></ProtectedRoute>} />
            <Route path="/bus-admin/drivers" element={<ProtectedRoute role="admin"><BusAdminDrivers /></ProtectedRoute>} />

            {/* Rental Company Admin */}
            <Route path="/rental-admin" element={<ProtectedRoute role="admin"><RentalAdminDashboard /></ProtectedRoute>} />
            <Route path="/rental-admin/fleet" element={<ProtectedRoute role="admin"><RentalAdminFleet /></ProtectedRoute>} />
            <Route path="/rental-admin/bookings" element={<ProtectedRoute role="admin"><RentalAdminBookings /></ProtectedRoute>} />
            <Route path="/rental-admin/revenue" element={<ProtectedRoute role="admin"><RentalAdminRevenue /></ProtectedRoute>} />
            <Route path="/rental-admin/manage" element={<ProtectedRoute role="admin"><RentalAdminManage /></ProtectedRoute>} />

            {/* Tour / Religious Admin */}
            <Route path="/tour-admin" element={<ProtectedRoute role="admin"><TourAdminConsole role="tourAdmin" /></ProtectedRoute>} />
            <Route path="/tour-admin/packages" element={<ProtectedRoute role="admin"><TourAdminPackages role="tourAdmin" /></ProtectedRoute>} />
            <Route path="/religious-admin" element={<ProtectedRoute role="admin"><TourAdminConsole role="religiousAdmin" /></ProtectedRoute>} />
            <Route path="/religious-admin/packages" element={<ProtectedRoute role="admin"><TourAdminPackages role="religiousAdmin" /></ProtectedRoute>} />

            {/* Hotel Admin */}
            <Route path="/hotel-admin" element={<ProtectedRoute role="admin"><HotelAdminDashboard /></ProtectedRoute>} />
            <Route path="/hotel-admin/bookings" element={<ProtectedRoute role="admin"><HotelAdminBookings /></ProtectedRoute>} />
            <Route path="/hotel-admin/rooms" element={<ProtectedRoute role="admin"><HotelAdminRooms /></ProtectedRoute>} />
            <Route path="/hotel-admin/manage" element={<ProtectedRoute role="admin"><HotelAdminManage /></ProtectedRoute>} />

            {/* Airline / Consultant Admin */}
            <Route path="/airline-admin" element={<ProtectedRoute role="admin"><AirlineAdminConsole /></ProtectedRoute>} />
            <Route path="/consultant-admin" element={<ProtectedRoute role="admin"><ConsultantAdminConsole /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AdminSessionProvider>
    </BrowserRouter>
  );
}

export default App;
