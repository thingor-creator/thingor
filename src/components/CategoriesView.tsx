import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, ChevronRight, X } from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const {
    categories,
    items,
    addCategory,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    setCurrentView,
    setFilters,
    getCategoryName,
    t,
    language,
  } = useApp();

  const [name, setName] = useState('');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addCategory(name.trim());
    setName('');
    setIsCategoryModalOpen(false);
  };

  const handleSelectCategory = (catId: string) => {
    setFilters(prev => ({ ...prev, categoryId: catId }));
    setCurrentView('items');
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('categories')}
            </h1>
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs">
              {categories.length} {language === 'hu' ? 'kategória' : 'categories'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {language === 'hu'
              ? 'Rendszerezd a tárgyaidat kategóriák szerint (Szerszámok, Elektronika, Sport, Egyedi kategóriák).'
              : 'Group your items by classification (Tools, Electronics, Sports, Custom categories).'}
          </p>
        </div>

        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
        >
          {language === 'hu' ? 'Egyedi kategória' : 'Custom Category'}
        </button>
      </div>

      {/* CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-400" />
                {language === 'hu' ? 'Egyedi kategória létrehozása' : 'Create Custom Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {language === 'hu' ? 'Kategória neve *' : 'Category Name *'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'hu' ? 'pl. Fényképészet, Hangszerek' : 'e.g. Photography, Musical Instruments'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-sm focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-emerald-500 text-slate-950 rounded-xl"
                >
                  {language === 'hu' ? 'Kategória hozzáadása' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORIES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id);
          const totalCount = catItems.length;
          const totalVal = catItems.reduce((s, i) => s + (i.current_value ?? i.purchase_price ?? 0), 0);
          const displayName = getCategoryName(cat.id);

          return (
            <div
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className="group p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                      {displayName}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {cat.is_custom
                        ? (language === 'hu' ? 'Egyedi kategória' : 'Custom Category')
                        : (language === 'hu' ? 'Alapértelmezett kategória' : 'Default Category')}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {totalCount} {language === 'hu' ? 'tárgy rögzítve' : 'items logged'}
                </span>
                <span className="font-bold text-white">€{totalVal.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
