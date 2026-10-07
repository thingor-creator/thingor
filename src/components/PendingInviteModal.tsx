import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Check, X, Users, Sparkles } from 'lucide-react';

export const PendingInviteModal: React.FC = () => {
  const { receivedInvites, acceptHouseholdInvite, declineHouseholdInvite, language } = useApp();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const activeInvites = receivedInvites.filter(inv => !dismissedIds.includes(inv.id));

  if (activeInvites.length === 0) return null;

  const currentInvite = activeInvites[0];

  const handleAccept = async () => {
    setLoadingId(currentInvite.id);
    const res = await acceptHouseholdInvite(currentInvite.id);
    setLoadingId(null);
    if (!res.success) {
      alert(res.error);
    }
  };

  const handleDecline = async () => {
    setLoadingId(currentInvite.id);
    await declineHouseholdInvite(currentInvite.id);
    setLoadingId(null);
  };

  const handleDismissLater = () => {
    setDismissedIds(prev => [...prev, currentInvite.id]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-emerald-950/50 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header Icon */}
        <div className="flex items-center justify-between">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Mail className="w-7 h-7 animate-bounce" />
          </div>
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {language === 'hu' ? 'Új Meghívás' : 'New Invitation'}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {language === 'hu' ? 'Családi Meghívás Érkezett!' : 'Family Household Invite Received!'}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {language === 'hu'
              ? 'Meghívást kaptál, hogy csatlakozz a következő közös családi háztartáshoz:'
              : 'You have been invited to join the following family household:'}
          </p>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <Users className="w-5 h-5 shrink-0" />
              <span>{currentInvite.household_name || (language === 'hu' ? 'Családi Háztartás' : 'Family Household')}</span>
            </div>

            {currentInvite.title && (
              <p className="text-xs text-slate-300">
                {language === 'hu' ? 'Kijelölt megnevezés / titulus:' : 'Assigned title:'}{' '}
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {currentInvite.title}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleAccept}
            disabled={loadingId === currentInvite.id}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            {language === 'hu' ? 'Elfogadom (Csatlakozás a Családhoz)' : 'Accept & Join Family'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDecline}
              disabled={loadingId === currentInvite.id}
              className="py-2.5 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-800/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <X className="w-4 h-4" />
              {language === 'hu' ? 'Elutasítom' : 'Decline'}
            </button>

            <button
              onClick={handleDismissLater}
              className="py-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition-all"
            >
              {language === 'hu' ? 'Később' : 'Remind Later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
