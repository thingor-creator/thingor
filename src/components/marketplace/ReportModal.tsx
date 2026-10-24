import React, { useState } from 'react';
import type { ReportReason } from '../../types/marketplace';
import { reportListingOrUser } from '../../lib/marketplace';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, X, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId?: string;
  targetUserId?: string;
  targetTitle?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  listingId,
  targetUserId,
  targetTitle,
}) => {
  const { language } = useApp();
  const isHu = language === 'hu';

  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const reasonOptions: { id: ReportReason; label: string; desc: string }[] = [
    {
      id: 'inappropriate',
      label: isHu ? 'Nem megfelelő tartalom' : 'Inappropriate content',
      desc: isHu ? 'Trágár, sértő vagy a közösségi irányelvekbe ütköző' : 'Offensive, vulgar or violates guidelines',
    },
    {
      id: 'fraudulent',
      label: isHu ? 'Csalás vagy megtévesztés' : 'Fraud or scam',
      desc: isHu ? 'Valótlan hirdetés, gyanús fizetési vagy átvételi kísérlet' : 'Fake listing, suspicious transaction',
    },
    {
      id: 'spam',
      label: isHu ? 'Spam vagy ismételt hirdetés' : 'Spam or duplicates',
      desc: isHu ? 'Tömeges, kéretlen vagy reklám célú bejegyzés' : 'Unsolicited advertising, spam',
    },
    {
      id: 'prohibited_item',
      label: isHu ? 'Tiltott termék / szolgáltatás' : 'Prohibited item',
      desc: isHu ? 'Törvénybe vagy szabályzatba ütköző tárgy (pl. fegyver, gyógyszer)' : 'Illegal or prohibited item',
    },
    {
      id: 'harassment',
      label: isHu ? 'Zaklatás vagy fenyegetés' : 'Harassment or threat',
      desc: isHu ? 'Sértő üzenetek, zaklató magatartás' : 'Hostile or threatening behavior',
    },
    {
      id: 'other',
      label: isHu ? 'Egyéb probléma' : 'Other reason',
      desc: isHu ? 'Kérjük, részletezze a leírásban' : 'Please specify in description',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await reportListingOrUser({
        listing_id: listingId,
        reported_user_id: targetUserId,
        reason,
        description: description.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || (isHu ? 'Hiba történt a bejelentés küldésekor' : 'Failed to submit report'));
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription('');
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.message || (isHu ? 'Nem sikerült elküldeni a bejelentést' : 'Could not submit report'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-[16px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden p-6 text-[var(--text-main,#E0E3E6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isHu ? 'Tartalom vagy felhasználó jelentése' : 'Report Content or User'}
            </h3>
            {targetTitle && (
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] truncate max-w-[280px]">
                {targetTitle}
              </p>
            )}
          </div>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            <h4 className="text-base font-bold text-white">
              {isHu ? 'Köszönjük a bejelentést!' : 'Thank you for your report!'}
            </h4>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-xs">
              {isHu
                ? 'A moderátoraink felülvizsgálják az esetet és szükség esetén megteszik a megfelelő lépéseket.'
                : 'Our moderators will review this case and take appropriate action.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-[10px] bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reasons List */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Válassz okot:' : 'Select a reason:'}
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {reasonOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-[10px] border cursor-pointer transition-all ${
                      reason === opt.id
                        ? 'bg-[var(--color-primary-blue,#2563EB)]/15 border-[var(--color-primary-blue,#2563EB)] text-white'
                        : 'bg-[var(--surface-bg,#465362)]/50 border-[var(--border-color,#56616D)]/50 text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={opt.id}
                      checked={reason === opt.id}
                      onChange={() => setReason(opt.id)}
                      className="mt-0.5 text-[var(--color-primary-blue,#2563EB)] focus:ring-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[var(--text-main,#E0E3E6)] leading-tight">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] leading-snug">
                        {opt.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Részletek (opcionális):' : 'Additional details (optional):'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isHu ? 'Kérjük, írd le röviden a problémát...' : 'Please describe the issue briefly...'}
                className="w-full p-2.5 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] resize-none placeholder:text-[var(--text-sub,#B5BDC6)]/60"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-color,#56616D)]/50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[10px] text-xs font-medium text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors"
              >
                {isHu ? 'Mégse' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isHu ? 'Küldés...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <span>{isHu ? 'Bejelentés elküldése' : 'Submit Report'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
