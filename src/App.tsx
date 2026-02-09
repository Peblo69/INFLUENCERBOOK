import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { Header } from "@/sections/Header";
import { Footer } from "@/sections/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
// LanguageSwitcher is now embedded in each page's navbar/sidebar
import { DomAutoTranslator } from "@/components/DomAutoTranslator";

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED LOADING STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════
// 
// EAGER LOADED (immediately available, no delay):
// - Landing: First impression, must be instant
// - Auth: Login/signup should never wait
// - Assistant: Main product feature, always needed
// - Models: Core functionality, frequently accessed
//
// LAZY LOADED (on demand, with prefetching):
// - Secondary pages: Library, Settings, Billing, etc.

// ── Eager loaded (critical paths) ──
import { App as LandingApp } from "@/Landing Example/www.imagine.art_rpc6do/src/App";
import { AuthPage } from "@/sections/AuthPage";
import { AssistantPage } from "@/sections/AssistantPage";
import { ModelsPage } from "@/sections/ModelsPage";
import { InfluencersPage } from "@/sections/InfluencersPage";
import { MainContent } from "@/sections/MainContent";

// ── Lazy loaded (secondary pages) ──
// Each import function is stored so we can prefetch on idle
const importLibrary = () => import("@/sections/LibraryPage").then(m => ({ default: m.LibraryPage }));
const importUploads = () => import("@/sections/UploadsPage").then(m => ({ default: m.UploadsPage }));
const importSettings = () => import("@/sections/SettingsPage").then(m => ({ default: m.SettingsPage }));
const importBilling = () => import("@/sections/BillingPage").then(m => ({ default: m.BillingPage }));
const importInvoices = () => import("@/sections/InvoicesPage").then(m => ({ default: m.InvoicesPage }));
const importSocial = () => import("@/sections/SocialFeedPage").then(m => ({ default: m.SocialFeedPage }));
const importVideoEditor = () => import("@/sections/VideoEditorPage").then(m => ({ default: m.VideoEditorPage }));
const importVideos = () => import("@/sections/VideosPage").then(m => ({ default: m.VideosPage }));
const importStudioLabs = () => import("@/sections/KiaraStudioLabsPage").then(m => ({ default: m.KiaraStudioLabsPage }));
const importInstallExt = () => import("@/sections/InstallExtensionPage").then(m => ({ default: m.InstallExtensionPage }));

const LazyLibrary = lazy(importLibrary);
const LazyUploads = lazy(importUploads);
const LazySettings = lazy(importSettings);
const LazyBilling = lazy(importBilling);
const LazyInvoices = lazy(importInvoices);
const LazySocial = lazy(importSocial);
const LazyVideoEditor = lazy(importVideoEditor);
const LazyVideos = lazy(importVideos);
const LazyStudioLabs = lazy(importStudioLabs);
const LazyInstallExt = lazy(importInstallExt);

// Prefetch all lazy chunks after the app loads — pages will be instant
if (typeof window !== "undefined") {
  const prefetchAll = () => {
    importLibrary();
    importUploads();
    importSettings();
    importBilling();
    importInvoices();
    importSocial();
    importVideoEditor();
    importVideos();
    importStudioLabs();
    importInstallExt();
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetchAll, { timeout: 5000 });
  } else {
    setTimeout(prefetchAll, 3000);
  }
}

// Dark-themed loading — matches UI, no white flash
const RouteLoading = () => (
  <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
    <div className="flex flex-col items-center gap-3">
      <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  </div>
);

