import React, { useState } from 'react';
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
  PieChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  HelpCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Coins
} from 'lucide-react';
import { ItemCard } from './ItemCard';

export const DashboardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  const {
    items,
    categories,
    locations,
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

  const isHu = language === 'hu';

  // 1. Core Metrics Calculation
  const totalItems = items.length;
  
  const totalCurrentValue = items.reduce((sum, item) => {
    return sum + (item.current_value ?? item.purchase_price ?? 0);
  }, 0);

  const totalPurchasePrice = items.reduce((sum, item) => {
    return sum + (item.purchase_price || 0);
  }, 0);

  const itemsWithValueCount = items.filter(
    i => i.current_value !== undefined && i.current_value !== null || i.purchase_price !== undefined && i.purchase_price !== null
  ).length;

  const itemsWithoutValueCount = totalItems - itemsWithValueCount;

  // Purchase vs Current Value Comparison
  const valueDifference = totalCurrentValue - totalPurchasePrice;
  const valueChangePercent = totalPurchasePrice > 0
    ? ((totalCurrentValue - totalPurchasePrice) / totalPurchasePrice) * 100
    : 0;
  const isPartialData = items.some(
    i => (i.purchase_price === undefined || i.purchase_price === null) || (i.current_value === undefined || i.current_value === null)
  );

  // New module metrics: Financing debt & Repairs cost
  const totalMonthlyInstallment = financings.reduce((sum, f) => f.remaining_installments > 0 ? sum + f.monthly_installment : sum, 0);
  const totalRemainingDebt = financings.reduce((sum, f) => sum + (f.remaining_debt || 0), 0);
  const totalRepairCosts = repairs.reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const pendingRepairsCount = repairs.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
  const netInventoryValue = Math.max(0, totalCurrentValue - totalRemainingDebt);

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
    return new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: isHu ? 'HUF' : 'EUR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 2. Category Financial Breakdown
  const categoryStats = categories.map(cat => {
    const catItems = items.filter(i => i.category_id === cat.id);
    const count = catItems.length;
    const value = catItems.reduce((s, i) => s + (i.current_value ?? i.purchase_price ?? 0), 0);
    const percentage = totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0;

    return {
      id: cat.id,
      name: getCategoryName(cat.id),
      count,
      value,
      percentage
    };
  }).filter(c => c.count > 0 || c.value > 0)
    .sort((a, b) => b.value - a.value);

  // 3. Location Financial Breakdown
  const locationStats = locations.map(loc => {
    const locItems = items.filter(i => i.location_id === loc.id);
    const count = locItems.length;
    const value = locItems.reduce((s, i) => s + (i.current_value ?? i.purchase_price ?? 0), 0);
    const percentage = totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0;

    return {
      id: loc.id,
      name: getLocationPath(loc.id),
      count,
      value,
      percentage
    };
  }).filter(l => l.count > 0 || l.value > 0)
    .sort((a, b) => b.value - a.value);

  // Unassigned items location breakdown
  const unassignedItems = items.filter(i => !i.location_id);
  const unassignedCount = unassignedItems.length;
  const unassignedValue = unassignedItems.reduce((s, i) => s + (i.current_value ?? i.purchase_price ?? 0), 0);
  const unassignedPercentage = totalCurrentValue > 0 ? (unassignedValue / totalCurrentValue) * 100 : 0;

  if (unassignedCount > 0) {
    locationStats.push({
      id: 'unassigned',
      name: isHu ? 'Helyszín nélkül' : 'Unassigned',
      count: unassignedCount,
      value: unassignedValue,
      percentage: unassignedPercentage
    });
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header with Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t('dashboard')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isHu
              ? 'Személyes és családi vagyontárgyaid, javítások és pénzügyi analitika áttekintése.'
              : 'Overview of personal & household assets, maintenance tasks, and financial analytics.'}
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>{isHu ? 'Áttekintés' : 'Overview'}</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="h-4 w-4 shrink-0" />
            <span>{isHu ? 'Pénzügyi Analitika' : 'Financial Analytics'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* DASHBOARD OVERVIEW CARDS GRID */}
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
                {isHu ? 'Összes tárgy megtekintése' : 'View all items'} <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </div>

            {/* Card 2: Total Value */}
            <div 
              onClick={() => setActiveTab('analytics')}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('total_value')}</span>
                <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  <Euro className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(totalCurrentValue)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                {isHu ? 'Analitika megtekintése' : 'View Analytics'} <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </div>

            {/* Card 3: Monthly Installments */}
            <div 
              onClick={() => setCurrentView('financing')}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isHu ? 'Havi részletek' : 'Monthly Installments'}</span>
                <div className="p-2.5 rounded-xl bg-indigo-950 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-indigo-300 tracking-tight">{formatCurrency(totalMonthlyInstallment)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                {isHu ? 'Részletfizetések kezelése' : 'Manage financing'} <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </div>

            {/* Card 4: Repairs Pending */}
            <div 
              onClick={() => setCurrentView('repairs')}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-amber-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isHu ? 'Javításra vár' : 'Awaiting Repair'}</span>
                <div className="p-2.5 rounded-xl bg-amber-950 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <Wrench className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">{pendingRepairsCount}</span>
                <span className="text-xs text-slate-400">{isHu ? 'hibás/szervizben' : 'faulty/in service'}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                {isHu ? 'Javítások megtekintése' : 'View repairs'} <ChevronRight className="h-3.5 w-3.5" />
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
                  {isHu ? 'Összes megtekintése' : 'View all'} ({items.length}) <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
                  <Boxes className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white">{t('no_items_yet')}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {isHu ? 'Kezdd el a leltározást szerszámaid, elektronikád vagy értékeid rögzítésével.' : 'Start building your personal inventory by recording your tools, electronics, or equipment.'}
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
                    {isHu ? 'Összes megtekintése' : 'View all'}
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
                          <span>{count} {isHu ? 'tárgy' : 'items'}</span>
                          <span className="font-semibold text-emerald-400">{formatCurrency(value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </>
      ) : (
        /* PÉNZÜGYI ANALITIKA (FINANCIAL ANALYTICS) FULL MODULE */
        <div className="space-y-8 animate-fadeIn">
          
          {/* Section 1: Financial Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Card 1: Estimated Inventory Value */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Aktuális Leltárérték' : 'Estimated Total Value'}</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Euro className="h-4 w-4" />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(totalCurrentValue)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{isHu ? 'Értékelt tárgyak:' : 'Valued items:'}</span>
                <span className="font-bold text-slate-200">{itemsWithValueCount} / {totalItems} db</span>
              </div>
            </div>

            {/* Card 2: Original Purchase Price */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Összes Vásárlási Ár' : 'Total Purchase Price'}</span>
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-400 tracking-tight">
                  {formatCurrency(totalPurchasePrice)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{isHu ? 'Ismert vételár:' : 'Known purchase price:'}</span>
                <span className="font-bold text-slate-200">{items.filter(i => (i.purchase_price || 0) > 0).length} tárgy</span>
              </div>
            </div>

            {/* Card 3: Value Change (Difference) */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Értékváltozás' : 'Value Change'}</span>
                <div className={`p-2 rounded-xl ${
                  valueDifference >= 0
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {valueDifference >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
              </div>
              <div className="pt-2 flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  valueDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {valueDifference >= 0 ? '+' : ''}{formatCurrency(valueDifference)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{isHu ? 'Százalékos elmozdulás:' : 'Percentage shift:'}</span>
                <span className={`font-bold flex items-center gap-0.5 ${valueDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {valueDifference >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {valueChangePercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Card 4: Net Asset Valuation */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Nettó Vagyontárgy Érték' : 'Net Asset Value'}</span>
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-300 tracking-tight">
                  {formatCurrency(netInventoryValue)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{isHu ? 'Fennmaradó tartozás:' : 'Remaining debt:'}</span>
                <span className="font-bold text-amber-400">-{formatCurrency(totalRemainingDebt)}</span>
              </div>
            </div>

          </div>

          {/* Data Coverage Notice Banner */}
          {isPartialData && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white">
                  {isHu ? 'Részleges pénzügyi lefedettség' : 'Partial Financial Coverage Notice'}
                </p>
                <p className="text-slate-400 leading-relaxed">
                  {isHu
                    ? `A leltáradban ${itemsWithoutValueCount} tárgynál nincs megadva vásárlási ár vagy becsült érték. Az analitika kizárólag a meglévő ismert értékadatok alapján számol, a hiányzó értékeket nem veszi figyelembe nullaként.`
                    : `${itemsWithoutValueCount} items in your inventory currently lack purchase price or current valuation. Analytics calculates strictly based on provided financial figures without falsely assuming zero.`}
                </p>
              </div>
            </div>
          )}

          {/* Section 2: Category & Location Distribution Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Col: Category Financial Distribution */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                  <Tag className="h-5 w-5 text-emerald-400" />
                  <span>{isHu ? 'Kategóriánkénti Megoszlás' : 'Category Valuation Breakdown'}</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {categoryStats.length} {isHu ? 'kategória' : 'categories'}
                </span>
              </div>

              {categoryStats.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">{isHu ? 'Nincs megjeleníthető kategória adat.' : 'No category valuation data available.'}</p>
              ) : (
                <div className="space-y-4">
                  {categoryStats.map(cat => (
                    <div key={cat.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-white truncate">{cat.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold">
                            {cat.count} db
                          </span>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <span className="font-bold text-emerald-400 mr-2">{formatCurrency(cat.value)}</span>
                          <span className="text-slate-400 text-[11px]">({cat.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      
                      {/* Visual Percentage Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${Math.max(2, Math.min(100, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Location Financial Distribution */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  <span>{isHu ? 'Helyszínenkénti Megoszlás' : 'Location Valuation Breakdown'}</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {locationStats.length} {isHu ? 'helyszín' : 'locations'}
                </span>
              </div>

              {locationStats.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">{isHu ? 'Nincs megjeleníthető helyszín adat.' : 'No location valuation data available.'}</p>
              ) : (
                <div className="space-y-4">
                  {locationStats.map(loc => (
                    <div key={loc.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-white truncate">{loc.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold">
                            {loc.count} db
                          </span>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <span className="font-bold text-blue-400 mr-2">{formatCurrency(loc.value)}</span>
                          <span className="text-slate-400 text-[11px]">({loc.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      
                      {/* Visual Percentage Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-500"
                          style={{ width: `${Math.max(2, Math.min(100, loc.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Section 3: Financial Commitments & Maintenance Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Installments Debt Breakdown */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-400" />
                  <span>{isHu ? 'Részletfizetési Kötelezettségek' : 'Financing & Debt Commitments'}</span>
                </h4>
                <button
                  onClick={() => setCurrentView('financing')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {isHu ? 'Kezelés' : 'Manage'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">{isHu ? 'Fennmaradó tartozás' : 'Remaining Debt'}</span>
                  <span className="text-lg font-black text-indigo-300 mt-0.5 block">{formatCurrency(totalRemainingDebt)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">{isHu ? 'Havi teher' : 'Monthly Liability'}</span>
                  <span className="text-lg font-black text-white mt-0.5 block">{formatCurrency(totalMonthlyInstallment)}</span>
                </div>
              </div>
            </div>

            {/* Maintenance Costs Breakdown */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-400" />
                  <span>{isHu ? 'Szerviz- és Ráfordítási Költségek' : 'Maintenance & Repair Costs'}</span>
                </h4>
                <button
                  onClick={() => setCurrentView('repairs')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  {isHu ? 'Kezelés' : 'Manage'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">{isHu ? 'Összes szervizköltség' : 'Total Repair Costs'}</span>
                  <span className="text-lg font-black text-amber-300 mt-0.5 block">{formatCurrency(totalRepairCosts)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">{isHu ? 'Folyamatban lévő szerviz' : 'Active Repairs'}</span>
                  <span className="text-lg font-black text-white mt-0.5 block">{pendingRepairsCount} {isHu ? 'tárgy' : 'items'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

