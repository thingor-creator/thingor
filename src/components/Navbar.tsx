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
  ShieldCheck,
  Bell,
  QrCode,
  Layers,
  Handshake,
  Library,
  ShoppingBag,
  Lock,
  Settings,
  Package,
  ShoppingCart,
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
    setIsLocationModalOpen,
    setIsCategoryModalOpen,
    setEditingItem,
    language,
    t,
    siteSettings,
    unreadNotificationCount,
    setIsNotificationModalOpen,
    setIsQRScannerOpen,
    userPreferences,
  } = useApp();

  const isHu = language === 'hu';

  // Dropdown states for desktop
  const [openDropdown, setOpenDropdown] = useState<'things' | 'modules' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

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

  const [currentHash, setCurrentHash] = useState(typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    const handleHash = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleNav = (view: ViewMode) => {
    if (window.location.hash.includes('storage')) {
      window.location.hash = '';
    }
    setCurrentHash('');
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    setOpenDropdown(null);
  };

  const handleOpenAddModal = () => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);

    // Context-aware action dispatch based on current view
    if (currentView === 'locations') {
      setIsLocationModalOpen(true);
      return;
    }

    if (currentView === 'categories') {
      setIsCategoryModalOpen(true);
      return;
    }

    if (
      currentView === 'pantry' ||
      currentView === 'notes' ||
      currentView === 'repairs' ||
      currentView === 'financing' ||
      currentView === 'lending' ||
      currentView === 'collections' ||
      currentView === 'vault'
    ) {
      window.dispatchEvent(new CustomEvent('thingor-open-add', { detail: { view: currentView } }));
      return;
    }

    // Default for items, dashboard and other views: Open Add Thing modal
    setEditingItem(null);
    setIsAddEditItemModalOpen(true);
  };

  const getAddButtonTitle = () => {
    switch (currentView) {
      case 'locations': return isHu ? 'Új helyszín' : 'Add Location';
      case 'categories': return isHu ? 'Új kategória' : 'Add Category';
      case 'pantry': return isHu ? 'Új készletcikk' : 'Add Pantry Item';
      case 'notes': return isHu ? 'Új gyorsjegyzet' : 'Add Quick Note';
      case 'repairs': return isHu ? 'Új javítási napló' : 'Add Repair Record';
      case 'financing': return isHu ? 'Új részletfizetés' : 'Add Financing';
      case 'lending': return isHu ? 'Új kölcsönadás' : 'Add Loan';
      case 'collections': return isHu ? 'Új gyűjtemény / tétel' : 'Add Collection / Item';
      case 'vault': return isHu ? 'Tárgy a széfbe' : 'Add to Vault';
      default: return t('add_thing');
    }
  };

  // Active state helpers for grouped menus
  const isStorageActive = currentHash === '#storage' || currentHash.startsWith('#storage/');
  const isThingsActive = isStorageActive || currentView === 'items' || currentView === 'locations' || currentView === 'categories';
  const isModulesActive = !isStorageActive && (currentView === 'repairs' || currentView === 'financing' || currentView === 'household' || currentView === 'lending' || currentView === 'collections' || currentView === 'pantry' || currentView === 'vault');

  const renderBottomNavButton = (slotOptionId: string, slotPosition: string) => {
    switch (slotOptionId) {
      case 'dashboard':
        return (
          <button
            key={`slot-${slotPosition}-dashboard`}
            onClick={() => handleNav('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'dashboard'
                ? 'text-[var(--color-primary-blue,#2563EB)] font-bold'
                : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Vezérlőpult' : 'Dashboard'}</span>
          </button>
        );

      case 'documents':
        return (
          <button
            key={`slot-${slotPosition}-documents`}
            onClick={() => handleNav('documents')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'documents'
                ? 'text-[var(--color-primary-blue,#2563EB)] font-bold'
                : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <FileText className="h-5 w-5 shrink-0 text-cyan-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Dokumentumok' : 'Documents'}</span>
          </button>
        );

      case 'items':
        return (
          <button
            key={`slot-${slotPosition}-items`}
            onClick={() => handleNav('items')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && (currentView === 'items' || currentView === 'locations' || currentView === 'categories')
                ? 'text-[var(--color-primary-blue,#2563EB)] font-bold'
                : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <Boxes className="h-5 w-5 shrink-0" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Tárgyaim' : 'Items'}</span>
          </button>
        );

      case 'storage':
        return (
          <button
            key={`slot-${slotPosition}-storage`}
            onClick={() => {
              window.location.hash = '#storage';
              setCurrentHash('#storage');
              setIsMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              isStorageActive ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
            title={isHu ? 'Fizikai tárolók és raktározás' : 'Storage'}
          >
            <Package className="h-5 w-5 shrink-0" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Tárolók' : 'Storage'}</span>
          </button>
        );

      case 'household':
        return (
          <button
            key={`slot-${slotPosition}-household`}
            onClick={() => handleNav('household')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'household' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <Users className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Család' : 'Household'}</span>
          </button>
        );

      case 'repairs':
        return (
          <button
            key={`slot-${slotPosition}-repairs`}
            onClick={() => handleNav('repairs')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'repairs' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <Wrench className="h-5 w-5 shrink-0 text-amber-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Javítások' : 'Repairs'}</span>
          </button>
        );

      case 'financing':
        return (
          <button
            key={`slot-${slotPosition}-financing`}
            onClick={() => handleNav('financing')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'financing' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <CreditCard className="h-5 w-5 shrink-0 text-indigo-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Pénzügy' : 'Finance'}</span>
          </button>
        );

      case 'lending':
        return (
          <button
            key={`slot-${slotPosition}-lending`}
            onClick={() => handleNav('lending')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'lending' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <Handshake className="h-5 w-5 shrink-0 text-cyan-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Kölcsön' : 'Lending'}</span>
          </button>
        );

      case 'collections':
        return (
          <button
            key={`slot-${slotPosition}-collections`}
            onClick={() => handleNav('collections')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'collections' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <Layers className="h-5 w-5 shrink-0 text-purple-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Gyűjtemény' : 'Collections'}</span>
          </button>
        );

      case 'pantry':
        return (
          <button
            key={`slot-${slotPosition}-pantry`}
            onClick={() => handleNav('pantry')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'pantry' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <ShoppingBag className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Spájz' : 'Pantry'}</span>
          </button>
        );

      case 'vault':
        return (
          <button
            key={`slot-${slotPosition}-vault`}
            onClick={() => handleNav('vault')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'vault' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <Lock className="h-5 w-5 shrink-0 text-amber-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Széf' : 'Vault'}</span>
          </button>
        );

      case 'notes':
        return (
          <button
            key={`slot-${slotPosition}-notes`}
            onClick={() => handleNav('notes')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'notes' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <StickyNote className="h-5 w-5 shrink-0 text-[var(--status-warning,#F59E0B)]" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Jegyzetek' : 'Notes'}</span>
          </button>
        );

      case 'shopping_list':
        return (
          <button
            key={`slot-${slotPosition}-shopping-list`}
            onClick={() => {
              handleNav('pantry');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('thingor-open-shopping-list'));
              }, 100);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && currentView === 'pantry' ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <ShoppingCart className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Bevásárlás' : 'Shopping'}</span>
          </button>
        );

      default:
        return (
          <button
            key={`slot-${slotPosition}-default`}
            onClick={() => handleNav('items')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition flex-1 min-w-0 ${
              !isStorageActive && (currentView === 'items' || currentView === 'locations' || currentView === 'categories')
                ? 'text-[var(--color-primary-blue,#2563EB)] font-bold'
                : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white'
            }`}
          >
            <Boxes className="h-5 w-5 shrink-0" />
            <span className="text-[10px] truncate max-w-full">{isHu ? 'Tárgyaim' : 'Items'}</span>
          </button>
        );
    }
  };

  return (
    <>
      {/* Main Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color,#56616D)] bg-[var(--bg-main,#303943)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
          
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-4 xl:gap-6 shrink-0">
              <button
                onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'landing')}
                className="flex items-center gap-2 text-left focus:outline-none group py-1 shrink-0"
              >
                <img
                  src={siteSettings.logo_url || '/logo.png'}
                  alt={siteSettings.site_name || 'Thingor Logo'}
                  className="h-8 sm:h-9 md:h-10 max-w-[120px] xs:max-w-[150px] sm:max-w-[200px] w-auto object-contain group-hover:opacity-90 transition-opacity shrink-0"
                />
              </button>

            {/* Desktop Hierarchical Navigation (Authenticated) */}
            {isAuthenticated && (
              <nav ref={dropdownRef} className="hidden lg:flex items-center gap-1 xl:gap-2 shrink-0">
                
                {/* 1. Vezérlőpult */}
                <button
                  onClick={() => handleNav('dashboard')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${
                    !isStorageActive && currentView === 'dashboard'
                      ? 'bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] border-[var(--border-color,#56616D)] shadow-sm'
                      : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-[var(--text-primary,var(--text-main,#E0E3E6))] hover:bg-[var(--surface-bg,#465362)]/50 border-transparent'
                  }`}
                >
                  <LayoutDashboard className={`h-4 w-4 shrink-0 ${!isStorageActive && currentView === 'dashboard' ? 'text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))]'}`} />
                  <span>{t('dashboard')}</span>
                </button>

                {/* 2. Tárgyaim (Grouped Dropdown) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'things' ? null : 'things')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${
                      isThingsActive
                        ? 'bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] border-[var(--border-color,#56616D)] shadow-sm'
                        : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-[var(--text-primary,var(--text-main,#E0E3E6))] hover:bg-[var(--surface-bg,#465362)]/50 border-transparent'
                    }`}
                  >
                    <Boxes className={`h-4 w-4 shrink-0 ${isThingsActive ? 'text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))]'}`} />
                    <span>{t('my_things')}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === 'things' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'things' && (
                    <div className="absolute left-0 mt-2 w-52 rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => handleNav('items')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          !isStorageActive && currentView === 'items' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Boxes className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
                        <span>{isHu ? 'Összes tárgy' : 'All items'}</span>
                      </button>
                      <button
                        onClick={() => handleNav('locations')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          !isStorageActive && currentView === 'locations' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <MapPin className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
                        <span>{t('locations')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('categories')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          !isStorageActive && currentView === 'categories' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Tag className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
                        <span>{t('categories')}</span>
                      </button>
                      <button
                        onClick={() => {
                          window.location.hash = '#storage';
                          setCurrentHash('#storage');
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isStorageActive ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Package className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
                        <span>{isHu ? 'Fizikai tárolók' : 'Physical storage'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Dokumentumok */}
                <button
                  onClick={() => handleNav('documents')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${
                    !isStorageActive && currentView === 'documents'
                      ? 'bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] border-[var(--border-color,#56616D)] shadow-sm'
                      : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-[var(--text-primary,var(--text-main,#E0E3E6))] hover:bg-[var(--surface-bg,#465362)]/50 border-transparent'
                  }`}
                >
                  <FileText className={`h-4 w-4 shrink-0 ${!isStorageActive && currentView === 'documents' ? 'text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))]'}`} />
                  <span>{t('documents')}</span>
                </button>

                {/* 4. Modulok & Teendők (Bővíthető Csoportosított Dropdown) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'modules' ? null : 'modules')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${
                      isModulesActive
                        ? 'bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] border-[var(--border-color,#56616D)] shadow-sm'
                        : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-[var(--text-primary,var(--text-main,#E0E3E6))] hover:bg-[var(--surface-bg,#465362)]/50 border-transparent'
                    }`}
                  >
                    <Layers className={`h-4 w-4 shrink-0 ${isModulesActive ? 'text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))]'}`} />
                    <span>{isHu ? 'Modulok' : 'Modules'}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === 'modules' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'modules' && (
                    <div className="absolute left-0 mt-2 w-56 rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                      <button
                        onClick={() => handleNav('household')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'household' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Users className="h-4 w-4 text-[var(--status-success,#34D399)] shrink-0" />
                        <span>{isHu ? 'Családi megosztás' : 'Household Sharing'}</span>
                      </button>
                      <button
                        onClick={() => handleNav('repairs')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'repairs' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Wrench className="h-4 w-4 text-[var(--status-warning,#F59E0B)] shrink-0" />
                        <span>{t('repairs')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('financing')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'financing' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 text-[var(--cat-books,#818CF8)] shrink-0" />
                        <span>{t('financing')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('lending')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'lending' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Handshake className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                        <span>{t('lending')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('collections')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'collections' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Library className="h-4 w-4 text-[var(--cat-books,#818CF8)] shrink-0" />
                        <span>{t('collections')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('pantry')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'pantry' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <ShoppingBag className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{t('pantry')}</span>
                      </button>
                      <button
                        onClick={() => handleNav('vault')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentView === 'vault' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/60 hover:text-[var(--text-primary,var(--text-main,#E0E3E6))]'
                        }`}
                      >
                        <Lock className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>{isHu ? 'Széf & Védett tárgyak' : 'Vault & Secure Storage'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Jegyzetek */}
                <button
                  onClick={() => handleNav('notes')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${
                    currentView === 'notes'
                      ? 'bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] border-[var(--border-color,#56616D)] shadow-sm'
                      : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-[var(--text-primary,var(--text-main,#E0E3E6))] hover:bg-[var(--surface-bg,#465362)]/50 border-transparent'
                  }`}
                >
                  <StickyNote className={`h-4 w-4 shrink-0 ${currentView === 'notes' ? 'text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--status-warning,#F59E0B)]'}`} />
                  <span>{t('quick_notes')}</span>
                </button>

                {/* 7. Adminisztráció (Visually Separated for Admins) */}
                {isAdmin && (
                  <button
                    onClick={() => handleNav('admin')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${
                      currentView === 'admin'
                        ? 'bg-[var(--color-primary-blue,#2563EB)] text-white border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] border-[var(--border-color,#56616D)] hover:bg-[var(--surface-bg,#465362)]'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Admin</span>
                  </button>
                )}
              </nav>
            )}
          </div>

          {/* Right Action controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* Notification Bell Icon & QR Scanner (Authenticated) */}
            {isAuthenticated && (
              <>
                <button
                  onClick={() => setIsQRScannerOpen(true)}
                  className="flex items-center justify-center p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors shrink-0"
                  title={isHu ? 'QR Kód Beolvasása' : 'Scan QR Code'}
                >
                  <QrCode className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                </button>
                <button
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="relative flex items-center justify-center p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors shrink-0"
                  title={isHu ? 'Értesítések' : 'Notifications'}
                >
                  <Bell className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full bg-[var(--color-primary-blue,#2563EB)] text-[10px] font-bold text-white border border-[var(--card-bg,#3A4551)] animate-pulse px-1">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {isAuthenticated ? (
              /* User Profile Dropdown */
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] text-[var(--text-primary,var(--text-main,#E0E3E6))] hover:bg-[var(--surface-bg,#465362)] transition-colors shrink-0"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary-blue,#2563EB)]/20 text-[var(--color-primary-blue,#2563EB)] font-bold text-xs border border-[var(--color-primary-blue,#2563EB)]/30 shrink-0">
                    {user?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate">
                    {user?.display_name}
                  </span>
                </button>

                {isUserDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onClick={() => setIsUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-[var(--border-color,#56616D)] mb-1">
                      <p className="text-xs font-semibold text-white">{user?.display_name}</p>
                      <p className="text-[11px] text-[var(--text-secondary,var(--text-sub,#B5BDC6))] truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => handleNav('dashboard')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)] hover:text-white rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-[var(--text-secondary,var(--text-sub,#B5BDC6))]" />
                      {t('dashboard')}
                    </button>
                    <button
                      onClick={() => handleNav('items')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)] hover:text-white rounded-lg transition-colors"
                    >
                      <Boxes className="h-3.5 w-3.5 text-[var(--text-secondary,var(--text-sub,#B5BDC6))]" />
                      {t('my_things')}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleNav('admin')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--surface-bg,#465362)] rounded-lg transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary-blue,#2563EB)]" />
                        {t('admin_panel')}
                      </button>
                    )}
                    <button
                      onClick={() => handleNav('settings')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        currentView === 'settings'
                          ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-semibold'
                          : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)] hover:text-white'
                      }`}
                    >
                      <Settings className={`h-3.5 w-3.5 ${currentView === 'settings' ? 'text-[var(--color-primary-blue,#2563EB)]' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))]'}`} />
                      {language === 'hu' ? 'Beállítások' : 'Settings'}
                    </button>
                    <div className="my-1 border-t border-[var(--border-color,#56616D)]" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-lg transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 text-rose-400" />
                      {t('log_out')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="h-9 px-3 text-xs sm:text-sm font-medium text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white transition-colors shrink-0 whitespace-nowrap flex items-center"
                >
                  {t('sign_in')}
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="h-9 px-3.5 sm:px-4 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md shrink-0 whitespace-nowrap flex items-center justify-center"
                >
                  {t('start_organizing')}
                </button>
              </div>
            )}

            {/* Mobile Sandwich / Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex lg:hidden items-center justify-center p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors shrink-0"
              aria-label={isMobileMenuOpen ? (isHu ? 'Menü bezárása' : 'Close menu') : (isHu ? 'Menü megnyitása' : 'Open menu')}
              title={isHu ? 'Menü' : 'Menu'}
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
              ) : (
                <Menu className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Logged In Users) */}
      {isAuthenticated && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-main,#303943)]/95 border-t border-[var(--border-color,#56616D)] backdrop-blur-md px-2 py-1 flex items-center justify-around shadow-2xl">
          {/* 1. Gomb (Slot 1) */}
          {renderBottomNavButton(userPreferences?.mobile_bottom_bar_slot1 || 'items', 'slot1')}

          {/* 2. Gomb (Slot 2) */}
          {renderBottomNavButton(userPreferences?.mobile_bottom_bar_slot2 || userPreferences?.mobile_bottom_bar_left || 'storage', 'slot2')}

          {/* Központi Kiemelt Új Tárgy Hozzáadás Gomb (FAB) */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center -mt-4 h-12 w-12 rounded-full bg-[var(--color-primary-blue,#2563EB)] text-white shadow-lg shadow-blue-500/40 hover:bg-blue-600 active:scale-95 transition-all shrink-0 border-2 border-[var(--bg-main,#303943)]"
            title={getAddButtonTitle()}
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* 3. Gomb (Slot 3) */}
          {renderBottomNavButton(userPreferences?.mobile_bottom_bar_slot3 || userPreferences?.mobile_bottom_bar_right || 'pantry', 'slot3')}

          {/* 4. Gomb (Slot 4) */}
          {renderBottomNavButton(userPreferences?.mobile_bottom_bar_slot4 || 'household', 'slot4')}
        </nav>
      )}

      {/* MOBILE DRAWER MENU MODAL */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg,#3A4551)] border-t border-[var(--border-color,#56616D)] rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl text-[var(--text-primary,var(--text-main,#E0E3E6))]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color,#56616D)]">
              <h3 className="font-bold text-[var(--text-primary,var(--text-main,#E0E3E6))] text-base flex items-center gap-2">
                <Menu className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
                {isHu ? 'Thingor Navigáció' : 'Navigation Menu'}
              </h3>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {isAuthenticated ? (
              <div className="space-y-4 text-sm">
                {/* 1. Leltár & Áttekintés */}
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-secondary,var(--text-sub,#B5BDC6))] uppercase tracking-wider px-1 pb-1.5">
                    {isHu ? 'Leltár & Áttekintés' : 'Inventory & Overview'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleNav('dashboard')}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'dashboard' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <LayoutDashboard className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{t('dashboard')}</span>
                    </button>
                    <button
                      onClick={() => handleNav('items')}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'items' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Boxes className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{isHu ? 'Összes tárgy' : 'All items'}</span>
                    </button>
                    <button
                      onClick={() => handleNav('locations')}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'locations' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{t('locations')}</span>
                    </button>
                    <button
                      onClick={() => handleNav('categories')}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'categories' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Tag className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{t('categories')}</span>
                    </button>
                    <button
                      onClick={() => handleNav('documents')}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'documents' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <FileText className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{t('documents')}</span>
                    </button>
                    <button
                      onClick={() => {
                        window.location.hash = '#storage';
                        setCurrentHash('#storage');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        isStorageActive ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Package className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{isHu ? 'Tárolók és raktározás' : 'Storage'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Modulok & Teendők */}
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-secondary,var(--text-sub,#B5BDC6))] uppercase tracking-wider px-1 pb-1.5">
                    {isHu ? 'Modulok & Család' : 'Modules & Family'}
                  </p>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleNav('household')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'household' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Users className="h-4 w-4 text-[var(--status-success,#34D399)] shrink-0" />
                      <span>{isHu ? 'Családi megosztás' : 'Household Sharing'}</span>
                    </button>

                    <button
                      onClick={() => handleNav('repairs')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'repairs' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Wrench className="h-4 w-4 text-[var(--status-warning,#F59E0B)] shrink-0" />
                      <span>{t('repairs')}</span>
                    </button>

                    <button
                      onClick={() => handleNav('financing')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'financing' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 text-[var(--cat-books,#818CF8)] shrink-0" />
                      <span>{t('financing')}</span>
                    </button>

                    <button
                      onClick={() => handleNav('lending')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'lending' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Handshake className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{t('lending')}</span>
                    </button>

                    <button
                      onClick={() => handleNav('collections')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'collections' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Library className="h-4 w-4 text-[var(--cat-books,#818CF8)] shrink-0" />
                      <span>{t('collections')}</span>
                    </button>

                    <button
                      onClick={() => handleNav('pantry')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'pantry' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <ShoppingBag className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{t('pantry')}</span>
                    </button>

                    <button
                      onClick={() => handleNav('vault')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'vault' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <Lock className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>{isHu ? 'Széf & Védett tárgyak' : 'Vault & Secure Storage'}</span>
                    </button>

                    <button
                      onClick={() => handleNav('notes')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                        currentView === 'notes' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <StickyNote className="h-4 w-4 text-[var(--status-warning,#F59E0B)] shrink-0" />
                      <span>{t('quick_notes')}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Adminisztráció (Ha admin) */}
                {isAdmin && (
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-secondary,var(--text-sub,#B5BDC6))] uppercase tracking-wider px-1 pb-1.5">
                      {isHu ? 'Rendszerfelügyelet' : 'System Administration'}
                    </p>
                    <button
                      onClick={() => handleNav('admin')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-bold text-xs transition-colors ${
                        currentView === 'admin' ? 'bg-[var(--color-primary-blue,#2563EB)] text-white' : 'text-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--surface-bg,#465362)]/50'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{t('admin_panel')}</span>
                    </button>
                  </div>
                )}

                {/* Akciógombok */}
                <div className="pt-3 border-t border-[var(--border-color,#56616D)] flex flex-col gap-2">
                  <button
                    onClick={() => handleNav('settings')}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl font-medium text-xs transition-colors ${
                      currentView === 'settings' ? 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] font-bold' : 'text-[var(--text-secondary,var(--text-sub,#B5BDC6))] hover:bg-[var(--surface-bg,#465362)]/50'
                    }`}
                  >
                    <Settings className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                    <span>{language === 'hu' ? 'Beállítások' : 'Settings'}</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-950/40 text-rose-400 font-semibold text-xs border border-rose-900/40 hover:bg-rose-950/60 transition-colors"
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
                  className="w-full p-3 rounded-xl text-center text-sm font-semibold text-[var(--text-primary,var(--text-main,#E0E3E6))] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]"
                >
                  {t('sign_in')}
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-3 rounded-xl text-center text-sm font-semibold text-white bg-[var(--color-primary-blue,#2563EB)]"
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
