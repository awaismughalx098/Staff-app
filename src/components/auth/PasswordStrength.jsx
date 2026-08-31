import { motion } from "framer-motion";

export function scorePassword(password = "") {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: "Too short",    color: "var(--danger)",  bars: 0 },
  { label: "Weak",         color: "var(--danger)",  bars: 1 },
  { label: "Medium",       color: "var(--accent)",  bars: 2 },
  { label: "Strong",       color: "var(--success)", bars: 3 },
  { label: "Very strong",  color: "var(--success)", bars: 4 },
];

function PasswordStrength({ password = "" }) {
  if (!password) return null;

  const score = scorePassword(password);
  const level = LEVELS[score];

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((index) => {
          const filled = index < level.bars;
          return (
            <motion.span
              key={index}
              initial={false}
              animate={{ backgroundColor: filled ? level.color : "var(--divider)" }}
              transition={{ duration: 0.25 }}
              className="h-1 flex-1 rounded-full"
            />
          );
        })}
      </div>
      <p
        className="mt-1.5 font-body text-xs font-medium"
        style={{ color: level.color }}
      >
        {level.label} password
      </p>
    </div>
  );
}

export default PasswordStrength;