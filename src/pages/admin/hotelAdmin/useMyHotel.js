import { useAdminSession } from "../../../components/admin/AdminSession";

/**
 * The hotel this admin is scoped to, taken from the session the server
 * resolved. The backend enforces the same scope on every request — this only
 * saves the console from asking "which hotel?" on each page.
 */
export function useMyHotel() {
  const { scope, scopeId } = useAdminSession();

  return {
    id: scopeId,
    name: scope?.name || null,
    city: scope?.city || null,
  };
}

export default useMyHotel;
