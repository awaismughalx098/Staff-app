import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

/**
 * Shared compact card for every admin CRUD list (Companies, Buses, Drivers,
 * Tours, Hotels, Airlines, News). Fixed ~160px height, 16px radius, subtle
 * lift on hover. Delete requires a second confirming tap (auto-resets after
 * 4s) instead of a blocking window.confirm().
 */
function EntityCard({
  image,
  icon: Icon,
  title,
  subtitle,
  meta,
  badges = [],
  status,
  onToggleStatus,
  onEdit,
  onDelete,
  onClick,
}) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    clearTimeout(timerRef.current);
    setConfirming(false);
    onDelete?.();
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit?.();
  };

  const StatusTag = onToggleStatus ? "button" : "span";

  return (
    <article
      onClick={onClick}
      className={`glass-surface group relative flex h-[160px] flex-col justify-between rounded-card p-3.5 shadow-glass transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/60 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/50">
          {image ? (
            <img
              loading="lazy"
              decoding="async" src={image} alt={title} className="h-full w-full object-cover" />
          ) : (
            Icon && <Icon className="h-5 w-5 text-accent" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-bold leading-tight text-content">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12px] font-semibold text-accent">
              {subtitle}
            </p>
          )}
        </div>

        {status && (
          <StatusTag
            type={onToggleStatus ? "button" : undefined}
            onClick={
              onToggleStatus
                ? (e) => {
                    e.stopPropagation();
                    onToggleStatus();
                  }
                : undefined
            }
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors duration-200 ${
              onToggleStatus ? "cursor-pointer" : ""
            } ${
              status.active
                ? "bg-route-green-soft text-route-green"
                : "bg-route-red-soft text-route-red"
            }`}
          >
            {status.label}
          </StatusTag>
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
        {meta && (
          <p className="truncate text-[11.5px] text-content-muted">{meta}</p>
        )}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-bold text-content-muted"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex items-center justify-end gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={handleEditClick}
              aria-label={`Edit ${title}`}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/50 text-content-muted transition-colors duration-200 hover:text-content"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              aria-label={`Delete ${title}`}
              className={`flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-200 ${
                confirming
                  ? "w-auto bg-danger/15 px-3 text-danger"
                  : "w-8 bg-white/50 text-content-muted hover:text-danger"
              }`}
            >
              {confirming ? "Confirm?" : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default EntityCard;
