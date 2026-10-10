import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { SharedItemViewData } from '../types';
import { ShieldCheck, Tag, Calendar, DollarSign, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface SharedItemViewProps {
  token: string;
}

export const SharedItemView: React.FC<SharedItemViewProps> = ({ token }) => {
  const { getSharedItemByToken, siteSettings } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedItem, setSharedItem] = useState<SharedItemViewData | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSharedItem() {
      setLoading(true);
      const result = await getSharedItemByToken(token);
      if (!isMounted) return;
      setLoading(false);
      if (result.success && result.data) {
        setSharedItem(result.data);
        setSelectedPhoto(result.data.photo_url || null);
      } else {
        setError(result.error || 'Ez a megosztási link már nem érhető el.');
      }
    }
    loadSharedItem();
    return () => { isMounted = false; };
  }, [token, getSharedItemByToken]);

  const getPurposeBadge = (purpose: string) => {
    switch (purpose) {
      case 'sale':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Eladó Tárgy
          </span>
        );
      case 'loan':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Kölcsönadott Tárgy
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Megosztott Adatlap
          </span>
        );
    }
  };

  const getConditionColor = (cond: string) => {
    switch (cond) {
      case 'New': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Excellent': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'Good': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Fair': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm font-medium">Megosztott tárgy betöltése...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedItem) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Megosztási hivatkozás nem érhető el</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {error || 'Ez a megosztási link lejárt, visszavonásra került, vagy nem létezik.'}
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Vissza a kezdőlapra
          </a>
        </div>
      </div>
    );
  }

  const allPhotos = [
    ...(sharedItem.photo_url ? [sharedItem.photo_url] : []),
    ...(sharedItem.additional_photos || []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Minimal Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={siteSettings.logo_url || '/logo.png'}
              alt={siteSettings.site_name || 'Thingor'}
              className="w-9 h-9 rounded-xl object-contain bg-slate-900 p-1 border border-slate-800 shadow-md"
            />
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">{siteSettings.site_name || 'THINGOR'}</span>
              <span className="text-xs text-slate-400 block -mt-1 font-medium">Megosztott Tárgyadatlap</span>
            </div>
          </div>
          {getPurposeBadge(sharedItem.purpose)}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Photo Gallery Section */}
          {allPhotos.length > 0 && (
            <div className="bg-slate-950/60 p-4 border-b border-slate-800">
              <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/80 relative">
                <img
                  src={selectedPhoto || allPhotos[0]}
                  alt={sharedItem.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {allPhotos.length > 1 && (
                <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPhoto(photo)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                        selectedPhoto === photo ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Item Details Section */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{sharedItem.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getConditionColor(sharedItem.condition)}`}>
                    Állapot: {sharedItem.condition}
                  </span>
                  {sharedItem.expires_at && (
                    <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/50 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Lejárat: {new Date(sharedItem.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {sharedItem.description && (
              <div className="bg-slate-950/40 rounded-2xl p-5 border border-slate-800/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tárgy leírása</h3>
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {sharedItem.description}
                </p>
              </div>
            )}

            {/* Allowed Optional Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {sharedItem.purchase_date && (
                <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Vásárlás dátuma</span>
                    <span className="text-sm font-semibold text-slate-100">{sharedItem.purchase_date}</span>
                  </div>
                </div>
              )}

              {(sharedItem.warranty_start || sharedItem.warranty_end) && (
                <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Garancia érvényesség</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {sharedItem.warranty_end ? `Érvényes: ${sharedItem.warranty_end}-ig` : 'Aktív garancia'}
                    </span>
                  </div>
                </div>
              )}

              {sharedItem.purchase_price !== undefined && (
                <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Vásárlási ár</span>
                    <span className="text-sm font-semibold text-slate-100">${sharedItem.purchase_price}</span>
                  </div>
                </div>
              )}

              {sharedItem.current_value !== undefined && (
                <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Jelenlegi becsült érték</span>
                    <span className="text-sm font-semibold text-slate-100">${sharedItem.current_value}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>Powered by Thingor Platform – Biztonságos Tárgy- és Dokumentumkezelés</p>
      </footer>
    </div>
  );
};
