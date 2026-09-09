import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Navigation, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "../../api/axios";
import { GlassCard, GlassInput, GlassButton } from "../../components/glass";
import logo from "../../assets/logo.webp";

const FEATURES = [
  { icon: Navigation, label: "Live GPS", hint: "Phone GPS sends trip location" },
  { icon: ShieldCheck, label: "Secure Access", hint: "Managed by admin" },
];

function DriverLogin() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/drivers/login", {
        email: form.email,
        password: form.password,
      });

      const token = res.data?.data?.token;

      if (!token) {
        toast.error("Driver token not found");
        return;
      }

      localStorage.removeItem("adminToken");
      localStorage.setItem("driverToken", token);
      localStorage.setItem("driverInfo", JSON.stringify(res.data.data));

      toast.success("Driver login successful");
      navigate("/driver");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Driver login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-bg px-4 py-10">
      {/* Ambient accent glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-1/2 h-[380px] w-[380px] translate-x-1/2 rounded-full bg-accent/20 blur-[110px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <GlassCard padding="p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="overflow-hidden rounded-2xl shadow-premium">
            <img
              loading="lazy"
              decoding="async" src={logo} alt="Let's Goo Transit" className="h-16 w-16 object-contain" />
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-content">
            Driver Login
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-content-muted">
            Login with the email and password created by admin to start GPS
            trips.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <GlassInput
            label="Email Address"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <div className="relative">
            <GlassInput
              label="Password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-content-muted transition-colors duration-200 hover:text-content"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <GlassButton type="submit" disabled={loading} className="h-12 w-full text-lg">
            {loading ? "Signing in..." : "Login as Driver"}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </GlassButton>
        </form>

        <div className="mt-7 grid grid-cols-2 gap-3 border-t border-line pt-5">
          {FEATURES.map(({ icon: Icon, label, hint }) => (
            <div key={label} className="glass-surface rounded-2xl p-3">
              <Icon className="h-5 w-5 text-accent" />
              <h3 className="mt-2 text-sm font-black text-content">
                {label}
              </h3>
              <p className="mt-0.5 text-xs text-content-muted">{hint}</p>
            </div>
          ))}
        </div>
        </GlassCard>
      </motion.div>
    </main>
  );
}

export default DriverLogin;
