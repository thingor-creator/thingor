import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ItemsView } from './components/ItemsView';
import { LocationsView } from './components/LocationsView';
import { CategoriesView } from './components/CategoriesView';
import { DocumentsView } from './components/DocumentsView';
import { AdminView } from './components/AdminView';
import { SharedItemView } from './components/SharedItemView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormModal } from './components/ItemFormModal';
import { AuthModal } from './components/AuthModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { LegalViewModal } from './components/LegalViewModal';
import { Wrench, ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    currentView,
    siteSettings,
    isAdmin,
    setIsAuthModalOpen,
    setAuthModalMode,
    activeLegalSlug,
  } = useApp();

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  useEffect(() => {
    if (currentView === 'legal') {
      setIsLegalModalOpen(true);
    }
  }, [currentView]);

  useEffect(() => {
    const parseShareToken = () => {
      // Check location hash e.g. #share/xyz
      const hash = window.location.hash;
      if (hash.startsWith('#share/')) {
        const token = hash.replace('#share/', '').trim();
        if (token) {
          setShareToken(token);
          return;
        }
      }

      // Check query string e.g. ?share=xyz
      const searchParams = new URLSearchParams(window.location.search);
      const queryToken = searchParams.get('share');
      if (queryToken) {
        setShareToken(queryToken);
        return;
      }

      // Check pathname e.g. /share/xyz
      const pathname = window.location.pathname;
      if (pathname.startsWith('/share/')) {
        const pathToken = pathname.replace('/share/', '').trim();
        if (pathToken) {
          setShareToken(pathToken);
          return;
        }
      }

      setShareToken(null);
    };

    parseShareToken();
    window.addEventListener('hashchange', parseShareToken);
    return () => window.removeEventListener('hashchange', parseShareToken);
  }, []);

  // 1. GUEST SHARE VIEW ROUTING
  if (shareToken) {
    return <SharedItemView token={shareToken} />;
  }

  // 2. MAINTENANCE MODE SCREEN FOR NON-ADMINS
  if (siteSettings.maintenance_mode && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-slate-950">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Wrench className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Rendszerkarbantartás
            </span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight pt-2">
              A Thingor Jelenleg Karbantartás Alatt Áll
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              {siteSettings.maintenance_message || 'A rendszer jelenleg karbantartás alatt áll. Kérjük, látogass vissza később.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-center">
            <button
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Adminisztrátori Bejelentkezés
            </button>
          </div>
        </div>

        <AuthModal />
      </div>
    );
  }

  // 3. NORMAL VIEW ROUTING
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top sticky navigation bar */}
      <Navbar />

      {/* Main Container View Routing */}
      {currentView === 'landing' ? (
        <LandingPage />
      ) : (
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'items' && <ItemsView />}
          {currentView === 'locations' && <LocationsView />}
          {currentView === 'categories' && <CategoriesView />}
          {currentView === 'documents' && <DocumentsView />}
          {currentView === 'admin' && <AdminView />}
        </main>
      )}

      {/* Modals */}
      <ItemDetailModal />
      <ItemFormModal />
      <AuthModal />
      <SupabaseSetupModal />
      <LegalViewModal
        slug={activeLegalSlug}
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
