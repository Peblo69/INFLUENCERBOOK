import { ReactNode, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Inline loader - no full screen blocking
const InlineAuthCheck = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
  </div>
);

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading, isEmailVerified } = useAuth();
  const location = useLocation();

  // Only show inline loader during initial auth check
  // After that, let the children render while auth settles in background
  if (loading && !user) {
    return <InlineAuthCheck />;
  }

  // Not authenticated - redirect to auth page
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // Authenticated but not verified - redirect to auth page
  if (user && !isEmailVerified) {
    return <Navigate to="/auth?verify=1" replace state={{ from: location.pathname }} />;
  }

  // Authenticated and verified - render children immediately
  // Wrap in Suspense to handle any lazy-loaded children gracefully
  return (
    <Suspense fallback={<InlineAuthCheck />}>
      {children}
    </Suspense>
  );
}

// HOC version for wrapping pages
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
