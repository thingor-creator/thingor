import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes,
  Euro,
  Plus,
  ArrowRight,
  ShieldCheck,
  Tag,
  ChevronRight,
  AlertTriangle,
  Wrench,
  CreditCard,
} from 'lucide-react';
import { ItemCard } from './ItemCard';

export const DashboardView: React.FC = () => {
  const {
    items,
    categories,
    repairs,
    financings,
    setCurrentView,
    setIsAddEditItemModalOpen,
    setEditingItem,
    setSelectedItemId,
    getLocationPath,
    getCategoryName,
    t,
    language,
  } = useApp();

  // Metrics calculation
  const totalItems = items.length;
  
  const totalValue = items.reduce((sum, item) => {
    return sum + (item.current_value ?? item.purchase_price ?? 0);
  }, 0);

  // New module metrics
  const totalMonthlyInstallment = financings.reduce((sum, f) => f.remaining_installments > 0 ? sum + f.monthly_installment : sum, 0);
  const pendingRepairsCount = repairs.filter(r => r.status === 'pending' || r.status === 'in_progress').length;

  // Calculate active warranties
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const activeWarranties = items.filter(item => {
    if (!item.warranty_end) return false;
    const expDate = new Date(item.warranty_end);
    return expDate >= now;
  });

  const handleOpenAddThing = () => {
    setEditingItem(null);
    setIsAddEditItemModalOpen(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: language === 'hu' ? 'HUF' : 'EUR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('dashboard')}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {language === 'hu'
            ? 'Személyes és családi vagyontárgyaid, javítások és részletfizetések áttekintése.'
            : 'Overview of personal & household assets, maintenance tasks, and financing plans.'}
        </p>
      </div>

      {/* DASHBOARD CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Total Items */}
        <div 
          onClick={() => setCurrentView('items')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('total_items')}</span>
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white tracking-tight">{totalItems}</span>
            <span className="text-xs text-slate-400 ml-2">{t('items_logged')}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
            {language === 'hu' ? 'Összes tárgy megtekintése' : 'View all items'} <ChevronRight className="h-3.5 w-3.5" />
          </p>
        </div>

        {/* Card 2: Total Value */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('total_value')}</span>
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400">
              <Euro className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(totalValue)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">{language === 'hu' ? 'Összesített becsült leltári érték' : 'Combined estimated valuation'}</p>
        </div>

        {/* Card 3: Monthly Installments */}
        <div 
          onClick={() => setCurrentView('financing')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'hu' ? 'Havi részletek' : 'Monthly Installments'}</span>
            <div className="p-2.5 rounded-xl bg-indigo-950 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-indigo-300 tracking-tight">{formatCurrency(totalMonthlyInstallment)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
            {language === 'hu' ? 'Részletfizetések kezelése' : 'Manage financing'} <ChevronRight className="h-3.5 w-3.5" />
          </p>
        </div>

        {/* Card 4: Repairs Pending */}
        <div 
          onClick={() => setCurrentView('repairs')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-amber-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'hu' ? 'Javításra vár' : 'Awaiting Repair'}</span>
            <div className="p-2.5 rounded-xl bg-amber-950 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">{pendingRepairsCount}</span>
            <span className="text-xs text-slate-400">{language === 'hu' ? 'hibás/szervizben' : 'faulty/in service'}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
            {language === 'hu' ? 'Javítások megtekintése' : 'View repairs'} <ChevronRight className="h-3.5 w-3.5" />
          </p>
        </div>

      </div>

      {/* Main Content Grid: Recent Items & Warranty Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Recent Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Boxes className="h-5 w-5 text-emerald-400" />
              {t('recently_added')}
            </h2>
            <button
              onClick={() => setCurrentView('items')}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              {language === 'hu' ? 'Összes megtekintése' : 'View all'} ({items.length}) <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
              <Boxes className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">{t('no_items_yet')}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {language === 'hu' ? 'Kezdd el a leltározást szerszámaid, elektronikád vagy értékeid rögzítésével.' : 'Start building your personal inventory by recording your tools, electronics, or equipment.'}
              </p>
              <button
                onClick={handleOpenAddThing}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> {t('add_first_thing')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.slice(0, 4).map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Warranty Alerts & Location Breakdown */}
        <div className="space-y-6">
          
          {/* Warranty Alert Box */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              {t('warranty_tracker')}
            </h3>

            {activeWarranties.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">{t('no_warranty')}</p>
            ) : (
              <div className="space-y-3">
                {activeWarranties.slice(0, 4).map(item => {
                  const expDate = new Date(item.warranty_end!);
                  const isExpiringSoon = expDate <= thirtyDaysFromNow;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {getLocationPath(item.location_id)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isExpiringSoon
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        }`}>
                          {isExpiringSoon ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              {t('expiring_soon')}
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              {t('warranty_active')}
                            </>
                          )}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {expDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Categories Overview */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-400" />
                {t('categories_summary')}
              </h3>
              <button
                onClick={() => setCurrentView('categories')}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                {language === 'hu' ? 'Összes megtekintése' : 'View all'}
              </button>
            </div>

            <div className="space-y-2">
              {categories.slice(0, 5).map(cat => {
                const catItems = items.filter(i => i.category_id === cat.id);
                const count = catItems.length;
                const value = catItems.reduce((s, i) => s + (i.current_value ?? i.purchase_price ?? 0), 0);

                return (
                  <div
                    key={cat.id}
                    onClick={() => setCurrentView('categories')}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/50 cursor-pointer transition-colors text-xs"
                  >
                    <span className="font-medium text-slate-200">{getCategoryName(cat.id)}</span>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>{count} {language === 'hu' ? 'tárgy' : 'items'}</span>
                      <span className="font-semibold text-emerald-400">{formatCurrency(value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
