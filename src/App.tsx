import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ItemsView } from './components/ItemsView';
import { LocationsView } from './components/LocationsView';
import { CategoriesView } from './components/CategoriesView';
import { DocumentsView } from './components/DocumentsView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormModal } from './components/ItemFormModal';
import { AuthModal } from './components/AuthModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';

const AppContent: React.FC = () => {
  const { currentView } = useApp();

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
        </main>
      )}

      {/* Modals */}
      <ItemDetailModal />
      <ItemFormModal />
      <AuthModal />
      <SupabaseSetupModal />
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
