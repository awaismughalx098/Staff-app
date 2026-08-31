import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/* Unified modal shell — bottom sheet on mobile, centered dialog on desktop.
   Replaces the old AdminModal (centered-only) and the hand-rolled
   bottom-sheet/centered hybrid duplicated across Airlines/Hotels/Tours. Same
   props as the old AdminModal so every existing call site is a drop-in swap. */
function GlassModal({ open, onClose, title, subtitle, children, maxWidth = "max-w-lg" }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-[110] flex justify-center md:inset-0 md:items-center md:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`glass-surface max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] p-5 pb-safe shadow-premium md:rounded-card md:pb-5 ${maxWidth}`}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/60 md:hidden" />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold text-content">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-0.5 truncate text-[12px] text-content-muted">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/50 text-content-muted transition-colors duration-200 hover:text-content"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GlassModal;
