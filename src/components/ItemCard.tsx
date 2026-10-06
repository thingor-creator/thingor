import React from 'react';
import type { Item } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, ShieldCheck, Tag, Edit3, Image as ImageIcon } from 'lucide-react';

interface ItemCardProps {
  item: Item;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const { setSelectedItemId, setIsAddEditItemModalOpen, setEditingItem, getLocationPath, getCategoryName, t, language } = useApp();

  const locationPath = getLocationPath(item.location_id);
  const categoryName = getCategoryName(item.category_id);
  const displayValue = item.current_value ?? item.purchase_price ?? 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsAddEditItemModalOpen(true);
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'New': return t('cond_new');
      case 'Excellent': return t('cond_excellent');
      case 'Good': return t('cond_good');
      case 'Fair': return t('cond_fair');
      case 'Poor': return t('cond_poor');
      case 'Broken': return t('cond_broken');
      default: return condition;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'New':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
      case 'Excellent':
        return 'bg-teal-950/80 text-teal-300 border-teal-800/60';
      case 'Good':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'Fair':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'Poor':
      case 'Broken':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div
      onClick={() => setSelectedItemId(item.id)}
      className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-950/20 transition-all duration-200 cursor-pointer isolate"
    >
      {/* Thumbnail Image Header */}
      <div className="relative h-44 w-full shrink-0 bg-slate-950 overflow-hidden flex items-center justify-center rounded-t-2xl">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            className="h-full w-full object-cover object-center block group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none rounded-t-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
            }}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-600 bg-slate-950">
            <ImageIcon className="h-10 w-10 mb-1" />
            <span className="text-[11px]">Nincs kép</span>
          </div>
        )}

        {/* Category Pill Overlay */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-950/90 text-emerald-400 backdrop-blur border border-slate-800 shadow">
            <Tag className="h-3 w-3" />
            {categoryName}
          </span>
        </div>

        {/* Quick Edit Icon */}
        <button
          onClick={handleEdit}
          className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-slate-300 hover:text-white hover:bg-emerald-500 hover:text-slate-950 backdrop-blur transition-all opacity-0 group-hover:opacity-100"
          title={t('edit_thing')}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>

        {/* Condition Tag & Photo Count Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border pointer-events-auto ${getConditionColor(item.condition)}`}>
            {getConditionLabel(item.condition)}
          </span>

          {(item.additional_photos && item.additional_photos.length > 0) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-950/90 text-emerald-400 border border-slate-800 backdrop-blur pointer-events-auto">
              <ImageIcon className="h-3 w-3" />
              {1 + item.additional_photos.length}
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
          {item.name}
        </h3>

        {/* Location Path */}
        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 truncate">
          <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{locationPath}</span>
        </div>

        {/* Footer Metrics */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t('current_value')}</span>
            <span className="text-base font-extrabold text-white">
              {language === 'hu' ? `${displayValue.toLocaleString('hu-HU')} Ft` : `€${displayValue.toLocaleString('en-US')}`}
            </span>
          </div>

          {item.warranty_end && (
            <div className="text-right">
              <span className="text-[10px] text-emerald-400 font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> {t('warranty_active')}
              </span>
              <span className="block text-[10px] text-slate-400 font-mono">
                {new Date(item.warranty_end).getFullYear()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
