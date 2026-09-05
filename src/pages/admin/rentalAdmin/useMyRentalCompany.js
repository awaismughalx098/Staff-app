import { useAdminSession } from "../../../components/admin/AdminSession";

/**
 * The rental company this admin is scoped to, taken from the session the
 * server resolved.
 *
 * The backend pins every rentals request to the same company from the token,
 * so this is only here to save each page asking "whose fleet?" — it is not
 * what enforces the boundary, and passing this id to an endpoint would change
 * nothing about what comes back.
 */
export function useMyRentalCompany() {
  const { scope, scopeId } = useAdminSession();

  return {
    id: scopeId,
    name: scope?.name || null,
    /* A suspended company's console still loads; its vehicles are off the
       market, and the pages say so rather than showing an empty fleet. */
    status: scope?.status || null,
    suspended: scope?.status === "suspended",
  };
}

export default useMyRentalCompany;
