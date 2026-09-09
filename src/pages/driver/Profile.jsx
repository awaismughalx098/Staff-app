import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Eye, EyeOff, ImageMinus, LogOut, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import BackHeader from "../../components/layout/BackHeader";
import { GlassInput, GlassButton } from "../../components/glass";

function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("driverProfile");

    return saved
      ? JSON.parse(saved)
      : {
          name: "Driver Name",
          email: "driver@email.com",
          phone: "03000000000",
          password: "********",
          image: "",
        };
  });

  const updateProfile = (key, value) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    localStorage.setItem("driverProfile", JSON.stringify(updated));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => updateProfile("image", reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    updateProfile("image", "");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("selectedDriverBus");
    localStorage.removeItem("activeDriverTrip");
    toast.success("Logged out");
    navigate("/driver-login");
  };

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-bg">
      <BackHeader title="Driver Profile" subtitle="Manage your account" fallback="/driver" />

      <div className="mx-auto w-full max-w-md px-4 pb-10">
        <section className="mt-5 flex items-center gap-4 border-b border-line pb-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line">
            {profile.image ? (
              <img
              loading="lazy"
              decoding="async"
                src={profile.image}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent-soft">
                <User className="h-8 w-8 text-accent" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-bold text-content">
              {profile.name}
            </h2>
            <p className="truncate text-sm text-content-muted">{profile.email}</p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-success">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Driver
            </div>
          </div>
        </section>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <GlassButton
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            className="h-11 w-full"
          >
            <Camera className="h-4 w-4" />
            Edit Image
          </GlassButton>

          <GlassButton
            type="button"
            variant="ghost"
            onClick={removeImage}
            className="glass-surface h-11 w-full"
          >
            <ImageMinus className="h-4 w-4" />
            Delete
          </GlassButton>
        </div>

        <section className="mt-6 space-y-4">
          <GlassInput
            label="Driver Name"
            value={profile.name}
            onChange={(e) => updateProfile("name", e.target.value)}
          />

          <GlassInput
            label="Email Address"
            type="email"
            value={profile.email}
            onChange={(e) => updateProfile("email", e.target.value)}
          />

          <GlassInput
            label="Phone Number"
            type="tel"
            value={profile.phone}
            onChange={(e) => updateProfile("phone", e.target.value)}
          />

          <div className="relative">
            <GlassInput
              label="Password"
              type={showPassword ? "text" : "password"}
              value={profile.password}
              onChange={(e) => updateProfile("password", e.target.value)}
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
        </section>

        <GlassButton
          type="button"
          variant="danger"
          onClick={handleLogout}
          className="mt-6 h-12 w-full text-lg"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </GlassButton>
      </div>
    </main>
  );
}

export default Profile;
