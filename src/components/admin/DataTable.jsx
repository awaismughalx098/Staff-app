import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";

/**
 * Compact admin table. Rows carry their own edit/delete actions.
 *
 * On narrow screens a real table would either overflow or shrink columns to
 * nothing, so the same rows render as stacked cards below `sm` — the data and
 * the actions stay identical, only the layout changes.
 *
 * @param {{key: string, label: string, className?: string}[]} columns
 * @param {object[]} rows        each row must have `_id`
 * @param {(row) => object} cell values keyed by column key
 */
function DataTable({ columns, rows, cell, onEdit, onDelete, emptyLabel = "Nothing here yet" }) {
  if (rows.length === 0) {
    return (
      <div className="glass-surface rounded-card p-8 text-center">
        <p className="text-[13px] text-content-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <>
      {/* Table — sm and up */}
      <div className="hidden overflow-x-auto rounded-card border border-line sm:block">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="bg-elevated">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-content-muted ${
                    c.className || ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 py-3 text-right text-[11.5px] font-bold uppercase tracking-wide text-content-muted">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const values = cell(row);
              return (
                <motion.tr
                  key={row._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.25 }}
                  className="border-t border-line bg-surface transition-colors hover:bg-elevated/60"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 text-[13px] text-content ${c.className || ""}`}
                    >
                      {values[c.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            aria-label="Edit"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content-muted transition-colors hover:text-accent"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            aria-label="Delete"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content-muted transition-colors hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stacked rows — below sm */}
      <div className="space-y-2.5 sm:hidden">
        {rows.map((row, i) => {
          const values = cell(row);
          return (
            <motion.div
              key={row._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.25 }}
              className="glass-surface rounded-card p-3.5 shadow-glass"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  {columns.map((c, ci) => (
                    <div key={c.key} className="min-w-0">
                      {ci === 0 ? (
                        <p className="truncate text-[13.5px] font-bold text-content">
                          {values[c.key]}
                        </p>
                      ) : (
                        <p className="truncate text-[11.5px] text-content-muted">
                          <span className="text-content-faint">{c.label}: </span>
                          {values[c.key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {(onEdit || onDelete) && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        aria-label="Edit"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        aria-label="Delete"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

export default DataTable;
