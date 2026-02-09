import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { AuthModal } from "@/components/AuthModal";

interface AuthModalContextType {
  showAuthModal: (onDismiss?: () => void) => void;
  hideAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const onDismissRef = useRef<(() => void) | undefined>();

  const showAuthModal = useCallback((onDismiss?: () => void) => {
    onDismissRef.current = onDismiss;
    setIsOpen(true);
  }, []);

  // Called when modal is closed by user (X button, click outside)
  const hideAuthModal = useCallback(() => {
    setIsOpen(false);
    const cb = onDismissRef.current;
    onDismissRef.current = undefined;
    cb?.();
  }, []);

  // Called internally when auth succeeds — no dismiss callback
  const closeOnSuccess = useCallback(() => {
    onDismissRef.current = undefined;
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ showAuthModal, hideAuthModal, isAuthModalOpen: isOpen }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={hideAuthModal} onAuthSuccess={closeOnSuccess} />
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
};
