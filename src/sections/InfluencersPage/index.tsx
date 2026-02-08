import { InfluencersSidebar } from "./components/InfluencersSidebar";

export const InfluencersPage = () => {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Main Sidebar */}
      <InfluencersSidebar />

      {/* Main Content Area - Empty for now */}
      <main className="flex-1 min-w-0 h-full bg-black" />
    </div>
  );
};
