import { ReactNode, Suspense, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Inline loader - dark background, no white flash
const InlineAuthCheck = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh] bg-black">
    <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
  </div>
);

// Pops up auth modal, does NOT render protected content.
// If user dismisses modal → navigate to landing.
const AuthGate = () => {
  const { showAuthModal } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    showAuthModal(() => {
      // onDismiss: user closed modal without logging in → go to landing
      navigate('/', { replace: true });
    });
  }, [showAuthModal, navigate]);

  // Neutral dark page — no protected content visible
  return (
    <div className="flex-1 min-h-screen bg-black" />
  );
};

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading, isEmailVerified, profile, signOut } = useAuth();
  const location = useLocation();

  // Only show inline loader during initial auth check
  if (loading && !user) {
    return <InlineAuthCheck />;
  }

  // Not authenticated — show modal popup, no protected content
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <AuthGate />;
  }

  // Authenticated but not verified
  if (user && !isEmailVerified) {
    return <Navigate to="/auth?verify=1" replace state={{ from: location.pathname }} />;
  }

  // Suspended users are blocked from protected pages
  if (profile?.is_suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="w-full max-w-xl rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-white">
          <h2 className="text-xl font-semibold text-red-300">Account Suspended</h2>
          <p className="mt-3 text-sm text-white/70">
            Your account is currently suspended. Contact support if you believe this was a mistake.
          </p>
          {profile.suspension_reason && (
            <p className="mt-3 rounded-lg border border-red-400/20 bg-black/40 px-3 py-2 text-xs text-red-200">
              Reason: {profile.suspension_reason}
            </p>
          )}
          <button
            onClick={() => void signOut()}
            className="mt-6 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Authenticated and verified
  return (
    <Suspense fallback={<InlineAuthCheck />}>
      {children}
    </Suspense>
  );
}

// HOC version
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
