/**
 * A size that grows with the screen instead of being one number everywhere.
 *
 * The app had twenty-odd hand-picked font sizes between 9px and 28px, including
 * half-pixel variants, every one of them fixed. A 320px phone and a 430px phone
 * therefore rendered identical type in very different amounts of room — which
 * is why cards read cramped on one handset and loose on another.
 *
 * Interpolates between PHONE_MIN and PHONE_MAX and then holds: below 320 it
 * stops shrinking (text has to stay legible) and above 430 it stops growing (a
 * tablet should not get billboard body copy).
 *
 * @param {number} min px at 320
 * @param {number} max px at 430 and above
 */
const PHONE_MIN = 320;
const PHONE_MAX = 430;

const fluid = (min, max) => {
  const slope = (max - min) / (PHONE_MAX - PHONE_MIN);
  const intercept = min - slope * PHONE_MIN;
  return `clamp(${min}px, ${intercept.toFixed(3)}px + ${(slope * 100).toFixed(4)}vw, ${max}px)`;
};

/* One step per real use, each sized so the current value lands near 390px — the
   most common handset width — so the design is preserved on the majority device
   while 320 gets breathing room and 430 gets the space it has. */
const fluidText = (min, max, leading) => [fluid(min, max), { lineHeight: leading }];

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* Tailwind's smallest default breakpoint is sm:640px, so every phone from
         320 to 430 fell into one unprefixed bucket with no way to tell them
         apart. These two cover the real split points; the fluid scale above
         handles everything in between without a breakpoint at all. */
      screens: {
        xs: "400px",
        "2xs": "360px",
      },
      /* Replaces the ad-hoc text-[13px] values. Names are semantic so a reader
         picks a role, not a number. */
      fontSize: {
        "2xs": fluidText(9.2, 10.6, "1.35"),
        xs: fluidText(10.4, 11.9, "1.4"),
        sm: fluidText(11.4, 13, "1.45"),
        base: fluidText(12.3, 14, "1.5"),
        lg: fluidText(13.3, 15.2, "1.5"),
        xl: fluidText(15.2, 18.4, "1.35"),
        "2xl": fluidText(17.5, 21.5, "1.25"),
        "3xl": fluidText(21, 27, "1.15"),
        "4xl": fluidText(25, 33, "1.1"),
      },

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