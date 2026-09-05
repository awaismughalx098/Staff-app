import { useEffect, useMemo, useState } from "react";

import { getRentalCatalog } from "../services/rentalService";

/**
 * The rentals vocabulary — categories, purposes, company types, pricing
 * models — fetched from the server rather than copied into the client.
 *
 * The lists are seed values the platform can extend, so a category added on
 * the backend has to appear in the console without a release. Copying them
 * here would mean a vehicle saved under a category this build has never heard
 * of would render as a raw id like "shuttle_van".
 *
 * The catalog is public and small, so a failure is not worth an error state:
 * the lookups fall back to the stored id, which is ugly but never blank.
 */

/* Module-level, so the four pages of the console fetch this once between
   them rather than once each on every navigation. */
let cached = null;
let inFlight = null;

const load = () => {
  if (cached) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = getRentalCatalog()
      .then((res) => {
        cached = res?.data || null;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

export function useRentalCatalog() {
  const [catalog, setCatalog] = useState(cached);

  useEffect(() => {
    if (cached) return undefined;

    let alive = true;
    load().then((data) => {
      if (alive) setCatalog(data);
    });

    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const lists = {
      purposes: catalog?.purposes || [],
      categories: catalog?.categories || [],
      companyTypes: catalog?.companyTypes || [],
      pricingModels: catalog?.pricingModels || [],
    };

    const labelFrom = (list) => (id) =>
      list.find((entry) => entry.id === id)?.label || id || "";

    return {
      ...lists,
      ready: Boolean(catalog),
      categoryLabel: labelFrom(lists.categories),
      purposeLabel: labelFrom(lists.purposes),
      typeLabel: labelFrom(lists.companyTypes),
      pricingLabel: labelFrom(lists.pricingModels),
      /** Whether this pricing model can never show a figure up front. */
      isQuoteOnly: (id) =>
        Boolean(lists.pricingModels.find((p) => p.id === id)?.quoteOnly),
    };
  }, [catalog]);
}

export default useRentalCatalog;
