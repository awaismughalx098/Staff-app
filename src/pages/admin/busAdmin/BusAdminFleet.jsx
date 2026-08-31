import { BusFront } from "lucide-react";

import AdminLayout from "../../../components/admin/AdminLayout";
import BusesPanel from "../../../components/admin/BusesPanel";
import { GlassEmptyState } from "../../../components/glass";
import useMyCompany from "./useMyCompany";

/**
 * The operator's own fleet, using the same panel the Super Admin manages a
 * company's buses with — routes, stops, leg fares and seat layout included.
 * It was already written against a single companyId, so pointing it at the
 * signed-in operator's company is all this page does.
 *
 * The server pins new buses to the caller's own company and refuses edits to
 * anyone else's, so nothing here has to police the company field.
 */
function BusAdminFleet() {
  const company = useMyCompany();

  return (
    <AdminLayout
      requireRole="busAdmin"
      title="My Fleet"
      subtitle={company.name || "Your buses"}
    >
      {company.id ? (
        <BusesPanel companyId={company.id} />
      ) : (
        <GlassEmptyState
          icon={BusFront}
          title="No company assigned yet"
          description="Ask the Super Admin to link your account to a company."
          className="mt-16"
        />
      )}
    </AdminLayout>
  );
}

export default BusAdminFleet;
