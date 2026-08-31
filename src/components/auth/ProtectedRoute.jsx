import { Navigate, useLocation } from "react-router-dom";

import { getAdminToken } from "../../utils/adminAuth";

/* Admin sessions live per tab, so they are read through their own helper
   rather than straight off localStorage like the driver's. */
const readToken = {
  driver: () => localStorage.getItem("driverToken"),
  admin: getAdminToken,
};

/**
 * Keeps a signed-out visitor out of a console.
 *
 * Every role in this app signs in at the one staff login, so there is no
 * per-role redirect to choose. This is a convenience only — the server checks
 * the token on every request, and a URL typed by hand reaches nothing without
 * one it accepts.
 */
function ProtectedRoute({ role, children }) {
  const location = useLocation();

  const token = readToken[role]?.() || null;

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
