import React, { useState } from 'react';
import type { MarketplaceListing, MarketplaceOffer, OfferType } from '../../types/marketplace';
import { createOffer } from '../../lib/marketplace';
import { useApp } from '../../context/AppContext';
import {
  X,
  HandCoins,
  Repeat,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Package
} from 'lucide-react';

interface MakeOfferModalProps {
  listing: MarketplaceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onOfferCreated?: (offer: MarketplaceOffer) => void;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  listing,
  isOpen,
  onClose,
  onOfferCreated,
}) => {
  const { items, language } = useApp();
  const isHu = language === 'hu';

  const defaultOfferType: OfferType =
    listing?.listing_type === 'rent'
      ? 'rent'
      : listing?.listing_type === 'barter'
      ? 'barter'
      : 'buy';

  const [offerType, setOfferType] = useState<OfferType>(defaultOfferType);
  const [offeredPrice, setOfferedPrice] = useState<string>(
    listing?.price !== null && listing?.price !== undefined ? String(listing.price) : ''
  );
  const [currency] = useState(listing?.currency || 'HUF');
  const [rentalStartDate, setRentalStartDate] = useState('');
  const [rentalEndDate, setRentalEndDate] = useState('');
  const [barterDescription, setBarterDescription] = useState('');
  const [selectedBarterItemId, setSelectedBarterItemId] = useState<string>('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let priceNum: number | undefined = undefined;
    if (offerType === 'buy' || offerType === 'rent') {
      priceNum = Number(offeredPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        setError(isHu ? 'Kérjük, adj meg érvényes ajánlati összeget!' : 'Please enter a valid offer price!');
        return;
      }
    }

    if (offerType === 'rent') {
      if (!rentalStartDate || !rentalEndDate) {
        setError(isHu ? 'Kérjük, válaszd ki a bérlet kezdő és záró dátumát!' : 'Please specify rent start and end dates!');
        return;
      }
      if (new Date(rentalStartDate) > new Date(rentalEndDate)) {
        setError(isHu ? 'A kezdő dátum nem lehet később a záró dátumnál!' : 'Start date must be before end date!');
        return;
      }
    }

    if (offerType === 'barter' && !barterDescription.trim() && !selectedBarterItemId) {
      setError(isHu ? 'Kérjük, írd le a csereajánlatodat vagy válassz egy tárgyat!' : 'Please describe your barter offer or choose an item!');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedItem = items.find((i) => i.id === selectedBarterItemId);
      const combinedBarterDesc = selectedItem
        ? `${selectedItem.name}${barterDescription ? ` — ${barterDescription.trim()}` : ''}`
        : barterDescription.trim() || undefined;

      const res = await createOffer({
        listing_id: listing.id,
        offer_type: offerType,
        offered_price: priceNum,
        currency,
        rental_start_date: rentalStartDate || undefined,
        rental_end_date: rentalEndDate || undefined,
        barter_description: combinedBarterDesc,
        offered_item_id: selectedBarterItemId || undefined,
        message: message.trim() || undefined,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || (isHu ? 'Nem sikerült elküldeni az ajánlatot' : 'Failed to send offer'));
      }

      setSuccess(true);
      onOfferCreated?.(res.data);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.message || (isHu ? 'Hiba történt az ajánlattétel során' : 'Error making offer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-[16px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden p-6 text-[var(--text-main,#E0E3E6)]"
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
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <HandCoins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isHu ? 'Hivatalos ajánlat tétele' : 'Make an Offer'}
            </h3>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)] truncate max-w-[280px]">
              {listing.title}
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            <h4 className="text-base font-bold text-white">
              {isHu ? 'Ajánlat sikeresen elküldve!' : 'Offer sent successfully!'}
            </h4>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-xs">
              {isHu
                ? 'Az eladó értesítést kapott az ajánlatodról, amelyet a beszélgetésben tekinthet meg.'
                : 'The seller has been notified and can view your offer in chat.'}
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

            {/* Offer Type Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOfferType('buy')}
                className={`py-2 rounded-[8px] text-xs font-bold border transition-all ${
                  offerType === 'buy'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                }`}
              >
                {isHu ? 'Vétel' : 'Buy'}
              </button>
              <button
                type="button"
                onClick={() => setOfferType('rent')}
                className={`py-2 rounded-[8px] text-xs font-bold border transition-all ${
                  offerType === 'rent'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                }`}
              >
                {isHu ? 'Bérlés' : 'Rent'}
              </button>
              <button
                type="button"
                onClick={() => setOfferType('barter')}
                className={`py-2 rounded-[8px] text-xs font-bold border transition-all ${
                  offerType === 'barter'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                }`}
              >
                {isHu ? 'Csere' : 'Barter'}
              </button>
            </div>

            {/* Price Input (Buy or Rent) */}
            {(offerType === 'buy' || offerType === 'rent') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                  {offerType === 'rent'
                    ? (isHu ? 'Ajánlott bérleti díj' : 'Offered rental rate')
                    : (isHu ? 'Ajánlott vételár' : 'Offered price')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-sm text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                  <span className="text-xs font-bold text-white px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                    {currency}
                  </span>
                </div>
              </div>
            )}

            {/* Rental Dates (Rent only) */}
            {offerType === 'rent' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isHu ? 'Kezdő dátum' : 'Start date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={rentalStartDate}
                    onChange={(e) => setRentalStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isHu ? 'Visszahozatali dátum' : 'End date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={rentalEndDate}
                    onChange={(e) => setRentalEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>
            )}

            {/* Barter Options */}
            {offerType === 'barter' && (
              <div className="space-y-3">
                {items.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {isHu ? 'Tárgy felajánlása leltáradból (opcionális)' : 'Offer an item from your inventory (optional)'}
                    </label>
                    <select
                      value={selectedBarterItemId}
                      onChange={(e) => setSelectedBarterItemId(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    >
                      <option value="">{isHu ? '— Válassz egy saját tárgyat —' : '— Choose an item —'}</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.category_id || (isHu ? 'Általános' : 'General')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5" />
                    {isHu ? 'Csereajánlat részletezése' : 'Barter details'}
                  </label>
                  <input
                    type="text"
                    value={barterDescription}
                    onChange={(e) => setBarterDescription(e.target.value)}
                    placeholder={isHu ? 'Mit ajánlasz fel cserébe?' : 'What are you offering in exchange?'}
                    className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>
            )}

            {/* Message to seller */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Üzenet az eladónak (opcionális)' : 'Message to seller (optional)'}
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isHu ? 'Pl.: Holnap délelőtt személyesen át tudnám venni...' : 'e.g.: I could pick it up in person tomorrow...'}
                className="w-full p-2.5 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-color,#56616D)]/50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[10px] text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors"
              >
                {isHu ? 'Mégse' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isHu ? 'Küldés...' : 'Sending...'}</span>
                  </>
                ) : (
                  <span>{isHu ? 'Ajánlat elküldése' : 'Send Offer'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
