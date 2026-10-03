import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ViewMode } from '../types';
import {
  LayoutDashboard,
  Boxes,
  MapPin,
  Tag,
  FileText,
  Plus,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Globe,
  ShieldCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    user,
    isAuthenticated,
    isAdmin,
    logout,
    setIsAuthModalOpen,
    setAuthModalMode,
    setIsAddEditItemModalOpen,
    setEditingItem,
    language,
    setLanguage,
    t,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const handleNav = (view: ViewMode) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAddEditItemModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 sm:h-24 md:h-26 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        
        {/* Logo & Brand (Much Bigger Logo) */}
        <div className="flex items-center gap-4 xl:gap-8 shrink-0">
          <button
            onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'landing')}
            className="flex items-center gap-3 text-left focus:outline-none group py-1.5 shrink-0"
          >
            <img
              src="/logo.png"
              alt="Thingor Logo"
              className="h-14 sm:h-16 md:h-20 lg:h-22 max-w-[220px] sm:max-w-[280px] md:max-w-[340px] w-auto object-contain group-hover:scale-105 transition-all shrink-0"
            />
            <span className="text-xs font-medium tracking-wider text-slate-400 hidden 2xl:inline whitespace-nowrap">
              {t('tagline')}
            </span>
          </button>

          {/* Desktop Nav Links (Authenticated) */}
          {isAuthenticated && (
            <nav className="hidden xl:flex items-center gap-2 2xl:gap-3 shrink-0">
              <button
                onClick={() => handleNav('dashboard')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs 2xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  currentView === 'dashboard'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{t('dashboard')}</span>
              </button>

              <button
                onClick={() => handleNav('items')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs 2xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  currentView === 'items'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Boxes className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{t('my_things')}</span>
              </button>

              <button
                onClick={() => handleNav('locations')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs 2xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  currentView === 'locations'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{t('locations')}</span>
              </button>

              <button
                onClick={() => handleNav('categories')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs 2xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  currentView === 'categories'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Tag className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{t('categories')}</span>
              </button>

              <button
                onClick={() => handleNav('documents')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs 2xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  currentView === 'documents'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{t('documents')}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs 2xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    currentView === 'admin'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60 shadow-sm'
                      : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/50'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{t('admin_panel')}</span>
                </button>
              )}
            </nav>
          )}
        </div>

        {/* Right Action buttons - Isolated with shrink-0 and clear gaps */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 shrink-0">
          
          {/* LANGUAGE SELECTOR TOGGLE */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-sm shrink-0 whitespace-nowrap"
              title="Nyelv / Language"
            >
              <Globe className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-bold uppercase tracking-wider">{language}</span>
            </button>

            {isLangDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl z-50 animate-in fade-in"
                onClick={() => setIsLangDropdownOpen(false)}
              >
                <button
                  onClick={() => setLanguage('hu')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                    language === 'hu' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <span>🇭🇺 Magyar</span>
                  {language === 'hu' && <span className="text-[10px]">✓</span>}
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                    language === 'en' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <span>🇬🇧 English</span>
                  {language === 'en' && <span className="text-[10px]">✓</span>}
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <>
              {/* Primary + Add Thing CTA */}
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 whitespace-nowrap"
              >
                <Plus className="h-4 w-4 stroke-[2.5] shrink-0" />
                <span className="hidden sm:inline">{t('add_thing')}</span>
              </button>

              {/* User Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors shrink-0 shadow-sm"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 font-bold text-xs border border-emerald-800/40 shrink-0">
                    {user?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold max-w-[100px] lg:max-w-[140px] truncate">
                    {user?.display_name}
                  </span>
                </button>

                {isUserDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onClick={() => setIsUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-semibold text-white">{user?.display_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => handleNav('dashboard')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                      {t('dashboard')}
                    </button>
                    <button
                      onClick={() => handleNav('items')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                    >
                      <Boxes className="h-3.5 w-3.5 text-slate-400" />
                      {t('my_things')}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleNav('admin')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 rounded-lg transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        {t('admin_panel')}
                      </button>
                    )}
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-lg transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-400" />
                      {t('log_out')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors shrink-0 whitespace-nowrap"
              >
                {t('sign_in')}
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-emerald-950/30 shrink-0 whitespace-nowrap"
              >
                {t('start_organizing')}
              </button>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 focus:outline-none shrink-0 border border-slate-800/80 bg-slate-900/60"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-b border-slate-800 bg-slate-950 px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => handleNav('dashboard')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                  currentView === 'dashboard' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="h-5 w-5" />
                  {t('dashboard')}
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>

              <button
                onClick={() => handleNav('items')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                  currentView === 'items' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Boxes className="h-5 w-5" />
                  {t('my_things')}
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>

              <button
                onClick={() => handleNav('locations')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                  currentView === 'locations' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" />
                  {t('locations')}
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>

              <button
                onClick={() => handleNav('categories')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                  currentView === 'categories' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Tag className="h-5 w-5" />
                  {t('categories')}
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>

              <button
                onClick={() => handleNav('documents')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                  currentView === 'documents' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  {t('documents')}
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold ${
                    currentView === 'admin' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'text-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    {t('admin_panel')}
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleOpenAddModal}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                  {t('add_thing')}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl text-center text-sm font-semibold text-slate-200 bg-slate-900 border border-slate-800"
              >
                {t('sign_in')}
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl text-center text-sm font-semibold text-slate-950 bg-emerald-500"
              >
                {t('start_organizing')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
