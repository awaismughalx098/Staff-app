import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BusFront } from "lucide-react";

import useReducedMotionPreference from "../../hooks/useReducedMotionPreference";
import logo from "../../assets/logo.webp";

const LETTERS = "Driver Portal".split("");

function DriverSplash() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotionPreference();

  useEffect(() => {
    const isSignedIn = Boolean(localStorage.getItem("driverToken"));
    const delay = reducedMotion ? 400 : 1800;

    const timer = setTimeout(() => {
      navigate(isSignedIn ? "/driver" : "/driver-login", { replace: true });
    }, delay);

    return () => clearTimeout(timer);
  }, [navigate, reducedMotion]);

  return (
    <motion.main
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-bg"
    >
      {/* Ambient accent glow */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="pointer-events-none absolute h-[380px] w-[380px] rounded-full bg-accent/20 blur-[100px]"
      />

      {/* Logo mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[30px] shadow-premium"
      >
        <img src={logo} alt="Let's Goo Transit" className="h-32 w-32 object-contain" />
      </motion.div>

      {/* App name letter by letter */}
      <div className="relative mt-5 flex items-center" aria-label="Driver Portal">
        {LETTERS.map((char, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.38,
              delay: reducedMotion ? 0 : 0.32 + i * 0.035,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="font-display text-[28px] font-bold tracking-tight text-content"
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </div>

      {/* Bus travelling along route line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reducedMotion ? 0 : 0.55 }}
        className="relative mt-12 h-7 w-[200px]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 28" className="absolute inset-0 h-full w-full" fill="none">
          <circle cx="8" cy="14" r="4" fill="rgba(59,130,246,0.55)" />
          <line
            x1="16" y1="14" x2="184" y2="14"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5 8"
          />
          <circle cx="192" cy="14" r="4" fill="rgba(59,130,246,0.55)" />
        </svg>

        <motion.div
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: reducedMotion ? 0 : 162, opacity: 1 }}
          transition={{
            x: { duration: reducedMotion ? 0 : 1.1, delay: reducedMotion ? 0 : 0.6, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.3, delay: reducedMotion ? 0 : 0.55 },
          }}
          className="absolute left-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-glass"
        >
          <BusFront className="h-4 w-4" strokeWidth={2} />
        </motion.div>
      </motion.div>
    </motion.main>
  );
}

export default DriverSplash;
