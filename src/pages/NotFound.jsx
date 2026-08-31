import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";

import logo from "../assets/logo.webp";

/* Shown for any URL that matches no console — a mistyped address or a stale
   bookmark. A branded dead-end with one way out, rather than the platform's
   raw 404. */
function NotFound() {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-bg px-6 text-center text-content">
      <img src={logo} alt="Let's Goo Transit" className="h-11 w-auto object-contain" />

      <Compass className="mt-10 h-14 w-14 text-accent" strokeWidth={1.5} />

      <h1 className="mt-6 text-[26px] font-extrabold leading-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-content-muted">
        This console doesn&apos;t exist, or your account can&apos;t open it.
      </p>

      <Link
        to="/login"
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-input bg-accent px-7 text-sm font-bold text-white transition-transform active:scale-95"
      >
        <Home className="h-5 w-5" />
        Back to sign in
      </Link>
    </main>
  );
}

export default NotFound;
