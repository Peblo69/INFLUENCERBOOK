import { useState } from "react";
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

// Social Icons
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export const AuthModal = ({ isOpen, onClose, onAuthSuccess }: AuthModalProps) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const resetForm = () => {
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  };

  const switchMode = (newMode: "signin" | "signup") => {
    setMode(newMode);
    resetForm();
  };

  const handleOAuth = async (provider: "google" | "discord") => {
    try {
      setError("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message || "Invalid email or password");
    } else {
      onAuthSuccess ? onAuthSuccess() : onClose();
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    if (error) {
      setError(error.message || "Failed to create account");
    } else {
      setSuccess("Account created! Check your email to verify.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop — frosted glass, page visible through blur */}
      <div
        className="absolute inset-0 bg-white/[0.03] backdrop-blur-[40px] cursor-pointer"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[420px] bg-[#0c0c0c]/90 backdrop-blur-2xl border border-white/[0.08] rounded-[20px] shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/40 hover:text-white transition-all duration-200"
        >
          <X size={16} />
        </button>

        <div className="px-8 pt-8 pb-7">
          {/* Branding */}
          <div className="text-center mb-7">
            <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.739-8z"/>
              </svg>
            </div>
            <h2 className="text-[20px] font-semibold text-white tracking-tight">
              The AI Influencerbook
            </h2>
            <p className="text-[12px] text-white/30 mt-1 font-light">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 mb-6 bg-white/[0.04] rounded-xl border border-white/[0.06]">
            <button
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-200 ${
                mode === "signin"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-200 ${
                mode === "signup"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth */}
          <div className="flex gap-2.5 mb-5">
            <button
              onClick={() => handleOAuth("google")}
              className="flex-1 h-11 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.15] rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200"
            >
              <GoogleIcon />
              <span className="text-[13px] font-medium text-white/80">Google</span>
            </button>
            <button
              onClick={() => handleOAuth("discord")}
              className="flex-1 h-11 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.15] rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200"
            >
              <DiscordIcon />
              <span className="text-[13px] font-medium text-white/80">Discord</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-500/[0.08] border border-red-500/[0.15] rounded-xl text-red-400 text-[12px]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-3.5 py-2.5 bg-emerald-500/[0.08] border border-emerald-500/[0.15] rounded-xl text-emerald-400 text-[12px]">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-medium text-white/25 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 text-[13px] text-white placeholder:text-white/20 outline-none transition-all duration-200 focus:border-white/[0.2] focus:bg-white/[0.06]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-medium text-white/25 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min. 6 characters"
                  className="w-full h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-11 text-[13px] text-white placeholder:text-white/20 outline-none transition-all duration-200 focus:border-white/[0.2] focus:bg-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (sign up only) */}
            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-medium text-white/25 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 text-[13px] text-white placeholder:text-white/20 outline-none transition-all duration-200 focus:border-white/[0.2] focus:bg-white/[0.06]"
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading
                ? mode === "signin" ? "Signing in..." : "Creating account..."
                : mode === "signin" ? "Sign In" : "Create Account"
              }
            </button>
          </form>

          {/* Footer toggle */}
          <p className="text-center text-[12px] text-white/30 mt-5">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => switchMode("signup")} className="text-white/70 hover:text-white font-medium transition-colors">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => switchMode("signin")} className="text-white/70 hover:text-white font-medium transition-colors">
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Legal */}
          <p className="text-center text-[10px] text-white/15 mt-4 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};
