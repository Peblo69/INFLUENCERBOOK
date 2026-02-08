import { useState, useEffect } from "react";
import { useAuthModal } from "../../../App";
import { supabase } from "@/lib/supabase";

export const MobileActions = () => {
  const { openAuthModal } = useAuthModal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex items-center gap-6 pointer-events-auto z-50">
      <a
        href="#"
        className="hidden md:block text-sm font-medium text-zinc-400 hover:text-white transition-colors"
      >
        Pricing
      </a>

      {isAuthenticated ? (
        <a
          href="/models"
          className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        >
          <span>Launch App</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      ) : (
        <button
          type="button"
          onClick={openAuthModal}
          className="flex items-center px-6 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        >
          Sign In
        </button>
      )}
    </div>
  );
};
