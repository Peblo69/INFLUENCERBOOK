import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const AuthPage = () => {
  const { user, isEmailVerified, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const params = new URLSearchParams(location.search);
  const verifyParam = params.get("verify");
  const from = (location.state as { from?: string } | null)?.from || "/models";
  const needsVerification = !!user && !isEmailVerified && !recoveryMode;

  useEffect(() => {
    const errorDescription = params.get("error_description") || params.get("error");
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as
      | "signup"
      | "invite"
      | "magiclink"
      | "recovery"
      | "email_change"
      | "phone_change"
      | null;
    const isRecovery = type === "recovery";

    if (errorDescription) {
      setError(decodeURIComponent(errorDescription));
      return;
    }

    if (!code && !(tokenHash && type)) {
      return;
    }

    const run = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (verifyError) throw verifyError;
        }

        if (isRecovery) {
          setRecoveryMode(true);
          setResetting(false);
          setMessage("Set a new password to continue.");
          return;
        }

        setMessage("Email verified. Redirecting...");
        setTimeout(() => navigate(from, { replace: true }), 800);
      } catch (err: any) {
        setError(err?.message || "Email verification failed");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [from, navigate, location.search]);

  useEffect(() => {
    if (user && isEmailVerified && !recoveryMode) {
      navigate(from, { replace: true });
    }
  }, [user, isEmailVerified, recoveryMode, navigate, from]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const confirmed = !!(data.user?.email_confirmed_at ?? (data.user as any)?.confirmed_at);
        if (!confirmed) {
          await supabase.auth.signOut();
          setMessage("Please verify your email to continue.");
          return;
        }

        setMessage("Logged in successfully.");
        setTimeout(() => navigate(from, { replace: true }), 800);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?verify=1`,
          },
        });

        if (error) throw error;

        if (data.session) {
          await supabase.auth.signOut();
        }

        setMessage("Account created. Check your email to verify.");
      }
    } catch (err: any) {
      const messageText = err?.message || "Authentication failed";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      setMessage("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setLoading(false);
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage("Password updated. Please sign in.");
      await supabase.auth.signOut();
      setRecoveryMode(false);
      setResetting(false);
      setIsLogin(true);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = user?.email || email;
    if (!targetEmail) {
      setError("Enter your email to resend verification.");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    const { error } = await resendVerification(targetEmail);
    if (error) {
      setError(error.message || "Failed to resend verification email");
    } else {
      setMessage("Verification email sent.");
    }

    setResending(false);
  };

  const isResetFlow = resetting || recoveryMode;
  const formTitle = recoveryMode
    ? "Reset your password"
    : resetting
      ? "Reset your password"
      : isLogin
        ? "Sign in to your account"
        : "Create your account";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black z-0"></div>

      {/* Starfield */}
      <div className="fixed inset-0 overflow-hidden z-[1]">
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }

          .stars-layer {
            background-image:
              radial-gradient(2px 2px at 20% 30%, white, transparent),
              radial-gradient(2px 2px at 60% 70%, white, transparent),
              radial-gradient(1px 1px at 50% 50%, white, transparent),
              radial-gradient(1px 1px at 80% 10%, white, transparent),
              radial-gradient(2px 2px at 90% 60%, white, transparent);
            background-size: 200% 200%;
            animation: twinkle 4s ease-in-out infinite;
            opacity: 0.5;
          }
        `}</style>
        <div className="stars-layer absolute inset-0"></div>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">AI Influencer Studio</h1>
            <p className="text-sm text-white/60">{formTitle}</p>
          </div>

          {(needsVerification || verifyParam === "1") && !isResetFlow && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-sm text-blue-200">
                Verify your email to continue. If you did not receive the email, resend below.
              </div>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-3 w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 text-sm font-medium rounded-lg transition-all disabled:opacity-60"
              >
                {resending ? "Resending..." : "Resend verification email"}
              </button>
            </div>
          )}

          {!isResetFlow && (
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isLogin
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  !isLogin
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          <form
            onSubmit={recoveryMode ? handlePasswordUpdate : resetting ? handleResetRequest : handleAuth}
            className="space-y-4"
          >
            {!recoveryMode && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            )}

            {!recoveryMode && !resetting && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500/50 transition-all"
                  placeholder="********"
                />
                {!isLogin && (
                  <p className="text-xs text-white/50 mt-1">Minimum 6 characters</p>
                )}
              </div>
            )}

            {recoveryMode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500/50 transition-all"
                    placeholder="Enter a new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500/50 transition-all"
                    placeholder="Confirm your password"
                  />
                </div>
              </>
            )}

            {isLogin && !resetting && !recoveryMode && (
              <button
                type="button"
                onClick={() => {
                  setResetting(true);
                  setError("");
                  setMessage("");
                }}
                className="text-xs text-white/60 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            )}

            {(resetting || recoveryMode) && (
              <button
                type="button"
                onClick={() => {
                  setResetting(false);
                  setRecoveryMode(false);
                  setError("");
                  setMessage("");
                }}
                className="text-xs text-white/60 hover:text-white transition-colors"
              >
                Back to sign in
              </button>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-300 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-300 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {recoveryMode
                    ? "Updating password..."
                    : resetting
                      ? "Sending reset link..."
                      : isLogin
                        ? "Signing in..."
                        : "Creating account..."}
                </div>
              ) : (
                recoveryMode
                  ? "Update Password"
                  : resetting
                    ? "Send Reset Link"
                    : isLogin
                      ? "Sign In"
                      : "Create Account"
              )}
            </button>
          </form>

          {!isLogin && !isResetFlow && (
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-300 text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">New users get 1,000 free credits!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
