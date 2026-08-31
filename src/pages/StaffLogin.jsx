import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, Lock } from "lucide-react";
import { toast } from "sonner";

import api from "../api/axios";
import { homeFor } from "../config/adminRoles";
import { logoutAdmin, saveAdminToken } from "../utils/adminAuth";
import { useAdminSession } from "../components/admin/AdminSession";
import AuthField from "../components/auth/AuthField";
import BrandMarquee from "../components/auth/BrandMarquee";
import logo from "../assets/logo.webp";

/**
 * The single way into the staff app.
 *
 * There is deliberately one form rather than a page per role: the account
 * itself decides where its owner lands. An admin address is tried first and,
 * because the request carries no `portal`, the backend admits any admin role
 * and answers with it — `homeFor(role)` then picks the console. Only if those
 * credentials are not an admin's at all is the driver endpoint tried, so a
 * driver signs in on the same form without choosing anything.
 *
 * Nothing here grants access. Every dashboard behind it still asks the server
 * who the token belongs to, and every API call is authorised server-side.
 */
export default function StaffLogin() {
  const navigate = useNavigate();
  const { reload } = useAdminSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* Returns true when these are a driver's credentials. Any other failure is
     re-thrown so the caller can report it. */
  const tryDriver = async (credentials) => {
    const res = await api.post("/drivers/login", credentials);
    const token = res?.data?.data?.token;
    if (!token) return false;

    localStorage.setItem("driverToken", token);
    localStorage.setItem("driverInfo", JSON.stringify(res.data.data));
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim()) { toast.error("Enter your email"); return; }
    if (!password) { toast.error("Enter your password"); return; }

    const credentials = { email: email.trim(), password: password.trim() };

    setLoading(true);
    try {
      /* Never hold two identities at once. */
      logoutAdmin();
      localStorage.removeItem("driverToken");
      localStorage.removeItem("driverInfo");

      let adminError = null;
      try {
        /* No `portal`: the server admits whichever admin role this is. */
        const response = await api.post("/admin/login", credentials);
        const admin = response?.data?.data;

        if (admin?.token) {
          saveAdminToken(admin.token);
          /* The console reads its identity from the server; refresh before
             navigating so the layout renders against the new session. */
          await reload();
          toast.success("Signed in");
          navigate(homeFor(admin.role), { replace: true });
          return;
        }
      } catch (err) {
        adminError = err;
        /* 401 only means "not an admin account" — fall through and try the
           driver endpoint. Anything else (403 scope problem, 5xx) is a real
           answer about this account and is reported as-is. */
        if (err?.response?.status && err.response.status !== 401) throw err;
      }

      if (await tryDriver(credentials)) {
        toast.success("Signed in");
        navigate("/driver", { replace: true });
        return;
      }

      throw adminError || new Error("Invalid email or password");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(
        err?.response?.data?.message ||
          (status
            ? "Invalid email or password"
            : "Can't reach the server. Check your connection and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full flex-col bg-bg text-content">
      <BrandMarquee className="pt-safe" />

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <div className="flex justify-center">
          <img
            src={logo}
            alt="Let's Goo Transit"
            className="h-14 w-auto object-contain"
          />
        </div>

        <div className="mt-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            Staff Portal
          </p>
          <h1 className="mt-1.5 text-[22px] font-extrabold tracking-tight text-content">
            Sign in to your console
          </h1>
          <p className="mt-1 text-[13px] text-content-muted">
            Admins and drivers use this same sign-in.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-3">
          <AuthField
            icon={AtSign}
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />

          <AuthField
            icon={Lock}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-[52px] w-full rounded-input bg-accent text-[15px] font-bold tracking-wide text-white transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() =>
            toast.info("Ask the Super Admin to reset your password.")
          }
          className="mt-5 text-center text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
        >
          Forgot password?
        </button>
      </div>
    </main>
  );
}
