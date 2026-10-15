import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  AlertTriangle,
  Clock,
  Plus,
  Minus,
  Trash2,
  Edit2,
  CheckCircle2,
  Search,
  X,
  ShoppingCart,
  Copy,
  Check,
  Calendar,
  MapPin,
  Package
} from 'lucide-react';
import type { PantryItem } from '../types';

export const PantryView: React.FC = () => {
  const {
    pantryItems,
    addPantryItem,
    updatePantryItem,
    deletePantryItem,
    adjustPantryQuantity,
    locations,
    getLocationPath,
    language
  } = useApp();

  const isHu = language === 'hu';

  const [activeTab, setActiveTab] = useState<'all' | 'low_stock' | 'expiring' | 'shopping_list'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Item form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(isHu ? 'Élelmiszer' : 'Groceries');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('db');
  const [formMinThreshold, setFormMinThreshold] = useState<number>(1);
  const [formExpirationDate, setFormExpirationDate] = useState('');
  const [formLocationId, setFormLocationId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsStaple, setFormIsStaple] = useState(true);

  // Shopping list modal
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const inSevenDaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const categoriesList = useMemo(() => {
    return [
      isHu ? 'Élelmiszer' : 'Groceries',
      isHu ? 'Tisztítószer' : 'Cleaning',
      isHu ? 'Higiénia & Kozmetikum' : 'Hygiene & Cosmetics',
      isHu ? 'Irodaszer' : 'Office Supplies',
      isHu ? 'Barkács & Műhely' : 'Workshop & DIY',
      isHu ? 'Egyéb' : 'Other'
    ];
  }, [isHu]);

  // Compute KPI stats
  const stats = useMemo(() => {
    let lowStockCount = 0;
    let expiringCount = 0;
    let shoppingListCount = 0;

    pantryItems.forEach(item => {
      const isLow = Number(item.current_quantity) <= Number(item.min_threshold);
      if (isLow) lowStockCount++;

      const isExpiring = item.expiration_date && item.expiration_date <= inSevenDaysStr;
      if (isExpiring) expiringCount++;

      if (isLow && item.is_staple) shoppingListCount++;
    });

    return {
      total: pantryItems.length,
      lowStock: lowStockCount,
      expiring: expiringCount,
      shoppingList: shoppingListCount
    };
  }, [pantryItems, inSevenDaysStr]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return pantryItems.filter(item => {
      const isLow = Number(item.current_quantity) <= Number(item.min_threshold);
      const isExpiring = item.expiration_date && item.expiration_date <= inSevenDaysStr;

      if (activeTab === 'low_stock' && !isLow) return false;
      if (activeTab === 'expiring' && !isExpiring) return false;
      if (activeTab === 'shopping_list' && !(isLow && item.is_staple)) return false;

      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCat = (item.category || '').toLowerCase().includes(q);
        const matchesNotes = (item.notes || '').toLowerCase().includes(q);
        return matchesName || matchesCat || matchesNotes;
      }

      return true;
    });
  }, [pantryItems, activeTab, selectedCategory, searchQuery, inSevenDaysStr]);

  // Shopping list items
  const shoppingListItems = useMemo(() => {
    return pantryItems.filter(i => Number(i.current_quantity) <= Number(i.min_threshold) && i.is_staple);
  }, [pantryItems]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory(isHu ? 'Élelmiszer' : 'Groceries');
    setFormQuantity(1);
    setFormUnit('db');
    setFormMinThreshold(1);
    setFormExpirationDate('');
    setFormLocationId('');
    setFormNotes('');
    setFormIsStaple(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PantryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || (isHu ? 'Élelmiszer' : 'Groceries'));
    setFormQuantity(Number(item.current_quantity));
    setFormUnit(item.unit || 'db');
    setFormMinThreshold(Number(item.min_threshold));
    setFormExpirationDate(item.expiration_date || '');
    setFormLocationId(item.location_id || '');
    setFormNotes(item.notes || '');
    setFormIsStaple(item.is_staple ?? true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingItem) {
      await updatePantryItem(editingItem.id, {
        name: formName.trim(),
        category: formCategory,
        current_quantity: formQuantity,
        unit: formUnit,
        min_threshold: formMinThreshold,
        expiration_date: formExpirationDate || undefined,
        location_id: formLocationId || undefined,
        notes: formNotes.trim() || undefined,
        is_staple: formIsStaple,
      });
    } else {
      await addPantryItem({
        user_id: '',
        name: formName.trim(),
        category: formCategory,
        current_quantity: formQuantity,
        unit: formUnit,
        min_threshold: formMinThreshold,
        expiration_date: formExpirationDate || undefined,
        location_id: formLocationId || undefined,
        notes: formNotes.trim() || undefined,
        is_staple: formIsStaple,
      });
    }

    setIsModalOpen(false);
  };

  const handleCopyShoppingList = () => {
    const lines = shoppingListItems.map(
      i => `- ${i.name} (jelenleg: ${i.current_quantity} ${i.unit}, min: ${i.min_threshold} ${i.unit})`
    );
    const header = isHu ? '🛒 Thingor Bevásárlólista:\n' : '🛒 Thingor Shopping List:\n';
    const text = header + lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
                {isHu ? 'Spájz & Fogyóeszközök' : 'Pantry & Consumables'}
              </h1>
              <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-0.5">
                {isHu
                  ? 'Tartós élelmiszerek, tisztítószerek és háztartási készletek szintje, lejárati idők és automata bevásárlólista.'
                  : 'Track household consumables, expiration dates, stock thresholds, and auto-generated shopping lists.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsShoppingListOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] font-bold text-xs border border-[var(--border-color,#56616D)] transition-all shadow-sm"
          >
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            <span>{isHu ? `Bevásárlólista (${stats.shoppingList})` : `Shopping List (${stats.shoppingList})`}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs shadow-md transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{isHu ? 'Új készletcikk' : 'Add Item'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Összes készletféle' : 'Total Items'}
            </span>
            <div className="p-2 rounded-lg bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{stats.total}</span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'nyilvántartott termék' : 'tracked products'}</span>
          </div>
        </div>

        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Fogyóban / Elfogyott' : 'Low / Out of Stock'}
            </span>
            <div className="p-2 rounded-lg bg-[var(--status-danger,#EF4444)]/15 text-[var(--status-danger,#EF4444)]">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-black ${stats.lowStock > 0 ? 'text-[var(--status-danger,#EF4444)]' : 'text-[var(--text-main,#E0E3E6)]'}`}>
              {stats.lowStock}
            </span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'utánpótlásra vár' : 'need restock'}</span>
          </div>
        </div>

        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Közelgő lejárati idő' : 'Expiring Soon'}
            </span>
            <div className="p-2 rounded-lg bg-[var(--status-warning,#F59E0B)]/15 text-[var(--status-warning,#F59E0B)]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-black ${stats.expiring > 0 ? 'text-[var(--status-warning,#F59E0B)]' : 'text-[var(--text-main,#E0E3E6)]'}`}>
              {stats.expiring}
            </span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? '7 napon belül' : 'within 7 days'}</span>
          </div>
        </div>

        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Bevásárlólista' : 'Shopping List'}
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-emerald-400">{stats.shoppingList}</span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'megvásárolandó tétel' : 'items to buy'}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] overflow-x-auto">
          {(['all', 'low_stock', 'expiring', 'shopping_list'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                  : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
              }`}
            >
              {tab === 'all' && (isHu ? 'Összes tétel' : 'All Items')}
              {tab === 'low_stock' && (isHu ? `Fogyóban (${stats.lowStock})` : `Low Stock (${stats.lowStock})`)}
              {tab === 'expiring' && (isHu ? `Lejáróban (${stats.expiring})` : `Expiring (${stats.expiring})`)}
              {tab === 'shopping_list' && (isHu ? `Bevásárlólista (${stats.shoppingList})` : `Shopping List (${stats.shoppingList})`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
          >
            <option value="all">{isHu ? 'Minden kategória' : 'All categories'}</option>
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isHu ? 'Keresés termék, megjegyzés szerint...' : 'Search items...'}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--surface-bg,#465362)] flex items-center justify-center text-[var(--text-sub,#B5BDC6)]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
            {isHu ? 'Nincs megjeleníthető tétel' : 'No pantry items found'}
          </h3>
          <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
            {isHu
              ? 'Rögzítsd az első fogyóeszközödet vagy tartós készletedet a fenti gombra kattintva.'
              : 'Add your first consumable item to start tracking household supplies.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const isOut = Number(item.current_quantity) <= 0;
            const isLow = Number(item.current_quantity) <= Number(item.min_threshold);
            const isExpired = item.expiration_date && item.expiration_date < todayStr;
            const isExpiringSoon = item.expiration_date && item.expiration_date <= inSevenDaysStr && !isExpired;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-[16px] border bg-[var(--card-bg,#3A4551)] flex flex-col justify-between shadow-sm transition-all ${
                  isOut
                    ? 'border-[var(--status-danger,#EF4444)]/60 bg-[var(--status-danger,#EF4444)]/5'
                    : isLow
                    ? 'border-[var(--status-warning,#F59E0B)]/60 bg-[var(--status-warning,#F59E0B)]/5'
                    : 'border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)]/50'
                }`}
              >
                <div>
                  {/* Top Bar: Name & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.category && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]">
                            {item.category}
                          </span>
                        )}
                        {item.is_staple && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/15 text-emerald-400">
                            {isHu ? 'Alapcikk' : 'Staple'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-[var(--text-main,#E0E3E6)] mt-1.5 truncate">
                        {item.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                        title={isHu ? 'Szerkesztés' : 'Edit'}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(isHu ? 'Biztosan törölni szeretnéd ezt a készletcikket?' : 'Are you sure you want to delete this item?')) {
                            deletePantryItem(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-[var(--status-danger,#EF4444)]/80 hover:text-[var(--status-danger,#EF4444)] hover:bg-[var(--status-danger,#EF4444)]/10"
                        title={isHu ? 'Törlés' : 'Delete'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity Controller & Progress */}
                  <div className="mt-4 p-3.5 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-sub,#B5BDC6)] font-semibold">
                        {isHu ? 'Készletszint' : 'Current Stock'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustPantryQuantity(item.id, -1)}
                          disabled={item.current_quantity <= 0}
                          className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)] hover:bg-[var(--card-bg,#3A4551)] text-[var(--text-main,#E0E3E6)] disabled:opacity-40 transition-colors"
                          title="-1"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-base font-extrabold text-[var(--text-main,#E0E3E6)] min-w-[3rem] text-center">
                          {item.current_quantity} <span className="text-xs font-normal text-[var(--text-sub,#B5BDC6)]">{item.unit}</span>
                        </span>
                        <button
                          onClick={() => adjustPantryQuantity(item.id, 1)}
                          className="p-1.5 rounded-lg bg-[var(--color-primary-blue,#2563EB)]/20 hover:bg-[var(--color-primary-blue,#2563EB)] text-[var(--color-primary-blue,#2563EB)] hover:text-white transition-colors"
                          title="+1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--text-sub,#B5BDC6)]">
                      <span>{isHu ? `Minimális szint: ${item.min_threshold} ${item.unit}` : `Min. threshold: ${item.min_threshold} ${item.unit}`}</span>
                      {isOut ? (
                        <span className="text-[var(--status-danger,#EF4444)] font-bold">{isHu ? 'Elfogyott!' : 'Out of stock!'}</span>
                      ) : isLow ? (
                        <span className="text-[var(--status-warning,#F59E0B)] font-bold">{isHu ? 'Fogyóban' : 'Low stock'}</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">{isHu ? 'Elegendő' : 'In stock'}</span>
                      )}
                    </div>
                  </div>

                  {/* Metadata: Expiration & Location */}
                  <div className="mt-3 space-y-1.5 text-xs text-[var(--text-sub,#B5BDC6)]">
                    {item.expiration_date && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[var(--text-sub,#B5BDC6)]" />
                          <span>{isHu ? 'Lejárat:' : 'Expires:'}</span>
                        </span>
                        <span className={`font-bold ${isExpired ? 'text-[var(--status-danger,#EF4444)]' : isExpiringSoon ? 'text-[var(--status-warning,#F59E0B)]' : 'text-[var(--text-main,#E0E3E6)]'}`}>
                          {item.expiration_date} {isExpired ? (isHu ? '(Lejárt!)' : '(Expired!)') : ''}
                        </span>
                      </div>
                    )}

                    {item.location_id && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[var(--text-sub,#B5BDC6)]" />
                          <span>{isHu ? 'Tárolási hely:' : 'Location:'}</span>
                        </span>
                        <span className="font-semibold text-[var(--text-main,#E0E3E6)] truncate max-w-[150px]">
                          {getLocationPath(item.location_id)}
                        </span>
                      </div>
                    )}

                    {item.notes && (
                      <p className="mt-2 text-[11px] italic text-[var(--text-sub,#B5BDC6)] line-clamp-2">
                        „{item.notes}”
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SHOPPING LIST MODAL */}
      {isShoppingListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Automatikus Bevásárlólista' : 'Auto Shopping List'}
                </h3>
              </div>
              <button
                onClick={() => setIsShoppingListOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {shoppingListItems.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
                    {isHu ? 'Minden alapcikkből elegendő van készleten!' : 'All staple items are adequately stocked!'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {shoppingListItems.map(item => (
                    <li
                      key={item.id}
                      className="p-3 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--text-main,#E0E3E6)] block">{item.name}</span>
                        <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                          {isHu
                            ? `Jelenleg: ${item.current_quantity} ${item.unit} (Szükséges: ${item.min_threshold} ${item.unit})`
                            : `Current: ${item.current_quantity} ${item.unit} (Target: ${item.min_threshold} ${item.unit})`}
                        </span>
                      </div>

                      <button
                        onClick={() => adjustPantryQuantity(item.id, Number(item.min_threshold) - Number(item.current_quantity) + 1)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-[11px] transition-colors shrink-0"
                      >
                        {isHu ? 'Megvéve (+feltöltés)' : 'Restock'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-color,#56616D)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-sub,#B5BDC6)]">
                {shoppingListItems.length} {isHu ? 'tétel a listán' : 'items on list'}
              </span>

              <button
                onClick={handleCopyShoppingList}
                disabled={shoppingListItems.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs shadow transition-all disabled:opacity-40"
              >
                {copiedSuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedSuccess ? (isHu ? 'Másolva!' : 'Copied!') : (isHu ? 'Lista másolása' : 'Copy List')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)]">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {editingItem ? (isHu ? 'Készletcikk szerkesztése' : 'Edit Item') : (isHu ? 'Új készletcikk felvétele' : 'Add New Item')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Termék neve *' : 'Item Name *'}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder={isHu ? 'Pl. Mosószer kapszula, Kávébab' : 'e.g. Coffee beans, Laundry detergent'}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Kategória' : 'Category'}
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Mennyiség *' : 'Quantity *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formQuantity}
                    onChange={e => setFormQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Egység' : 'Unit'}
                  </label>
                  <select
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="db">{isHu ? 'db' : 'pcs'}</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="csomag">{isHu ? 'csomag' : 'pack'}</option>
                    <option value="doboz">{isHu ? 'doboz' : 'box'}</option>
                    <option value="flakon">{isHu ? 'flakon' : 'bottle'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Min. szint' : 'Min. Level'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formMinThreshold}
                    onChange={e => setFormMinThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Lejárati dátum' : 'Expiration Date'}
                  </label>
                  <input
                    type="date"
                    value={formExpirationDate}
                    onChange={e => setFormExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Tárolási hely' : 'Location'}
                  </label>
                  <select
                    value={formLocationId}
                    onChange={e => setFormLocationId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="">{isHu ? 'Nincs megadva' : 'None'}</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{getLocationPath(loc.id)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_staple"
                  checked={formIsStaple}
                  onChange={e => setFormIsStaple(e.target.checked)}
                  className="rounded border-[var(--border-color,#56616D)] text-emerald-500 focus:ring-emerald-400"
                />
                <label htmlFor="is_staple" className="text-xs font-semibold text-[var(--text-main,#E0E3E6)] cursor-pointer">
                  {isHu ? 'Alapvető cikk (ha elfogy, kerüljön a bevásárlólistára)' : 'Staple item (auto-add to shopping list when low)'}
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Megjegyzések' : 'Notes'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder={isHu ? 'Márka, kedvenc íz, beszerzési hely...' : 'Brand, store...'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white shadow-md"
                >
                  {editingItem ? (isHu ? 'Mentés' : 'Save Changes') : (isHu ? 'Hozzáadás' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
