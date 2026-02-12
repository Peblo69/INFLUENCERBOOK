import { ModelsSidebar } from "../ModelsPage/components/ModelsSidebar";
import { User } from "lucide-react";

export const ProfilePage = () => {
  return (
    <div className="flex h-screen w-full bg-black overflow-hidden font-sans text-white">
      <ModelsSidebar />

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="h-16 flex-shrink-0 flex items-center px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <User size={18} className="text-white/40" />
            <h1 className="text-sm font-bold uppercase tracking-widest text-white">Profile</h1>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto" />
      </main>
    </div>
  );
};
