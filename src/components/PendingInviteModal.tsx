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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-primary-blue,#2563EB)]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header Icon */}
        <div className="flex items-center justify-between">
          <div className="w-14 h-14 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] rounded-2xl border border-[var(--border-color,#56616D)] flex items-center justify-center shadow-md">
            <Mail className="w-7 h-7 animate-bounce" />
          </div>
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {language === 'hu' ? 'Új Meghívás' : 'New Invitation'}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
            {language === 'hu' ? 'Családi Meghívás Érkezett!' : 'Family Household Invite Received!'}
          </h2>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] leading-relaxed">
            {language === 'hu'
              ? 'Meghívást kaptál, hogy csatlakozz a következő közös családi háztartáshoz:'
              : 'You have been invited to join the following family household:'}
          </p>

          <div className="p-4 rounded-2xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-primary-blue,#2563EB)] font-bold text-base">
              <Users className="w-5 h-5 shrink-0" />
              <span>{currentInvite.household_name || (language === 'hu' ? 'Családi Háztartás' : 'Family Household')}</span>
            </div>

            {currentInvite.title && (
              <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                {language === 'hu' ? 'Kijelölt megnevezés / titulus:' : 'Assigned title:'}{' '}
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/40 text-emerald-400 font-semibold border border-emerald-500/40">
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
            className="w-full py-3.5 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 hover:scale-[1.01]"
          >
            <Check className="w-5 h-5" />
            {language === 'hu' ? 'Elfogadom (Csatlakozás a Családhoz)' : 'Accept & Join Family'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDecline}
              disabled={loadingId === currentInvite.id}
              className="py-2.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <X className="w-4 h-4" />
              {language === 'hu' ? 'Elutasítom' : 'Decline'}
            </button>

            <button
              onClick={handleDismissLater}
              className="py-2.5 bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-sub,#B5BDC6)] hover:text-white border border-[var(--border-color,#56616D)] rounded-xl text-xs font-medium transition-all"
            >
              {language === 'hu' ? 'Később' : 'Remind Later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
