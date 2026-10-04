import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Item, SharePurpose, SharePermissions, ItemShare } from '../types';
import { Share2, Copy, Check, Trash2, Tag, ShieldCheck, X, Clock } from 'lucide-react';

interface ShareModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ item, isOpen, onClose }) => {
  const { createItemShare, revokeItemShare, getItemShares } = useApp();

  const [purpose, setPurpose] = useState<SharePurpose>('view');
  const [expirationDays, setExpirationDays] = useState<number | null>(7);
  const [permissions, setPermissions] = useState<SharePermissions>({
    include_additional_images: true,
    include_purchase_date: false,
    include_warranty: true,
    include_value: false,
    include_purchase_price: false,
  });

  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeShares, setActiveShares] = useState<ItemShare[]>([]);

  const loadShares = async () => {
    if (item?.id) {
      const shares = await getItemShares(item.id);
      setActiveShares(shares);
    }
  };

  useEffect(() => {
    if (isOpen && item?.id) {
      loadShares();
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const created = await createItemShare(item.id, purpose, expirationDays, permissions);
    setLoading(false);
    if (created) {
      await loadShares();
      copyShareLink(created.token);
    }
  };

  const copyShareLink = (token: string) => {
    const origin = window.location.origin + window.location.pathname;
    const shareUrl = `${origin}#share/${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleRevoke = async (shareId: string) => {
    await revokeItemShare(shareId);
    await loadShares();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tárgy Megosztása</h2>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xs">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create Share Form */}
        <form onSubmit={handleCreateShare} className="space-y-5">
          {/* Purpose Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Megosztási cél
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { id: 'view', label: 'Megtekintés', icon: ShieldCheck },
                { id: 'sale', label: 'Eladás', icon: Tag },
                { id: 'loan', label: 'Kölcsönadás', icon: Clock },
              ].map(p => {
                const Icon = p.icon;
                const isSelected = purpose === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPurpose(p.id as SharePurpose)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold gap-1.5 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expiration Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Lejárat
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { days: 1, label: '1 nap' },
                { days: 7, label: '7 nap' },
                { days: 30, label: '30 nap' },
                { days: null, label: 'Nincs' },
              ].map(exp => (
                <button
                  key={String(exp.days)}
                  type="button"
                  onClick={() => setExpirationDays(exp.days)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    expirationDays === exp.days
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions / Allowed Fields */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Megosztható adatok (GUEST által látható)
            </label>
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
                <span>Kiegészítő képek</span>
                <input
                  type="checkbox"
                  checked={permissions.include_additional_images}
                  onChange={e => setPermissions({ ...permissions, include_additional_images: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
                <span>Garancia információk</span>
                <input
                  type="checkbox"
                  checked={permissions.include_warranty}
                  onChange={e => setPermissions({ ...permissions, include_warranty: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
                <span>Vásárlás dátuma</span>
                <input
                  type="checkbox"
                  checked={permissions.include_purchase_date}
                  onChange={e => setPermissions({ ...permissions, include_purchase_date: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
                <span>Jelenlegi becsült érték</span>
                <input
                  type="checkbox"
                  checked={permissions.include_value}
                  onChange={e => setPermissions({ ...permissions, include_value: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
                <span>Vásárlási ár</span>
                <input
                  type="checkbox"
                  checked={permissions.include_purchase_price}
                  onChange={e => setPermissions({ ...permissions, include_purchase_price: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              * A privát számlák, dokumentumok, saját fiókadatok és egyéb tárgyak SOHA nem érhetők el a Guest számára.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" /> Megosztási Link Létrehozása
          </button>
        </form>

        {/* Active Shares List */}
        {activeShares.length > 0 && (
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Aktív Megosztások ({activeShares.length})
            </h3>
            <div className="space-y-2">
              {activeShares.map(s => {
                const isCopied = copiedToken === s.token;
                return (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {s.purpose}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {s.expires_at ? `Lejár: ${new Date(s.expires_at).toLocaleDateString()}` : 'Nincs lejárati idő'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] font-mono truncate max-w-xs">
                        {window.location.origin}#share/{s.token.substring(0, 10)}...
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyShareLink(s.token)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Másolva!' : 'Link másolása'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRevoke(s.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        title="Visszavonás"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
