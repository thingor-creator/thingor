import React, { useState, useEffect } from 'react';
import type { MarketplaceListing, ListingType, RentalPeriodUnit } from '../../types/marketplace';
import type { Item } from '../../types';
import { createListing, updateListing, normalizeDbCondition, getConditionDisplayLabel } from '../../lib/marketplace';
import { uploadFileToR2, getR2FileSignedUrl, validateMarketplaceImageOrigin } from '../../lib/r2';
import { useApp } from '../../context/AppContext';
import {
  X,
  Upload,
  Trash2,
  MapPin,
  AlertTriangle,
  Loader2,
  Package,
  Layers,
} from 'lucide-react';

interface CreateEditListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing?: MarketplaceListing | null;
  initialItem?: Item | null;
  onSaved: (savedListing: MarketplaceListing) => void;
}

export const CreateEditListingModal: React.FC<CreateEditListingModalProps> = ({
  isOpen,
  onClose,
  listing,
  initialItem,
  onSaved,
}) => {
  const { user, items, language, categories, locations } = useApp();
  const isHu = language === 'hu';

  // Form Fields
  const [title, setTitle] = useState('');
  const [listingType, setListingType] = useState<ListingType>('sale');
  const [categoryId, setCategoryId] = useState('Elektronika');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'fair' | 'parts'>('good');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState('HUF');
  const [rentalPeriodUnit, setRentalPeriodUnit] = useState<RentalPeriodUnit>('day');
  const [rentalDeposit, setRentalDeposit] = useState<string>('');
  const [barterDescription, setBarterDescription] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [description, setDescription] = useState('');
  const [hasWarranty, setHasWarranty] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [sourceItemId, setSourceItemId] = useState<string | undefined>(undefined);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  const isEditMode = Boolean(listing?.id);

  // Safe import from user's inventory
  const handleImportItem = async (item: Item) => {
    setTitle(item.name || '');

    // Description: prioritize description, combine with notes if present
    const descParts: string[] = [];
    if (item.description && item.description.trim()) {
      descParts.push(item.description.trim());
    }
    if (item.notes && item.notes.trim()) {
      descParts.push(item.notes.trim());
    }
    setDescription(descParts.join('\n\n'));

    // Category mapping: resolve name from ID if needed and match to allowed options
    const matchedCategory = categories.find((c) => c.id === item.category_id || c.name === item.category_id);
    const catName = matchedCategory ? matchedCategory.name : (item.category_id || '');
    const validCategories = [
      'Elektronika',
      'Szerszámok',
      'Otthon & Háztartás',
      'Kert',
      'Járművek',
      'Sport & Szabadidő',
      'Könyvek',
      'Gyűjtemények',
      'Ruházat',
      'Háztartási gépek',
      'Egyéb tárgyak',
    ];
    const foundCategory = validCategories.find(c => c.toLowerCase() === catName.toLowerCase());
    setCategoryId(foundCategory || 'Egyéb tárgyak');

    // Condition mapping to DB enum
    if (item.condition) {
      setCondition(normalizeDbCondition(item.condition));
    }

    // Price mapping: check current_value then purchase_price
    const priceVal = item.current_value || item.purchase_price;
    if (priceVal !== undefined && priceVal !== null && !isNaN(priceVal)) {
      setPrice(String(priceVal));
    }

    // Warranty: check if warranty_end is in future
    if (item.warranty_end) {
      const isStillValid = new Date(item.warranty_end).getTime() > Date.now();
      setHasWarranty(isStillValid);
    } else {
      setHasWarranty(false);
    }

    setSourceItemId(item.id);

    // Location: prefill from item location if set
    if (item.location_id) {
      const loc = locations.find((l) => l.id === item.location_id);
      if (loc && loc.name) {
        setLocationRegion(loc.name);
      }
    }

    // Safely import all available photos from item
    const photosToImport = [item.photo_url, ...(item.additional_photos || [])].filter(Boolean) as string[];
    const importedUrls: string[] = [];
    for (const rawPhoto of photosToImport) {
      try {
        const fullUrl = await getR2FileSignedUrl(rawPhoto);
        const targetUrl = fullUrl || rawPhoto;
        if (user) {
          const validation = validateMarketplaceImageOrigin(targetUrl, user.id);
          if (validation.valid) {
            importedUrls.push(targetUrl);
          }
        } else {
          importedUrls.push(targetUrl);
        }
      } catch {
        // Skip photo if not compliant
      }
    }
    if (importedUrls.length > 0) {
      setImages(importedUrls);
    }

    setShowInventoryPicker(false);
  };

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsSubmitting(false);
      setIsUploading(false);
      setShowInventoryPicker(false);
      return;
    }

    if (listing) {
      setTitle(listing.title || '');
      setListingType(listing.listing_type || 'sale');
      setCategoryId(listing.category_id || 'Elektronika');
      setCondition(normalizeDbCondition(listing.condition));
      setPrice(listing.price !== null && listing.price !== undefined ? String(listing.price) : '');
      setCurrency(listing.currency || 'HUF');
      setRentalPeriodUnit((listing.rental_period_unit as RentalPeriodUnit) || 'day');
      setRentalDeposit(listing.rental_deposit !== null && listing.rental_deposit !== undefined ? String(listing.rental_deposit) : '');
      setBarterDescription(listing.barter_description || '');
      setLocationRegion(listing.location_region || 'Országos / Foxpost');
      setDescription(listing.description || '');
      setHasWarranty(Boolean(listing.has_warranty));
      setHasInvoice(Boolean(listing.has_invoice));
      setImages(listing.images ? listing.images.map((i) => i.image_url) : []);
      setSourceItemId(listing.source_item_id);
    } else if (initialItem) {
      handleImportItem(initialItem);
    } else {
      setTitle('');
      setListingType('sale');
      setCategoryId('Elektronika');
      setCondition('good');
      setPrice('');
      setCurrency('HUF');
      setRentalPeriodUnit('day');
      setRentalDeposit('');
      setBarterDescription('');
      setLocationRegion((user as any)?.location_region || 'Országos / Foxpost');
      setDescription('');
      setHasWarranty(false);
      setHasInvoice(false);
      setImages([]);
      setSourceItemId(undefined);
    }
  }, [isOpen, listing, initialItem]);

  if (!isOpen) return null;

  // Multi-image upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setError(null);
    setIsUploading(true);

    try {
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 15MB limit check
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(isHu ? `A(z) ${file.name} fájl mérete meghaladja a 15 MB-ot.` : `File ${file.name} exceeds 15MB limit.`);
        }

        // Upload to public photos bucket
        const uploadRes = await uploadFileToR2(file, 'photos', user.id);
        if (uploadRes.error) {
          throw new Error(uploadRes.error);
        }

        const rawUrl = uploadRes.signedUrl || uploadRes.path;
        if (!rawUrl) {
          throw new Error(isHu ? 'Nem sikerült megszerezni a kép URL-jét.' : 'Failed to retrieve image URL.');
        }

        const fullUrl = await getR2FileSignedUrl(rawUrl);

        // Validate marketplace image origin
        const validation = validateMarketplaceImageOrigin(fullUrl, user.id);
        if (!validation.valid) {
          throw new Error(
            isHu
              ? `Biztonsági hiba: A kép forrása nem engedélyezett (${validation.error || ''})`
              : `Security error: Image origin rejected (${validation.error || ''})`
          );
        }

        newUrls.push(fullUrl);
      }

      setImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setError(err?.message || (isHu ? 'Hiba történt a kép feltöltése során' : 'Error uploading image'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setImages((prev) => {
      const primary = prev[indexToPrimary];
      const others = prev.filter((_, idx) => idx !== indexToPrimary);
      return [primary, ...others];
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(isHu ? 'A hirdetés címe kötelező!' : 'Listing title is required!');
      return;
    }

    let parsedPrice: number | undefined = undefined;
    if (listingType === 'sale' || listingType === 'rent') {
      parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setError(isHu ? 'Kérjük, adj meg érvényes árat!' : 'Please enter a valid price!');
        return;
      }
    }

    let parsedDeposit: number | undefined = undefined;
    if (listingType === 'rent' && rentalDeposit) {
      parsedDeposit = Number(rentalDeposit);
      if (isNaN(parsedDeposit) || parsedDeposit < 0) {
        setError(isHu ? 'Kérjük, adj meg érvényes kauciót!' : 'Please enter a valid deposit amount!');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && listing) {
        const res = await updateListing(listing.id, {
          title: title.trim(),
          listing_type: listingType,
          category_id: categoryId,
          condition,
          price: parsedPrice,
          currency,
          rental_period_unit: listingType === 'rent' ? rentalPeriodUnit : undefined,
          rental_deposit: parsedDeposit,
          barter_description: listingType === 'barter' ? barterDescription.trim() : undefined,
          location_region: locationRegion.trim() || undefined,
          description: description.trim() || undefined,
          has_warranty: hasWarranty,
          has_invoice: hasInvoice,
          images,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || (isHu ? 'Nem sikerült menteni a módosításokat' : 'Failed to update listing'));
        }

        onSaved(res.data);
        onClose();
      } else {
        const res = await createListing({
          title: title.trim(),
          listing_type: listingType,
          category_id: categoryId,
          condition,
          price: parsedPrice,
          currency,
          rental_period_unit: listingType === 'rent' ? rentalPeriodUnit : undefined,
          rental_deposit: parsedDeposit,
          barter_description: listingType === 'barter' ? barterDescription.trim() : undefined,
          location_region: locationRegion.trim() || undefined,
          description: description.trim() || undefined,
          has_warranty: hasWarranty,
          has_invoice: hasInvoice,
          source_item_id: sourceItemId,
          images,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || (isHu ? 'Nem sikerült létrehozni a hirdetést' : 'Failed to create listing'));
        }

        onSaved(res.data);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || (isHu ? 'Hiba történt a mentéskor' : 'Error saving listing'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventoryItems = items.filter((i) =>
    i.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    i.category_id?.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[16px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden text-[var(--text-main,#E0E3E6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">
              {isEditMode
                ? (isHu ? 'Hirdetés szerkesztése' : 'Edit Listing')
                : (isHu ? 'Új piactéri hirdetés' : 'New Marketplace Listing')}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-[10px] bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Import from Inventory Banner (Create mode only) */}
          {!isEditMode && (
            <div className="p-3.5 rounded-[12px] bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    {isHu ? 'Leltárban lévő tárgy hirdetése' : 'List an item from your inventory'}
                  </span>
                  <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                    {isHu
                      ? 'Átmásolhatod a nyilvános adatokat saját tárgyaid közül.'
                      : 'Easily import public details from your existing inventory.'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInventoryPicker(true)}
                className="shrink-0 px-3 py-1.5 rounded-[8px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                {isHu ? 'Kiválasztás...' : 'Select item...'}
              </button>
            </div>
          )}

          {/* Listing Type Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
              {isHu ? 'Hirdetés típusa' : 'Listing Type'}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { type: 'sale', label: isHu ? 'Eladás' : 'Sale' },
                { type: 'rent', label: isHu ? 'Bérlés' : 'Rent' },
                { type: 'barter', label: isHu ? 'Csere' : 'Barter' },
                { type: 'share', label: isHu ? 'Megosztás' : 'Share' },
                { type: 'free', label: isHu ? 'Ingyen' : 'Free' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setListingType(opt.type as ListingType)}
                  className={`py-2 px-2.5 rounded-[10px] text-xs font-bold text-center border transition-all ${
                    listingType === opt.type
                      ? 'bg-[var(--color-primary-blue,#2563EB)] border-[var(--color-primary-blue,#2563EB)] text-white shadow'
                      : 'bg-[var(--surface-bg,#465362)]/60 border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
              {isHu ? 'Megnevezés / Cím *' : 'Listing Title *'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHu ? 'Pl.: Makita akkus fúró-csavarozó 18V kofferben' : 'e.g.: Makita 18V Cordless Drill in case'}
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-sm text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
            />
          </div>

          {/* Category & Condition Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Kategória' : 'Category'}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              >
                {[
                  'Elektronika',
                  'Szerszámok',
                  'Otthon & Háztartás',
                  'Kert',
                  'Járművek',
                  'Sport & Szabadidő',
                  'Könyvek',
                  'Gyűjtemények',
                  'Ruházat',
                  'Háztartási gépek',
                  'Egyéb tárgyak',
                ].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Állapot' : 'Condition'}
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(normalizeDbCondition(e.target.value))}
                className="w-full px-3 py-2 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              >
                <option value="new">{isHu ? 'Új (bontatlan / sosem használt)' : 'New'}</option>
                <option value="like_new">{isHu ? 'Újszerű / Kiváló (hibátlan)' : 'Like New / Excellent'}</option>
                <option value="good">{isHu ? 'Jó állapotú (normál használat)' : 'Good'}</option>
                <option value="fair">{isHu ? 'Használt (megkímélt / esztétikai hiba)' : 'Fair'}</option>
                <option value="parts">{isHu ? 'Alkatrésznek / Kopott' : 'For Parts / Poor'}</option>
              </select>
            </div>
          </div>

          {/* Pricing fields depending on listingType */}
          {(listingType === 'sale' || listingType === 'rent') && (
            <div className="p-4 rounded-[12px] bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                    {listingType === 'rent'
                      ? (isHu ? 'Bérleti díj *' : 'Rental Rate *')
                      : (isHu ? 'Vételár *' : 'Price *')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-sm text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                    {isHu ? 'Pénznem' : 'Currency'}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="HUF">HUF (Ft)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {listingType === 'rent' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-color,#56616D)]/40">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Bérleti időegység' : 'Rental Period'}
                    </label>
                    <select
                      value={rentalPeriodUnit}
                      onChange={(e) => setRentalPeriodUnit(e.target.value as 'day' | 'month')}
                      className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    >
                      <option value="day">{isHu ? 'Naponta (/nap)' : 'Daily (/day)'}</option>
                      <option value="month">{isHu ? 'Havonta (/hó)' : 'Monthly (/month)'}</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Kaució (opcionális)' : 'Security Deposit (optional)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={rentalDeposit}
                      onChange={(e) => setRentalDeposit(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barter Description */}
          {listingType === 'barter' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Mire cserélnéd el? (csereigény leírása)' : 'What would you trade for?'}
              </label>
              <input
                type="text"
                value={barterDescription}
                onChange={(e) => setBarterDescription(e.target.value)}
                placeholder={isHu ? 'Pl.: Akkumulátoros fűkasza vagy kerti szivattyú érdekel' : 'e.g.: Cordless lawn trimmer or garden pump'}
                className="w-full px-3.5 py-2.5 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-sm text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
            </div>
          )}

          {/* Location Region */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              {isHu ? 'Helyszín / Régió (átadás helye)' : 'Location / Region'}
            </label>
            <input
              type="text"
              value={locationRegion}
              onChange={(e) => setLocationRegion(e.target.value)}
              placeholder={isHu ? 'Pl.: Budapest, XI. kerület (vagy Foxpost csomagautomata)' : 'e.g.: Budapest, 11th district'}
              className="w-full px-3.5 py-2 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
              {isHu ? 'Részletes leírás' : 'Full Description'}
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isHu ? 'Írd le a tárgy műszaki adatait, tartozékait, használati előzményeit...' : 'Describe specifications, accessories, history...'}
              className="w-full p-3 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] resize-y"
            />
          </div>

          {/* Checkboxes: Warranty / Invoice */}
          <div className="flex flex-wrap items-center gap-5 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[var(--text-main,#E0E3E6)]">
              <input
                type="checkbox"
                checked={hasWarranty}
                onChange={(e) => setHasWarranty(e.target.checked)}
                className="rounded border-[var(--border-color,#56616D)] text-blue-600 focus:ring-0"
              />
              <span>{isHu ? 'Érvényes garancia' : 'Valid warranty'}</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[var(--text-main,#E0E3E6)]">
              <input
                type="checkbox"
                checked={hasInvoice}
                onChange={(e) => setHasInvoice(e.target.checked)}
                className="rounded border-[var(--border-color,#56616D)] text-blue-600 focus:ring-0"
              />
              <span>{isHu ? 'Számla rendelkezésre áll' : 'Invoice available'}</span>
            </label>
          </div>

          {/* Photos Upload & Thumbnails */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-color,#56616D)]/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {isHu ? 'Fotók feltöltése (max 15 MB/kép)' : 'Photos (max 15MB each)'}
              </label>
              <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                {images.length} {isHu ? 'csatolt fotó' : 'photos'}
              </span>
            </div>

            {/* Images grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-[10px] overflow-hidden border border-[var(--border-color,#56616D)] aspect-square bg-[var(--surface-bg,#465362)]"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />

                  {/* Primary indicator */}
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow">
                      {isHu ? 'Fő fotó' : 'Primary'}
                    </span>
                  )}

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500 text-[10px]"
                        title={isHu ? 'Beállítás fő fotóként' : 'Set as primary'}
                      >
                        ★
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 rounded bg-rose-600 text-white hover:bg-rose-500"
                      title={isHu ? 'Törlés' : 'Remove'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload Button */}
              <label className="flex flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)] cursor-pointer aspect-square bg-[var(--surface-bg,#465362)]/30 hover:bg-[var(--surface-bg,#465362)]/60 transition-all p-2 text-center">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-[var(--text-sub,#B5BDC6)] mb-1" />
                    <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] leading-tight">
                      {isHu ? '+ Fotó hozzáadása' : '+ Add photo'}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color,#56616D)]">
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
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isHu ? 'Mentés...' : 'Saving...'}</span>
                </>
              ) : (
                <span>
                  {isEditMode
                    ? (isHu ? 'Módosítások mentése' : 'Save Changes')
                    : (isHu ? 'Hirdetés közzététele' : 'Publish Listing')}
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Inventory Item Picker Drawer / Submodal */}
        {showInventoryPicker && (
          <div className="absolute inset-0 z-20 bg-[var(--card-bg,#3A4551)] flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/80">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">
                  {isHu ? 'Válassz egy tárgyat a leltáradból' : 'Select an item from your inventory'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInventoryPicker(false)}
                className="p-1 text-[var(--text-sub,#B5BDC6)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-[var(--border-color,#56616D)]/50">
              <input
                type="text"
                placeholder={isHu ? 'Keresés a leltárban...' : 'Search inventory...'}
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredInventoryItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Nincs megjeleníthető tárgy a leltáradban.' : 'No items found in your inventory.'}
                </div>
              ) : (
                filteredInventoryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleImportItem(item)}
                    className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)]/70 hover:border-blue-500 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt="" className="w-12 h-12 rounded-[8px] object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-[8px] bg-[var(--card-bg,#3A4551)] flex items-center justify-center text-[var(--text-sub,#B5BDC6)]">
                          <Package className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                          {(categories.find(c => c.id === item.category_id)?.name || item.category_id || (isHu ? 'Általános' : 'General'))} • {getConditionDisplayLabel(item.condition, isHu)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 rounded-[6px] bg-blue-600 text-white text-[11px] font-semibold"
                    >
                      {isHu ? 'Kiválaszt' : 'Select'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
