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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
            {t('dashboard')}
          </h1>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-1">
            {isHu
              ? 'Személyes és családi vagyontárgyaid, javítások és pénzügyi analitika áttekintése.'
              : 'Overview of personal & household assets, maintenance tasks, and financial analytics.'}
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center p-1 rounded-[14px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] self-start sm:self-auto shrink-0 shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-md'
                : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>{isHu ? 'Áttekintés' : 'Overview'}</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-md'
                : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
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
              className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--color-primary-blue,#2563EB)]/60 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{t('total_items')}</span>
                <div className="p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] group-hover:bg-[var(--color-primary-blue,#2563EB)] group-hover:text-white transition-colors">
                  <Boxes className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-[var(--text-main,#E0E3E6)] tracking-tight">{totalItems}</span>
                <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{t('items_logged')}</span>
              </div>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-2 flex items-center gap-1 group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors">
                {isHu ? 'Összes tárgy megtekintése' : 'View all items'} <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </div>

            {/* Card 2: Total Value */}
            <div 
              onClick={() => setActiveTab('analytics')}
              className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--status-success,#34D399)]/60 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{t('total_value')}</span>
                <div className="p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--status-success,#34D399)] group-hover:bg-[var(--status-success,#34D399)] group-hover:text-slate-950 transition-colors">
                  <Euro className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-black text-[var(--status-success,#34D399)] tracking-tight">
                  {formatCurrency(totalCurrentValue)}
                </span>
              </div>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-2 flex items-center gap-1 group-hover:text-[var(--status-success,#34D399)] transition-colors">
                {isHu ? 'Analitika megtekintése' : 'View Analytics'} <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </div>

            {/* Card 3: Monthly Installments */}
            <div 
              onClick={() => setCurrentView('financing')}
              className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--cat-books,#818CF8)]/60 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{isHu ? 'Havi részletek' : 'Monthly Installments'}</span>
                <div className="p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--cat-books,#818CF8)] group-hover:bg-[var(--cat-books,#818CF8)] group-hover:text-white transition-colors">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-[var(--cat-books,#818CF8)] tracking-tight">{formatCurrency(totalMonthlyInstallment)}</span>
              </div>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-2 flex items-center gap-1 group-hover:text-[var(--cat-books,#818CF8)] transition-colors">
                {isHu ? 'Részletfizetések kezelése' : 'Manage financing'} <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </div>

            {/* Card 4: Repairs Pending */}
            <div 
              onClick={() => setCurrentView('repairs')}
              className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--status-warning,#F59E0B)]/60 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{isHu ? 'Javításra vár' : 'Awaiting Repair'}</span>
                <div className="p-2.5 rounded-xl bg-[var(--status-warning,#F59E0B)]/15 text-[var(--status-warning,#F59E0B)] group-hover:bg-[var(--status-warning,#F59E0B)] group-hover:text-slate-950 transition-colors">
                  <Wrench className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[var(--status-warning,#F59E0B)] tracking-tight">{pendingRepairsCount}</span>
                <span className="text-xs text-[var(--text-sub,#B5BDC6)]">{isHu ? 'hibás/szervizben' : 'faulty/in service'}</span>
              </div>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-2 flex items-center gap-1 group-hover:text-[var(--status-warning,#F59E0B)] transition-colors">
                {isHu ? 'Javítások megtekintése' : 'View repairs'} <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </div>

          </div>

          {/* Main Content Grid: Recent Items & Warranty Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Recent Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
                  {t('recently_added')}
                </h2>
                <button
                  onClick={() => setCurrentView('items')}
                  className="text-xs font-semibold text-[var(--color-primary-blue,#2563EB)] hover:underline flex items-center gap-1"
                >
                  {isHu ? 'Összes megtekintése' : 'View all'} ({items.length}) <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-8 sm:p-12 text-center rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)]">
                  <Boxes className="h-12 w-12 text-[var(--text-sub,#B5BDC6)]/50 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-[var(--text-main,#E0E3E6)]">{t('no_items_yet')}</h3>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-1 max-w-sm mx-auto">
                    {isHu ? 'Kezdd el a leltározást szerszámaid, elektronikád vagy értékeid rögzítésével.' : 'Start building your personal inventory by recording your tools, electronics, or equipment.'}
                  </p>
                  <button
                    onClick={handleOpenAddThing}
                    className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow"
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
              <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--status-success,#34D399)]" />
                  {t('warranty_tracker')}
                </h3>

                {activeWarranties.length === 0 ? (
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] py-2">{t('no_warranty')}</p>
                ) : (
                  <div className="space-y-3">
                    {activeWarranties.slice(0, 4).map(item => {
                      const expDate = new Date(item.warranty_end!);
                      const isExpiringSoon = expDate <= thirtyDaysFromNow;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className="p-3 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] hover:border-[var(--color-primary-blue,#2563EB)]/50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-semibold text-[var(--text-main,#E0E3E6)] truncate">{item.name}</p>
                            <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] truncate">
                              {getLocationPath(item.location_id)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isExpiringSoon
                                ? 'bg-[var(--status-warning,#F59E0B)]/20 text-[var(--status-warning,#F59E0B)] border border-[var(--status-warning,#F59E0B)]/40'
                                : 'bg-[var(--status-success,#34D399)]/20 text-[var(--status-success,#34D399)] border border-[var(--status-success,#34D399)]/40'
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
                            <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] mt-1">
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
              <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
                    {t('categories_summary')}
                  </h3>
                  <button
                    onClick={() => setCurrentView('categories')}
                    className="text-xs font-semibold text-[var(--color-primary-blue,#2563EB)] hover:underline"
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
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 border border-[var(--border-color,#56616D)]/40 cursor-pointer transition-colors text-xs"
                      >
                        <span className="font-medium text-[var(--text-main,#E0E3E6)]">{getCategoryName(cat.id)}</span>
                        <div className="flex items-center gap-3 text-[var(--text-sub,#B5BDC6)]">
                          <span>{count} {isHu ? 'tárgy' : 'items'}</span>
                          <span className="font-semibold text-[var(--status-success,#34D399)]">{formatCurrency(value)}</span>
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
            <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-sub,#B5BDC6)] text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Aktuális Leltárérték' : 'Estimated Total Value'}</span>
                <div className="p-2 rounded-xl bg-[var(--status-success,#34D399)]/10 border border-[var(--status-success,#34D399)]/20 text-[var(--status-success,#34D399)]">
                  <Euro className="h-4 w-4" />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-[var(--status-success,#34D399)] tracking-tight">
                  {formatCurrency(totalCurrentValue)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-sub,#B5BDC6)] flex items-center justify-between pt-1">
                <span>{isHu ? 'Értékelt tárgyak:' : 'Valued items:'}</span>
                <span className="font-bold text-[var(--text-main,#E0E3E6)]">{itemsWithValueCount} / {totalItems} db</span>
              </div>
            </div>

            {/* Card 2: Original Purchase Price */}
            <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-sub,#B5BDC6)] text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Összes Vásárlási Ár' : 'Total Purchase Price'}</span>
                <div className="p-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)]/10 border border-[var(--color-primary-blue,#2563EB)]/20 text-[var(--color-primary-blue,#2563EB)]">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-[var(--color-primary-blue,#2563EB)] tracking-tight">
                  {formatCurrency(totalPurchasePrice)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-sub,#B5BDC6)] flex items-center justify-between pt-1">
                <span>{isHu ? 'Ismert vételár:' : 'Known purchase price:'}</span>
                <span className="font-bold text-[var(--text-main,#E0E3E6)]">{items.filter(i => (i.purchase_price || 0) > 0).length} tárgy</span>
              </div>
            </div>

            {/* Card 3: Value Change (Difference) */}
            <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-sub,#B5BDC6)] text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Értékváltozás' : 'Value Change'}</span>
                <div className={`p-2 rounded-xl ${
                  valueDifference >= 0
                    ? 'bg-[var(--status-success,#34D399)]/10 border border-[var(--status-success,#34D399)]/20 text-[var(--status-success,#34D399)]'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {valueDifference >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
              </div>
              <div className="pt-2 flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  valueDifference >= 0 ? 'text-[var(--status-success,#34D399)]' : 'text-rose-400'
                }`}>
                  {valueDifference >= 0 ? '+' : ''}{formatCurrency(valueDifference)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-sub,#B5BDC6)] flex items-center justify-between pt-1">
                <span>{isHu ? 'Százalékos elmozdulás:' : 'Percentage shift:'}</span>
                <span className={`font-bold flex items-center gap-0.5 ${valueDifference >= 0 ? 'text-[var(--status-success,#34D399)]' : 'text-rose-400'}`}>
                  {valueDifference >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {valueChangePercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Card 4: Net Asset Valuation */}
            <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-sub,#B5BDC6)] text-xs font-semibold uppercase tracking-wider">
                <span>{isHu ? 'Nettó Vagyontárgy Érték' : 'Net Asset Value'}</span>
                <div className="p-2 rounded-xl bg-[var(--cat-books,#818CF8)]/15 border border-[var(--cat-books,#818CF8)]/30 text-[var(--cat-books,#818CF8)]">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-[var(--text-main,#E0E3E6)] tracking-tight">
                  {formatCurrency(netInventoryValue)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-sub,#B5BDC6)] flex items-center justify-between pt-1">
                <span>{isHu ? 'Fennmaradó tartozás:' : 'Remaining debt:'}</span>
                <span className="font-bold text-[var(--status-warning,#F59E0B)]">-{formatCurrency(totalRemainingDebt)}</span>
              </div>
            </div>

          </div>

          {/* Data Coverage Notice Banner */}
          {isPartialData && (
            <div className="p-4 rounded-[14px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] flex items-start gap-3 shadow-sm">
              <HelpCircle className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Részleges pénzügyi lefedettség' : 'Partial Financial Coverage Notice'}
                </p>
                <p className="text-[var(--text-sub,#B5BDC6)] leading-relaxed">
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
            <div className="p-6 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] pb-4">
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2.5">
                  <Tag className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
                  <span>{isHu ? 'Kategóriánkénti Megoszlás' : 'Category Valuation Breakdown'}</span>
                </h3>
                <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                  {categoryStats.length} {isHu ? 'kategória' : 'categories'}
                </span>
              </div>

              {categoryStats.length === 0 ? (
                <p className="text-xs text-[var(--text-sub,#B5BDC6)] text-center py-8">{isHu ? 'Nincs megjeleníthető kategória adat.' : 'No category valuation data available.'}</p>
              ) : (
                <div className="space-y-4">
                  {categoryStats.map(cat => (
                    <div key={cat.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[var(--text-main,#E0E3E6)] truncate">{cat.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] text-[10px] font-bold">
                            {cat.count} db
                          </span>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <span className="font-bold text-[var(--status-success,#34D399)] mr-2">{formatCurrency(cat.value)}</span>
                          <span className="text-[var(--text-sub,#B5BDC6)] text-[11px]">({cat.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      
                      {/* Visual Percentage Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-[var(--surface-bg,#465362)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--status-success,#34D399)] to-teal-400 transition-all duration-500"
                          style={{ width: `${Math.max(2, Math.min(100, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Location Financial Distribution */}
            <div className="p-6 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] pb-4">
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2.5">
                  <Building2 className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
                  <span>{isHu ? 'Helyszínenkénti Megoszlás' : 'Location Valuation Breakdown'}</span>
                </h3>
                <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                  {locationStats.length} {isHu ? 'helyszín' : 'locations'}
                </span>
              </div>

              {locationStats.length === 0 ? (
                <p className="text-xs text-[var(--text-sub,#B5BDC6)] text-center py-8">{isHu ? 'Nincs megjeleníthető helyszín adat.' : 'No location valuation data available.'}</p>
              ) : (
                <div className="space-y-4">
                  {locationStats.map(loc => (
                    <div key={loc.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[var(--text-main,#E0E3E6)] truncate">{loc.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] text-[10px] font-bold">
                            {loc.count} db
                          </span>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <span className="font-bold text-[var(--color-primary-blue,#2563EB)] mr-2">{formatCurrency(loc.value)}</span>
                          <span className="text-[var(--text-sub,#B5BDC6)] text-[11px]">({loc.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      
                      {/* Visual Percentage Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-[var(--surface-bg,#465362)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary-blue,#2563EB)] to-indigo-400 transition-all duration-500"
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
            <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[var(--cat-books,#818CF8)]" />
                  <span>{isHu ? 'Részletfizetési Kötelezettségek' : 'Financing & Debt Commitments'}</span>
                </h4>
                <button
                  onClick={() => setCurrentView('financing')}
                  className="text-xs text-[var(--cat-books,#818CF8)] hover:underline font-semibold"
                >
                  {isHu ? 'Kezelés' : 'Manage'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between text-xs">
                <div>
                  <span className="block text-[10px] text-[var(--text-sub,#B5BDC6)] uppercase font-bold">{isHu ? 'Fennmaradó tartozás' : 'Remaining Debt'}</span>
                  <span className="text-lg font-black text-[var(--status-warning,#F59E0B)] mt-0.5 block">{formatCurrency(totalRemainingDebt)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-[var(--text-sub,#B5BDC6)] uppercase font-bold">{isHu ? 'Havi teher' : 'Monthly Liability'}</span>
                  <span className="text-lg font-black text-[var(--text-main,#E0E3E6)] mt-0.5 block">{formatCurrency(totalMonthlyInstallment)}</span>
                </div>
              </div>
            </div>

            {/* Maintenance Costs Breakdown */}
            <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[var(--status-warning,#F59E0B)]" />
                  <span>{isHu ? 'Szerviz- és Ráfordítási Költségek' : 'Maintenance & Repair Costs'}</span>
                </h4>
                <button
                  onClick={() => setCurrentView('repairs')}
                  className="text-xs text-[var(--status-warning,#F59E0B)] hover:underline font-semibold"
                >
                  {isHu ? 'Kezelés' : 'Manage'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between text-xs">
                <div>
                  <span className="block text-[10px] text-[var(--text-sub,#B5BDC6)] uppercase font-bold">{isHu ? 'Összes szervizköltség' : 'Total Repair Costs'}</span>
                  <span className="text-lg font-black text-[var(--status-warning,#F59E0B)] mt-0.5 block">{formatCurrency(totalRepairCosts)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-[var(--text-sub,#B5BDC6)] uppercase font-bold">{isHu ? 'Folyamatban lévő szerviz' : 'Active Repairs'}</span>
                  <span className="text-lg font-black text-[var(--status-warning,#F59E0B)] mt-0.5 block">{pendingRepairsCount} {isHu ? 'tárgy' : 'items'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

