import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { QuickTools } from './components/QuickTools';
import { Showcase } from './components/Showcase';
import { VisualEffects } from './components/VisualEffects';
import { Footer } from './components/Footer';
import { ImageGenerator } from './components/ImageGenerator';
import { VideoCreator } from './components/VideoCreator';
import { InpaintStudio } from './components/InpaintStudio';
import { UpscaleStudio } from './components/UpscaleStudio';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { CommunityFeed } from './components/CommunityFeed';

export default function App() {
  const [currentView, setCurrentView] = useState('explore');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  // Video Creator functions as a full-screen immersive app, so we remove the navbar/footer
  const isFullScreen = currentView === 'video-creator';

  const handleNavigateToProfile = (userId: string) => {
    setViewingProfileId(userId);
    setCurrentView('profile');
    // In a real app, this would use router params like /profile/:id
  };

  const handleRemix = (prompt: string) => {
      // In a real app, pass the prompt to the generator
      // For now, simple navigation
      setCurrentView('image-generator');
      alert(`Remixing prompt: "${prompt.substring(0, 30)}..." (Logic to pre-fill prompt would go here)`);
  };

  const handleSidebarChangeView = (view: string) => {
      setCurrentView(view);
      if (view === 'profile') {
          // If clicking profile from sidebar, show own profile
          setViewingProfileId(null); 
      }
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Sidebar 
        currentView={currentView} 
        onChangeView={handleSidebarChangeView} 
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      {/* Main Content Wrapper - Dynamic margin based on sidebar state */}
      <div 
        className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col min-h-screen ${
            isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {!isFullScreen && <Navbar />}
        
        <main className="flex-1 max-w-[1920px] mx-auto w-full">
          {currentView === 'explore' && (
            <div className="animate-fade-in-up">
              <Hero />
              <QuickTools />
              <Showcase />
              <VisualEffects />
            </div>
          )}
          
          {currentView === 'community' && (
             <CommunityFeed 
                onNavigateToProfile={handleNavigateToProfile}
                onRemix={handleRemix}
             />
          )}

          {currentView === 'image-generator' && (
            <ImageGenerator />
          )}

          {currentView === 'video-creator' && (
             <div className="animate-fade-in-up">
                <VideoCreator />
             </div>
          )}

          {currentView === 'inpaint' && (
             <InpaintStudio />
          )}
          
          {currentView === 'upscale' && (
             <UpscaleStudio />
          )}

          {currentView === 'profile' && (
             <Profile viewingUserId={viewingProfileId} />
          )}

          {currentView === 'settings' && (
             <Settings />
          )}

          {currentView === 'magic-editor' && (
             <div className="p-12 text-center animate-fade-in-up">
                <h2 className="text-2xl font-display font-bold">Magic Editor</h2>
                <p className="text-zinc-500">Coming soon in the next update.</p>
             </div>
          )}
        </main>

        {!isFullScreen && currentView !== 'inpaint' && <Footer />}
      </div>

      {/* Ambient background glows - Visible mostly on dashboard pages */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-violet-900/10 blur-[150px] pointer-events-none -z-10 rounded-full opacity-60" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-fuchsia-900/10 blur-[150px] pointer-events-none -z-10 rounded-full opacity-40" />
    </div>
  );
}