const AppFrame = () => {
  const location = useLocation();
  const hideHeaderRoutes = new Set([
    "/models",
    "/create",
    "/images",
    "/kiara-studio",
    "/kiara-studio-labs",
    "/influencers",
  ]);
  const hideHeader = hideHeaderRoutes.has(location.pathname);

  return (
    <div className="box-border caret-transparent flex flex-col min-h-[1000px]">
      <div className="box-border caret-transparent flex flex-col grow">
        {!hideHeader && (
          <div className="box-border caret-transparent z-50">
            <Header />
          </div>
        )}
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

const AppRoutes = () => {
  const { loading: authLoading } = useAuth();

  // Don't block rendering for auth - ProtectedRoute handles it per-route
  // This prevents the global loading spinner on every navigation
  
  return (
    <Routes>
      {/* Public routes - eager loaded for instant access */}
      <Route path="/" element={<LandingApp />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/install-extension" element={
        <Suspense fallback={<RouteLoading />}>
          <LazyInstallExt />
        </Suspense>
      } />

      {/* Protected routes - eager loaded for authenticated users */}
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <AssistantPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/video-editor"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoading />}>
              <LazyVideoEditor />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kiara-studio-labs"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoading />}>
              <LazyStudioLabs />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/videos"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoading />}>
              <LazyVideos />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* AppFrame routes with mixed loading strategies */}
      <Route element={<AppFrame />}>
        {/* Core pages - eager loaded */}
        <Route
          path="/models"
          element={
            <ProtectedRoute>
              <ModelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <ModelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/images"
          element={
            <ProtectedRoute>
              <ModelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kiara-studio"
          element={
            <ProtectedRoute>
              <ModelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/influencers"
          element={
            <ProtectedRoute>
              <InfluencersPage />
            </ProtectedRoute>
          }
        />

        {/* Secondary pages - lazy loaded */}
        <Route
          path="/media"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyLibrary />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/likes"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyLibrary />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/top"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyLibrary />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyLibrary />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/uploads"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyUploads />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyLibrary />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazySettings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/memories"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazySettings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyBilling />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/invoices"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazyInvoices />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/social"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <LazySocial />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<MainContent />} />
      </Route>
    </Routes>
  );
};

export const App = () => {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const blockedDomains: string[] = [];
      if (href.startsWith("http") && blockedDomains.some((d) => href.includes(d))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return (
    <BrowserRouter>
      <div className="text-black text-base not-italic normal-nums font-normal accent-auto bg-black box-border caret-transparent block tracking-[normal] leading-6 list-outside list-disc pointer-events-auto text-start indent-[0px] normal-case visible border-separate font-apple_system relative overflow-hidden">
        {/* God-Tier Starfield Background */}
        <div className="fixed inset-0 overflow-hidden z-0">
          <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }

          @keyframes twinkleFast {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }

          @keyframes twinkleSlow {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.8; }
          }

          .stars-layer-1 {
            background-image:
              radial-gradient(1px 1px at 12% 23%, white, transparent),
              radial-gradient(1px 1px at 67% 45%, white, transparent),
              radial-gradient(1px 1px at 89% 12%, white, transparent),
              radial-gradient(1px 1px at 34% 78%, white, transparent),
              radial-gradient(1px 1px at 56% 89%, white, transparent),
              radial-gradient(1px 1px at 23% 56%, white, transparent),
              radial-gradient(1px 1px at 78% 67%, white, transparent),
              radial-gradient(1px 1px at 45% 34%, white, transparent),
              radial-gradient(1px 1px at 91% 78%, white, transparent),
              radial-gradient(1px 1px at 15% 91%, white, transparent),
              radial-gradient(1px 1px at 72% 25%, white, transparent),
              radial-gradient(1px 1px at 38% 15%, white, transparent),
              radial-gradient(1px 1px at 84% 52%, white, transparent),
              radial-gradient(1px 1px at 29% 63%, white, transparent),
              radial-gradient(1px 1px at 61% 8%, white, transparent),
              radial-gradient(1px 1px at 8% 42%, white, transparent),
              radial-gradient(1px 1px at 93% 35%, white, transparent),
              radial-gradient(1px 1px at 47% 71%, white, transparent),
              radial-gradient(1px 1px at 19% 84%, white, transparent),
              radial-gradient(1px 1px at 76% 93%, white, transparent);
            background-size: 100% 100%;
            animation: twinkle 4s ease-in-out infinite;
            opacity: 0.6;
          }

          .stars-layer-2 {
            background-image:
              radial-gradient(2px 2px at 31% 18%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 73% 61%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 18% 74%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 86% 27%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 44% 49%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 9% 58%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 62% 82%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 95% 73%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 27% 39%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 51% 14%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 83% 88%, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 14% 32%, rgba(255,255,255,0.9), transparent);
            background-size: 100% 100%;
            animation: twinkleFast 3s ease-in-out infinite 0.5s;
            opacity: 0.5;
          }

          .stars-layer-3 {
            background-image:
              radial-gradient(3px 3px at 42% 28%, rgba(200,220,255,0.95), transparent),
              radial-gradient(3px 3px at 81% 53%, rgba(255,240,200,0.95), transparent),
              radial-gradient(3px 3px at 22% 67%, rgba(220,200,255,0.95), transparent),
              radial-gradient(3px 3px at 58% 91%, rgba(255,255,255,0.95), transparent),
              radial-gradient(3px 3px at 7% 19%, rgba(200,240,255,0.95), transparent),
              radial-gradient(3px 3px at 94% 42%, rgba(255,220,200,0.95), transparent),
              radial-gradient(3px 3px at 36% 76%, rgba(240,255,255,0.95), transparent),
              radial-gradient(3px 3px at 69% 6%, rgba(255,200,240,0.95), transparent);
            background-size: 100% 100%;
            animation: twinkleSlow 5s ease-in-out infinite 1s;
            opacity: 0.4;
          }

          /* GPU-accelerate all star layers to prevent blocking page renders */
          .stars-layer-1, .stars-layer-2, .stars-layer-3, .stars-layer-tiny {
            will-change: opacity;
            contain: strict;
            pointer-events: none;
          }

          .stars-layer-tiny {
            background-image:
              radial-gradient(0.5px 0.5px at 25% 35%, white, transparent),
              radial-gradient(0.5px 0.5px at 88% 17%, white, transparent),
              radial-gradient(0.5px 0.5px at 43% 62%, white, transparent),
              radial-gradient(0.5px 0.5px at 11% 81%, white, transparent),
              radial-gradient(0.5px 0.5px at 74% 44%, white, transparent),
              radial-gradient(0.5px 0.5px at 52% 9%, white, transparent),
              radial-gradient(0.5px 0.5px at 6% 51%, white, transparent),
              radial-gradient(0.5px 0.5px at 97% 68%, white, transparent),
              radial-gradient(0.5px 0.5px at 33% 93%, white, transparent),
              radial-gradient(0.5px 0.5px at 79% 21%, white, transparent),
              radial-gradient(0.5px 0.5px at 16% 47%, white, transparent),
              radial-gradient(0.5px 0.5px at 64% 72%, white, transparent),
              radial-gradient(0.5px 0.5px at 91% 39%, white, transparent),
              radial-gradient(0.5px 0.5px at 28% 11%, white, transparent),
              radial-gradient(0.5px 0.5px at 49% 86%, white, transparent),
              radial-gradient(0.5px 0.5px at 3% 64%, white, transparent),
              radial-gradient(0.5px 0.5px at 85% 55%, white, transparent),
              radial-gradient(0.5px 0.5px at 39% 29%, white, transparent),
              radial-gradient(0.5px 0.5px at 71% 97%, white, transparent),
              radial-gradient(0.5px 0.5px at 20% 7%, white, transparent),
              radial-gradient(0.5px 0.5px at 55% 41%, white, transparent),
              radial-gradient(0.5px 0.5px at 98% 83%, white, transparent),
              radial-gradient(0.5px 0.5px at 13% 25%, white, transparent),
              radial-gradient(0.5px 0.5px at 66% 58%, white, transparent),
              radial-gradient(0.5px 0.5px at 87% 15%, white, transparent),
              radial-gradient(0.5px 0.5px at 41% 79%, white, transparent),
              radial-gradient(0.5px 0.5px at 4% 36%, white, transparent),
              radial-gradient(0.5px 0.5px at 76% 92%, white, transparent),
              radial-gradient(0.5px 0.5px at 32% 48%, white, transparent),
              radial-gradient(0.5px 0.5px at 92% 26%, white, transparent);
            background-size: 100% 100%;
            animation: twinkle 6s ease-in-out infinite 2s;
            opacity: 0.3;
          }
        `}</style>

          <div className="stars-layer-tiny absolute inset-0"></div>
          <div className="stars-layer-1 absolute inset-0"></div>
          <div className="stars-layer-2 absolute inset-0"></div>
          <div className="stars-layer-3 absolute inset-0"></div>
        </div>

        <div className="box-border caret-transparent relative z-10">
          <DomAutoTranslator />
          <AppRoutes />
        </div>
        <div className="absolute box-border caret-transparent block"></div>
      </div>
    </BrowserRouter>
  );
};

export default App;
