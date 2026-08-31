import { useAdminSession } from "../../../components/admin/AdminSession";

/**
 * The company this admin is scoped to, taken from the session the server
 * resolved. The backend enforces the same scope on every request — this only
 * saves the console from asking "which company?" on each page.
 */
export function useMyCompany() {
  const { scope, scopeId } = useAdminSession();

  return {
    id: scopeId,
    name: scope?.name || null,
    kind: scope?.kind || "bus",
  };
}

export default useMyCompany;
