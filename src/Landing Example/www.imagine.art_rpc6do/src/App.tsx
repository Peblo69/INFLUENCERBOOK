import { useState, createContext, useContext } from "react";
import { Main } from "./components/Main";
import { ChatWidget } from "./components/ChatWidget";
import { ChatButton } from "./components/ChatButton";
import { ChatModal } from "./components/ChatModal";
import { AuthModal } from "./components/AuthModal";

// Create context for auth modal
interface AuthModalContextType {
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within App");
  }
  return context;
};

export const App = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      <div className="text-white text-base not-italic normal-nums font-normal accent-auto bg-stone-950 box-border caret-transparent block tracking-[normal] leading-6 list-outside list-disc pointer-events-auto text-start indent-[0px] normal-case visible border-separate font-inter min-h-screen">
        <section
          aria-label="Notifications alt+T"
          className="box-border caret-transparent"
        ></section>
        <Main />
        <div className="absolute box-border caret-transparent block"></div>
        <ChatWidget />
        <ChatButton />
        <ChatModal />
        <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
        <div className="text-black text-[11px] box-border caret-transparent leading-[11px] text-left font-lucida_grande">
          <div className="absolute box-border caret-transparent h-0 top-[-10000px] w-0 overflow-hidden">
            <div className="box-border caret-transparent"></div>
          </div>
        </div>
      </div>
    </AuthModalContext.Provider>
  );
};
