import React from 'react';
import type { Item } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, ShieldCheck, Tag, Edit3, Image as ImageIcon, QrCode } from 'lucide-react';

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
        return 'bg-[var(--status-success,#34D399)]/20 text-[var(--status-success,#34D399)] border-[var(--status-success,#34D399)]/40';
      case 'Excellent':
        return 'bg-[var(--cat-electronics,#06B6D4)]/20 text-[var(--cat-electronics,#06B6D4)] border-[var(--cat-electronics,#06B6D4)]/40';
      case 'Good':
        return 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-[var(--border-color,#56616D)]';
      case 'Fair':
        return 'bg-[var(--status-warning,#F59E0B)]/20 text-[var(--status-warning,#F59E0B)] border-[var(--status-warning,#F59E0B)]/40';
      case 'Poor':
      case 'Broken':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/60';
      default:
        return 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-[var(--border-color,#56616D)]';
    }
  };

  return (
    <div
      onClick={() => setSelectedItemId(item.id)}
      className="group relative flex flex-col rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] overflow-hidden hover:border-[var(--color-primary-blue,#2563EB)]/60 hover:shadow-lg transition-all duration-200 cursor-pointer isolate"
    >
      {/* Thumbnail Image Header */}
      <div className="relative h-44 w-full shrink-0 bg-[var(--surface-bg,#465362)]/40 overflow-hidden flex items-center justify-center rounded-t-[14px] p-2">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            className="h-full w-full object-contain object-center block group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
            }}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-[var(--text-sub,#B5BDC6)] bg-[var(--surface-bg,#465362)]/30">
            <ImageIcon className="h-10 w-10 mb-1 opacity-60" />
            <span className="text-[11px]">Nincs kép</span>
          </div>
        )}

        {/* Category Pill Overlay */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--card-bg,#3A4551)]/95 text-[var(--color-primary-blue,#2563EB)] backdrop-blur border border-[var(--border-color,#56616D)] shadow">
            <Tag className="h-3 w-3" />
            {categoryName}
          </span>
        </div>

        {/* Quick Actions (Edit & QR) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItemId(item.id);
            }}
            className="p-2 rounded-full bg-[var(--card-bg,#3A4551)]/95 text-[var(--text-sub,#B5BDC6)] hover:text-slate-950 hover:bg-[var(--status-warning,#F59E0B)] backdrop-blur border border-[var(--border-color,#56616D)] transition-all shadow"
            title={language === 'hu' ? 'QR-kód azonosító' : 'QR Code'}
          >
            <QrCode className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleEdit}
            className="p-2 rounded-full bg-[var(--card-bg,#3A4551)]/95 text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--color-primary-blue,#2563EB)] backdrop-blur border border-[var(--border-color,#56616D)] transition-all shadow"
            title={t('edit_thing')}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Condition Tag & Photo Count Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border pointer-events-auto ${getConditionColor(item.condition)}`}>
            {getConditionLabel(item.condition)}
          </span>

          {(item.additional_photos && item.additional_photos.length > 0) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--card-bg,#3A4551)]/95 text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] backdrop-blur pointer-events-auto">
              <ImageIcon className="h-3 w-3" />
              {1 + item.additional_photos.length}
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors line-clamp-1">
          {item.name}
        </h3>

        {/* Location Path */}
        <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--text-sub,#B5BDC6)] truncate">
          <MapPin className="h-3.5 w-3.5 text-[var(--color-primary-blue,#2563EB)] flex-shrink-0" />
          <span className="truncate">{locationPath}</span>
        </div>

        {/* Footer Metrics */}
        <div className="mt-4 pt-3 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-sub,#B5BDC6)] block">{t('current_value')}</span>
            <span className="text-base font-extrabold text-[var(--status-success,#34D399)]">
              {language === 'hu' ? `${displayValue.toLocaleString('hu-HU')} Ft` : `€${displayValue.toLocaleString('en-US')}`}
            </span>
          </div>

          {item.warranty_end && (
            <div className="text-right">
              <span className="text-[10px] text-[var(--status-success,#34D399)] font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> {t('warranty_active')}
              </span>
              <span className="block text-[10px] text-[var(--text-sub,#B5BDC6)] font-mono">
                {new Date(item.warranty_end).getFullYear()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
