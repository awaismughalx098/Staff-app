import { ChevronRight } from "lucide-react";

/* Icon-square + title/subtitle + trailing chevron — replaces the identical
   row pattern hand-rolled across Hotels/ComfortableRides/Booking/
   LiveTrackingCompanies (CompanyRow/CityRow etc). Wrap in framer-motion at
   the call site for stagger-in animation, same as the existing per-page
   patterns this replaces. */
function ListRow({ image, icon: Icon, title, subtitle, meta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-surface flex w-full cursor-pointer items-center gap-4 rounded-card p-4 text-left transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft">
        {image ? (
          <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          Icon && <Icon className="h-7 w-7 text-accent" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-bold text-content">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-[12px] text-content-muted">{subtitle}</span>
        )}
        {meta}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-content-muted" />
    </button>
  );
}

export default ListRow;
