import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ItemsView } from './components/ItemsView';
import { LocationsView } from './components/LocationsView';
import { CategoriesView } from './components/CategoriesView';
import { DocumentsView } from './components/DocumentsView';
import { RepairsView } from './components/RepairsView';
import { FinancingView } from './components/FinancingView';
import { HouseholdView } from './components/HouseholdView';
import { NotesView } from './components/NotesView';
import { AdminView } from './components/AdminView';
import { SharedItemView } from './components/SharedItemView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormModal } from './components/ItemFormModal';
import { AuthModal } from './components/AuthModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { LegalViewModal } from './components/LegalViewModal';
import { PendingInviteModal } from './components/PendingInviteModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { QRScannerModal } from './components/QRScannerModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Wrench, ShieldCheck, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    currentView,
    selectedItemId,
    siteSettings,
    isAdmin,
    setIsAuthModalOpen,
    setAuthModalMode,
    activeLegalSlug,
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    isQRScannerOpen,
    setIsQRScannerOpen,
    items,
    setSelectedItemId,
    setCurrentView,
    language,
    isAuthenticated,
  } = useApp();

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentView === 'legal') {
      setIsLegalModalOpen(true);
    }
  }, [currentView]);

  useEffect(() => {
    const parseUrlParameters = () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;

      // 1. Check share token (#share/xyz, ?share=xyz, /share/xyz)
      if (hash.startsWith('#share/')) {
        setShareToken(hash.replace('#share/', '').trim());
        return;
      }
      const queryToken = searchParams.get('share');
      if (queryToken) {
        setShareToken(queryToken);
        return;
      }
      if (pathname.startsWith('/share/')) {
        setShareToken(pathname.replace('/share/', '').trim());
        return;
      }
      setShareToken(null);

      // 2. Check Item ID (#item/xyz, ?item=xyz, /item/xyz)
      let itemId: string | null = null;
      if (hash.startsWith('#item/')) {
        itemId = hash.replace('#item/', '').trim();
      } else if (searchParams.get('item')) {
        itemId = searchParams.get('item');
      } else if (pathname.startsWith('/item/')) {
        itemId = pathname.replace('/item/', '').trim();
      }

      if (itemId) {
        const targetItem = items.find(i => i.id === itemId);
        if (targetItem) {
          setSelectedItemId(itemId);
          setCurrentView('items');
        } else if (isAuthenticated && items.length > 0) {
          setAccessDeniedMessage(
            language === 'hu'
              ? 'Hozzáférés megtagadva: Nincs jogosultságod ennek a tárgynak a megtekintéséhez.'
              : 'Access denied: You do not have permission to view this item.'
          );
        }
      }
    };

    parseUrlParameters();
    window.addEventListener('hashchange', parseUrlParameters);
    return () => window.removeEventListener('hashchange', parseUrlParameters);
  }, [items, isAuthenticated, language]);

  const handleQRScanResult = (resultText: string) => {
    setIsQRScannerOpen(false);
    setAccessDeniedMessage(null);

    if (!resultText) return;

    const text = resultText.trim();

    // If it's a share link
    if (text.includes('#share/') || text.includes('share=')) {
      const token = text.split('#share/')[1] || text.split('share=')[1]?.split('&')[0];
      if (token) {
        window.location.hash = `#share/${token.trim()}`;
        return;
      }
    }

    // If it's an item link or ID
    let scannedItemId = text;
    if (text.includes('#item/')) {
      scannedItemId = text.split('#item/')[1].trim();
    } else if (text.includes('item=')) {
      scannedItemId = text.split('item=')[1].split('&')[0].trim();
    } else if (text.includes('://')) {
      const parts = text.split('/');
      scannedItemId = parts[parts.length - 1].trim();
    }

    if (scannedItemId) {
      window.location.hash = `#item/${scannedItemId}`;
      const targetItem = items.find(i => i.id === scannedItemId);
      if (targetItem) {
        setSelectedItemId(scannedItemId);
        setCurrentView('items');
      } else if (isAuthenticated) {
        setAccessDeniedMessage(
          language === 'hu'
            ? 'Hozzáférés megtagadva: Nincs jogosultságod ennek a tárgynak a megtekintéséhez vagy a tárgy nem létezik.'
            : 'Access denied: You do not have permission to view this item or item does not exist.'
        );
      }
    }
  };

  // 1. GUEST SHARE VIEW ROUTING
  if (shareToken) {
    return <SharedItemView token={shareToken} />;
  }

  // 2. MAINTENANCE MODE SCREEN FOR NON-ADMINS
  if (siteSettings.maintenance_mode && !isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--bg-main,#303943)] text-[var(--text-primary,var(--text-main,#E0E3E6))] flex items-center justify-center p-4 selection:bg-[var(--color-primary-blue,var(--primary-blue,#2563EB))] selection:text-white">
        <div className="max-w-lg w-full bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
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
            <p className="text-[var(--text-secondary,var(--text-sub,#B5BDC6))] text-sm leading-relaxed">
              {siteSettings.maintenance_message || 'A rendszer jelenleg karbantartás alatt áll. Kérjük, látogass vissza később.'}
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--border-color,#56616D)] flex items-center justify-center">
            <button
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-primary,var(--text-main,#E0E3E6))] text-xs font-semibold flex items-center gap-2 transition-colors border border-[var(--border-color,#56616D)]"
            >
              <ShieldCheck className="w-4 h-4 text-[var(--color-primary-blue,var(--primary-blue,#2563EB))]" /> Adminisztrátori Bejelentkezés
            </button>
          </div>
        </div>

        <AuthModal />
      </div>
    );
  }

  // 3. NORMAL VIEW ROUTING
  return (
    <div className="min-h-screen bg-[var(--bg-main,#303943)] text-[var(--text-primary,var(--text-main,#E0E3E6))] flex flex-col font-sans selection:bg-[var(--color-primary-blue,var(--primary-blue,#2563EB))] selection:text-white">
      {/* Top sticky navigation bar */}
      <Navbar />

      {/* Main Container View Routing */}
      {currentView === 'landing' ? (
        <LandingPage />
      ) : (
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          {selectedItemId ? (
            <ItemDetailModal />
          ) : (
            <>
              {currentView === 'dashboard' && <DashboardView />}
              {currentView === 'items' && <ItemsView />}
              {currentView === 'locations' && <LocationsView />}
              {currentView === 'categories' && <CategoriesView />}
              {currentView === 'documents' && <DocumentsView />}
              {currentView === 'repairs' && <RepairsView />}
              {currentView === 'financing' && <FinancingView />}
              {currentView === 'household' && <HouseholdView />}
              {currentView === 'notes' && <NotesView />}
              {currentView === 'admin' && <AdminView />}
            </>
          )}
        </main>
      )}

      {/* Modals & Overlays */}
      <ItemFormModal />
      <AuthModal />
      <SupabaseSetupModal />
      <PendingInviteModal />
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanResult={handleQRScanResult}
      />
      <LegalViewModal
        slug={activeLegalSlug}
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />

      {/* Access Denied Alert Modal */}
      {accessDeniedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg,#3A4551)] border border-rose-500/40 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary,var(--text-main,#E0E3E6))]">
              {language === 'hu' ? 'Hozzáférés Megtagadva' : 'Access Denied'}
            </h3>
            <p className="text-xs text-[var(--text-secondary,var(--text-sub,#B5BDC6))] leading-relaxed">
              {accessDeniedMessage}
            </p>
            <button
              onClick={() => {
                setAccessDeniedMessage(null);
                window.location.hash = '';
              }}
              className="w-full py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-primary,var(--text-main,#E0E3E6)] font-bold text-xs border border-[var(--border-color,#56616D)] transition-colors"
            >
              {language === 'hu' ? 'Rendben' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* PWA Install Banner */}
      <PWAInstallPrompt />
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
