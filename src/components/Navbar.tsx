import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { ViewMode } from '../types';
import {
  LayoutDashboard,
  Boxes,
  MapPin,
  Tag,
  FileText,
  Wrench,
  CreditCard,
  Users,
  StickyNote,
  Plus,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Globe,
  ShieldCheck,
  ListChecks,
  Share2,
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
    siteSettings,
  } = useApp();

  const isHu = language === 'hu';

  // Dropdown states for desktop
  const [openDropdown, setOpenDropdown] = useState<'things' | 'tasks' | 'share' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (view: ViewMode) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAddEditItemModalOpen(true);
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  // Active state helpers for grouped menus
  const isThingsActive = currentView === 'items' || currentView === 'locations' || currentView === 'categories';
  const isTasksActive = currentView === 'repairs' || currentView === 'financing';
  const isShareActive = currentView === 'household';

  return (
    <>
      {/* Main Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 xl:gap-6 shrink-0">
            <button
              onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'landing')}
              className="flex items-center gap-3 text-left focus:outline-none group py-1 shrink-0"
            >
              <img
                src={siteSettings.logo_url || '/logo.png'}
                alt={siteSettings.site_name || 'Thingor Logo'}
                className="h-10 sm:h-12 md:h-14 max-w-[180px] sm:max-w-[240px] w-auto object-contain group-hover:scale-105 transition-all shrink-0"
              />
            </button>

            {/* Desktop Hierarchical Navigation (Authenticated) */}
            {isAuthenticated && (
              <nav ref={dropdownRef} className="hidden lg:flex items-center gap-1 xl:gap-2 shrink-0">
                
                {/* 1. Vezérlőpult */}
                <button
                  onClick={() => handleNav('dashboard')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    currentView === 'dashboard'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{t('dashboard')}</span>
                </button>

                {/* 2. Tárgyaim (Grouped Dropdown) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'things' ? null : 'things')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isThingsActive
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Boxes className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{t('my_things')}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === 'things' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'things' && (
                    <div className="absolute left-0 mt-2 w-48 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => handleNav('items')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'items' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <Boxes className="h-4 w-4 text-emerald-400" />
                        <span>{isHu ? 'Összes tárgy' : 'All items'}</span>
                      </button>
                      <button
                        onClick={() => handleNav('locations')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'locations' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <MapPin className="h-4 w-4 text-emerald-400" />
                        <span>{t('locations')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('categories')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'categories' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <Tag className="h-4 w-4 text-emerald-400" />
                        <span>{t('categories')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Dokumentumok */}
                <button
                  onClick={() => handleNav('documents')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    currentView === 'documents'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{t('documents')}</span>
                </button>

                {/* 4. Teendők (Grouped Dropdown) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'tasks' ? null : 'tasks')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isTasksActive
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <ListChecks className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{isHu ? 'Teendők' : 'Tasks'}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === 'tasks' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'tasks' && (
                    <div className="absolute left-0 mt-2 w-48 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => handleNav('repairs')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'repairs' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <Wrench className="h-4 w-4 text-amber-400" />
                        <span>{t('repairs')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('financing')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'financing' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 text-indigo-400" />
                        <span>{t('financing')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Megosztás (Grouped Dropdown) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'share' ? null : 'share')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isShareActive
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Share2 className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{isHu ? 'Megosztás' : 'Sharing'}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === 'share' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'share' && (
                    <div className="absolute left-0 mt-2 w-48 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => handleNav('household')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'household' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <Users className="h-4 w-4 text-emerald-400" />
                        <span>{t('household')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Jegyzetek */}
                <button
                  onClick={() => handleNav('notes')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    currentView === 'notes'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <StickyNote className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{t('quick_notes')}</span>
                </button>

                {/* 7. Adminisztráció (Visually Separated for Admins) */}
                {isAdmin && (
                  <button
                    onClick={() => handleNav('admin')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 border border-emerald-500/30 ${
                      currentView === 'admin'
                        ? 'bg-emerald-950 text-emerald-300 shadow-sm'
                        : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>Admin</span>
                  </button>
                )}
              </nav>
            )}
          </div>

          {/* Right Action controls */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* Quick Add Button (Desktop) */}
            {isAuthenticated && (
              <button
                onClick={handleOpenAddModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/30 transition-all shrink-0"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>{t('add_thing')}</span>
              </button>
            )}

            {/* Language Selector */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              >
                <Globe className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold uppercase">{language}</span>
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
              /* User Profile Dropdown */
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 font-bold text-xs border border-emerald-800/40 shrink-0">
                    {user?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate">
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
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors shrink-0 whitespace-nowrap"
                >
                  {t('sign_in')}
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shrink-0 whitespace-nowrap"
                >
                  {t('start_organizing')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Logged In Users) */}
      {isAuthenticated && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-2xl">
          {/* 1. Vezérlőpult */}
          <button
            onClick={() => handleNav('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px]">{isHu ? 'Vezérlőpult' : 'Dashboard'}</span>
          </button>

          {/* 2. Tárgyaim */}
          <button
            onClick={() => handleNav('items')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === 'items' || currentView === 'locations' || currentView === 'categories'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="h-5 w-5" />
            <span className="text-[10px]">{isHu ? 'Tárgyaim' : 'Items'}</span>
          </button>

          {/* 3. Teendők */}
          <button
            onClick={() => handleNav('repairs')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === 'repairs' || currentView === 'financing'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListChecks className="h-5 w-5" />
            <span className="text-[10px]">{isHu ? 'Teendők' : 'Tasks'}</span>
          </button>

          {/* 4. Jegyzetek */}
          <button
            onClick={() => handleNav('notes')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === 'notes' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <StickyNote className="h-5 w-5" />
            <span className="text-[10px]">{isHu ? 'Jegyzetek' : 'Notes'}</span>
          </button>

          {/* 5. Menü (Drawer toggle) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              isMobileMenuOpen ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px]">{isHu ? 'Menü' : 'Menu'}</span>
          </button>
        </nav>
      )}

      {/* MOBILE DRAWER MENU MODAL */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Menu className="h-5 w-5 text-emerald-400" />
                {isHu ? 'Összes Menüpont' : 'Navigation Menu'}
              </h3>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {isAuthenticated ? (
              <div className="space-y-1 text-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-1">
                  {isHu ? 'Tárgykezelés' : 'Item Management'}
                </p>

                <button
                  onClick={() => handleNav('items')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'items' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Boxes className="h-5 w-5 text-emerald-400" />
                  <span>{isHu ? 'Összes tárgy' : 'All items'}</span>
                </button>

                <button
                  onClick={() => handleNav('locations')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'locations' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <MapPin className="h-5 w-5 text-emerald-400" />
                  <span>{t('locations')}</span>
                </button>

                <button
                  onClick={() => handleNav('categories')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'categories' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Tag className="h-5 w-5 text-emerald-400" />
                  <span>{t('categories')}</span>
                </button>

                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-3">
                  {isHu ? 'Dokumentumok & Feladatok' : 'Documents & Tasks'}
                </p>

                <button
                  onClick={() => handleNav('documents')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'documents' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span>{t('documents')}</span>
                </button>

                <button
                  onClick={() => handleNav('repairs')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'repairs' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Wrench className="h-5 w-5 text-amber-400" />
                  <span>{t('repairs')}</span>
                </button>

                <button
                  onClick={() => handleNav('financing')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'financing' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-indigo-400" />
                  <span>{t('financing')}</span>
                </button>

                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-3">
                  {isHu ? 'Megosztás & Jegyzetek' : 'Sharing & Notes'}
                </p>

                <button
                  onClick={() => handleNav('household')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'household' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="h-5 w-5 text-emerald-400" />
                  <span>{t('household')}</span>
                </button>

                <button
                  onClick={() => handleNav('notes')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${
                    currentView === 'notes' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <StickyNote className="h-5 w-5 text-amber-400" />
                  <span>{t('quick_notes')}</span>
                </button>

                {isAdmin && (
                  <>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-3">
                      Adminisztráció
                    </p>
                    <button
                      onClick={() => handleNav('admin')}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${
                        currentView === 'admin' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'text-emerald-400 hover:bg-slate-800/50'
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      <span>{t('admin_panel')}</span>
                    </button>
                  </>
                )}

                <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={handleOpenAddModal}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                    {t('add_thing')}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-950/40 text-red-400 font-semibold text-sm border border-red-900/40"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('log_out')}
                  </button>
                </div>
              </div>
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
        </div>
      )}
    </>
  );
};
