import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * True when the user has asked their OS to reduce motion.
 * CSS animations are already shortened globally in index.css, but
 * JS-driven animations (Framer Motion, canvas loops) must check this.
 * @returns {boolean}
 */
export default function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia(QUERY);
    const handleChange = (event) => setReduced(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}