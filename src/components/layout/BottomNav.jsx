import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Map, Ticket, Search } from "lucide-react";

const navItems = [
  { icon: Home,   path: "/home",       label: "Home"     },
  { icon: Map,    path: "/live",       label: "My Trips" },
  { icon: Ticket, path: "/my-tickets", label: "Tickets"  },
  { icon: Search, path: "/routes",     label: "Search"   },
];

/* A floating bar that names only where you are: the active tab wears a solid
   orange pill which glides between tabs (one shared layoutId), and its label
   expands open while the others stay as icons. Motion is doing a job here —
   it tracks the move rather than decorating it. */
function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-safe"
      aria-label="Main navigation"
    >
      <div className="mx-auto mb-3 flex max-w-md items-center justify-around gap-1 rounded-full border border-line bg-surface/95 p-1.5 shadow-premium backdrop-blur-md">
        {navItems.map(({ icon: Icon, path, label }) => (
          <NavLink
            key={label}
            to={path}
            aria-label={label}
            className="relative flex cursor-pointer items-center justify-center rounded-full px-3.5 py-2.5 transition-transform active:scale-95"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-accent"
                  />
                )}

                <span
                  className={`relative flex items-center gap-1.5 ${
                    isActive ? "text-white" : "text-content-muted"
                  }`}
                >
                  <Icon
                    className="h-[21px] w-[21px] shrink-0"
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden whitespace-nowrap text-[12.5px] font-bold"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
