/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /**
       * Every colour below points at a CSS variable defined in src/index.css.
       * Single strict light theme (Aurora Glass): bg #EEF5FF, glass surface
       * rgba(255,255,255,0.45), primary #3B82F6. Change values only in index.css.
       */
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        elevated: "var(--surface-2)",
        line: "var(--border)",
        divider: "var(--divider)",

        content: "var(--text)",
        "content-muted": "var(--text-muted)",
        "content-faint": "var(--text-faint)",

        accent: "var(--accent)",
        "accent-text": "var(--accent-text)",
        "accent-soft": "var(--accent-soft)",
        "accent-line": "var(--accent-border)",
        secondary: "var(--secondary)",

        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",

        "route-red": "var(--route-red)",
        "route-red-soft": "var(--route-red-soft)",
        "route-green": "var(--route-green)",
        "route-green-soft": "var(--route-green-soft)",
        "route-blue": "var(--route-blue)",
        "route-blue-soft": "var(--route-blue-soft)",

        /* Operational transport status */
        "status-live": "var(--status-live)",
        "status-live-soft": "var(--status-live-soft)",
        "status-delayed": "var(--status-delayed)",
        "status-delayed-soft": "var(--status-delayed-soft)",
        "status-departed": "var(--status-departed)",
        "status-departed-soft": "var(--status-departed-soft)",

        /* Seat-map gender coding */
        "seat-male": "var(--seat-male)",
        "seat-male-soft": "var(--seat-male-soft)",
        "seat-female": "var(--seat-female)",
        "seat-female-soft": "var(--seat-female-soft)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      /* Intentional, restrained radii — a transport UI reads as engineered, not
         soft. Big pill rounding is reserved for actual pills/avatars via
         rounded-full; containers stay crisp. */
      borderRadius: {
        input: "10px",
        card: "14px",
      },
      /* Shadows are used sparingly and are neutral/warm, never coloured glows —
         depth should be felt, not decorative. */
      boxShadow: {
        auth: "var(--shadow-auth)",
        "accent-glow": "0 0 0 3px var(--accent-soft)",
        glass: "0 1px 2px rgba(28, 25, 23, 0.06), 0 1px 3px rgba(28, 25, 23, 0.05)",
        premium: "0 6px 20px rgba(28, 25, 23, 0.08)",
      },
      keyframes: {
        "route-dash": {
          to: { strokeDashoffset: "-24" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "route-dash": "route-dash 1s linear infinite",
        "soft-pulse": "soft-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};