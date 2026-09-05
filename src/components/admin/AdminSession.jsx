import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api from "../../api/axios";
import { getAdminToken, logoutAdmin } from "../../utils/adminAuth";
import {
  ADMIN_ROLES,
  normalizeRole,
  roleConfig,
  isFullAdmin,
} from "../../config/adminRoles";

/* Every scoped role the console knows how to draw — taken from the role table
   rather than listed again. A role in that table but missing from this list
   resolves to null, which sends a perfectly valid session back to the sign-in
   page with nothing saying why. */
const SCOPED_ROLES = Object.keys(ADMIN_ROLES);

/* Every value the backend enum allows maps to one of these, so anything else
   means the account is on a role this build does not know how to render. */
export function resolveAdminRole(role) {
  const normalized = normalizeRole(role);
  if (isFullAdmin(normalized)) return "superadmin";
  return SCOPED_ROLES.includes(normalized) ? normalized : null;
}

const AdminSessionContext = createContext(null);

/**
 * The signed-in admin, resolved from the server rather than from storage.
 *
 * The console used to render whichever admin was last written to
 * localStorage, which every tab shares — so the newest sign-in anywhere
 * decided what all the others displayed. Asking the API who the tab's token
 * belongs to makes the console and the token agree by construction, and a
 * role changed or revoked since sign-in applies on the next load.
 */
export function AdminSessionProvider({ children }) {
  const [state, setState] = useState({
    status: getAdminToken() ? "loading" : "anonymous",
    admin: null,
    error: null,
  });

  const load = useCallback(async () => {
    if (!getAdminToken()) {
      setState({ status: "anonymous", admin: null, error: null });
      return;
    }

    try {
      const res = await api.get("/admin/profile");
      const admin = res?.data?.data;

      if (!resolveAdminRole(admin?.role)) {
        throw new Error("This account is on a role this app cannot open.");
      }

      setState({ status: "ready", admin, error: null });
    } catch (err) {
      /* 401 is a dead token, 403 an account with nothing linked to it. Either
         way the tab cannot render a console, so it drops the session instead
         of holding one that every request will reject. */
      logoutAdmin();
      setState({
        status: "anonymous",
        admin: null,
        error: err?.response?.data?.message || err.message || null,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const admin = state.admin;
    const role = resolveAdminRole(admin?.role);
    const config = role ? roleConfig(role) : null;

    /* The one record a scoped admin manages, whatever kind it is. */
    const scope = config ? admin?.[config.scopeField] || null : null;

    return {
      status: state.status,
      error: state.error,
      admin,
      role,
      config,
      scope,
      scopeId: scope?._id || scope || null,
      scopeName: scope?.name || scope?.title || null,
      reload: load,
      signOut: () => {
        logoutAdmin();
        setState({ status: "anonymous", admin: null, error: null });
      },
    };
  }, [state, load]);

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);

  if (!ctx) {
    throw new Error("useAdminSession must be used inside an AdminSessionProvider");
  }

  return ctx;
}

export default AdminSessionProvider;
