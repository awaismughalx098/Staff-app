import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import api from "../../api/axios";
import { GlassCard, GlassInput, GlassButton } from "../../components/glass";
import { homeFor } from "../../config/adminRoles";
import { logoutAdmin, saveAdminToken } from "../../utils/adminAuth";
import { useAdminSession } from "../../components/admin/AdminSession";
import logo from "../../assets/logo.webp";

function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />
      <div className="absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-secondary/25 blur-[110px]" />
      <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-accent/15 blur-[120px]" />
    </div>
  );
}

function AdminLogin() {
  const navigate = useNavigate();
  const { reload } = useAdminSession();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wrongPortal, setWrongPortal] = useState(null);

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!formData.email.trim()) {
      toast.error("Admin email is required");
      return;
    }

    if (!formData.password.trim()) {
      toast.error("Admin password is required");
      return;
    }

    try {
      setLoading(true);

      /* Drop the previous session first. Whatever happens next, the app is
         never left holding one admin's token beside another's details. */
      logoutAdmin();

      const response = await api.post("/admin/login", {
        email: formData.email.trim(),
        password: formData.password.trim(),
        /* Scoped admins are turned away here and pointed at their own page. */
        portal: "superadmin",
      });

      const admin = response?.data?.data;

      if (!admin?.token) {
        toast.error("Login failed. Token not found.");
        return;
      }

      saveAdminToken(admin.token);
      /* The console reads its identity from the server; refresh it before
         navigating so the layout does not render against the old session. */
      await reload();

      toast.success("Admin login successful");
      navigate(homeFor(admin.role), { replace: true });
    } catch (error) {
      const data = error?.response?.data;

      if (data?.loginPath) setWrongPortal(data.loginPath);

      /* Distinguish "wrong password" from "server unreachable" — the old
         message blamed the credentials either way. */
      toast.error(
        data?.message ||
          (error?.response
            ? "Login failed"
            : "Cannot reach the server. Is the backend running?")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-bg text-content">
      <AuroraBackground />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
        <Link
          to="/login"
          aria-label="Back to passenger login"
          className="glass-surface mb-6 flex h-10 w-10 items-center justify-center rounded-full text-content transition-colors duration-200 hover:bg-white/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="overflow-hidden rounded-3xl shadow-premium">
            <img
              loading="lazy"
              decoding="async" src={logo} alt="Let's Goo Transit" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-content">
            Admin Console
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard className="mt-8" padding="p-6">
            <h2 className="font-display text-xl font-bold text-content">Admin Login</h2>
            <p className="mt-1 text-[13px] text-content-muted">
              Enter your admin credentials to continue.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <GlassInput
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
              />

              <div className="relative">
                <GlassInput
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-content-muted transition-colors duration-200 hover:text-content"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              <GlassButton
                type="submit"
                disabled={loading}
                className="h-[52px] w-full text-[15px]"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4.5 w-4.5" />
                )}
                Login as Admin
              </GlassButton>
            </form>

            {wrongPortal && (
              <Link
                to={wrongPortal}
                className="mt-4 block rounded-card bg-accent-soft px-4 py-3 text-center text-[12.5px] font-bold text-accent"
              >
                Go to your sign-in page →
              </Link>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </main>
  );
}

export default AdminLogin;
