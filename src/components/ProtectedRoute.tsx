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
  const { user, loading, isEmailVerified } = useAuth();
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
