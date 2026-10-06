import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { ItemCondition } from '../types';
import {
  X,
  Package,
  Link as LinkIcon,
  Upload,
  Loader2
} from 'lucide-react';
import { uploadFileToStorage } from '../lib/storage';

export const ItemFormModal: React.FC = () => {
  const {
    isAddEditItemModalOpen,
    setIsAddEditItemModalOpen,
    editingItem,
    addItem,
    updateItem,
    categories,
    locations,
    addLocation,
    getLocationPath,
    getCategoryName,
    user,
    language
  } = useApp();

  const isHu = language === 'hu';

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [storeSeller, setStoreSeller] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Good');
  const [status, setStatus] = useState<ItemStatus>('Working');
  const [ownershipScope, setOwnershipScope] = useState<ItemOwnershipScope>('private');
  const [warrantyStart, setWarrantyStart] = useState('');
  const [warrantyEnd, setWarrantyEnd] = useState('');
  const [notes, setNotes] = useState('');

  // Quick inline creation for location/category if missing
  const [newLocName, setNewLocName] = useState('');
  const [showAddLoc, setShowAddLoc] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      setDescription(editingItem.description || '');
      setCategoryId(editingItem.category_id || (categories[0]?.id || ''));
      setLocationId(editingItem.location_id || (locations[0]?.id || ''));
      setPhotoUrl(editingItem.photo_url || '');
      setPurchaseDate(editingItem.purchase_date || '');
      setPurchasePrice(editingItem.purchase_price ? String(editingItem.purchase_price) : '');
      setCurrentValue(editingItem.current_value ? String(editingItem.current_value) : '');
      setStoreSeller(editingItem.store_seller || '');
      setCondition(editingItem.condition || 'Good');
      setStatus(editingItem.status || 'Working');
      setOwnershipScope(editingItem.ownership_scope || 'private');
      setWarrantyStart(editingItem.warranty_start || '');
      setWarrantyEnd(editingItem.warranty_end || '');
      setNotes(editingItem.notes || '');
    } else {
      // Defaults for new item
      setName('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      setLocationId(locations[0]?.id || '');
      setPhotoUrl('');
      setPurchaseDate('');
      setPurchasePrice('');
      setCurrentValue('');
      setStoreSeller('');
      setCondition('Good');
      setStatus('Working');
      setOwnershipScope('private');
      setWarrantyStart('');
      setWarrantyEnd('');
      setNotes('');
    }
  }, [editingItem, isAddEditItemModalOpen, categories, locations]);

  if (!isAddEditItemModalOpen) return null;

  const handleClose = () => {
    setIsAddEditItemModalOpen(false);
  };

  const handleQuickAddLoc = async () => {
    if (!newLocName.trim()) return;
    const created = await addLocation(newLocName);
    setLocationId(created.id);
    setNewLocName('');
    setShowAddLoc(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const itemPayload = {
      name,
      description: description.trim() || undefined,
      category_id: categoryId || categories[0]?.id || 'cat-11',
      location_id: locationId || locations[0]?.id || 'loc-1',
      photo_url: photoUrl.trim() || undefined,
      purchase_date: purchaseDate || undefined,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
      current_value: currentValue ? parseFloat(currentValue) : (purchasePrice ? parseFloat(purchasePrice) : undefined),
      store_seller: storeSeller.trim() || undefined,
      condition,
      status,
      ownership_scope: ownershipScope,
      warranty_start: warrantyStart || undefined,
      warranty_end: warrantyEnd || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingItem) {
      await updateItem(editingItem.id, itemPayload);
    } else {
      await addItem(itemPayload);
    }

    handleClose();
  };

  // Sample photo presets for quick testing
  const PHOTO_PRESETS = [
    { label: isHu ? 'Fúró gép' : 'Drill / Power Tool', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80' },
    { label: isHu ? 'Laptop / PC' : 'Laptop / PC', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80' },
    { label: isHu ? 'Kerékpár' : 'Bicycle', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80' },
    { label: isHu ? 'Fejhallgató' : 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' },
  ];

  const CONDITION_OPTIONS: { value: ItemCondition; labelHu: string; labelEn: string }[] = [
    { value: 'New', labelHu: 'Új', labelEn: 'New' },
    { value: 'Excellent', labelHu: 'Kiváló', labelEn: 'Excellent' },
    { value: 'Good', labelHu: 'Jó', labelEn: 'Good' },
    { value: 'Fair', labelHu: 'Elfogadható', labelEn: 'Fair' },
    { value: 'Poor', labelHu: 'Gyenge', labelEn: 'Poor' },
    { value: 'Broken', labelHu: 'Hibás / Törött', labelEn: 'Broken' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingItem
                  ? (isHu ? 'Tárgy Szerkesztése' : 'Edit Thing')
                  : (isHu ? '+ Új Tárgy Hozzáadása' : '+ Add New Thing')}
              </h2>
              <p className="text-xs text-slate-400">
                {isHu
                  ? 'Rögzítsd a tárgy részleteit, helyszínét, vásárlási és garancia adatait.'
                  : 'Record details, location, purchase data, and warranty info.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">

          {/* SECTION 1: ESSENTIAL DETAILS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {isHu ? '1. Alapadatok' : '1. Basic Information'}
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isHu ? 'Tárgy Neve *' : 'Name *'}
              </label>
              <input
                type="text"
                placeholder={isHu ? 'pl. Makita DHP486 Ütvefúró' : 'e.g. Makita DHP486 Drill'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category & Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Kategória *' : 'Category *'}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{getCategoryName(cat.id)}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    {isHu ? 'Helyszín *' : 'Location *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddLoc(!showAddLoc)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    {isHu ? '+ Új helyszín' : '+ New spot'}
                  </button>
                </div>

                {showAddLoc ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isHu ? 'pl. Garázs polc' : 'e.g. Garage shelf'}
                      value={newLocName}
                      onChange={(e) => setNewLocName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-slate-800 bg-slate-950 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddLoc}
                      className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold"
                    >
                      {isHu ? 'Mentés' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {getLocationPath(loc.id)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Status & Ownership Scope Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Működési Állapot' : 'Operating Status'}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Working">{isHu ? '○ Működik' : 'Working'}</option>
                  <option value="Faulty">{isHu ? '● Hibás' : 'Faulty'}</option>
                  <option value="UnderRepair">{isHu ? '⚙ Javítás alatt' : 'Under Repair'}</option>
                  <option value="Repaired">{isHu ? '✓ Javítva' : 'Repaired'}</option>
                  <option value="Scrapped">{isHu ? '✕ Selejtezve' : 'Scrapped'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Tulajdon / Láthatóság' : 'Ownership / Visibility'}
                </label>
                <select
                  value={ownershipScope}
                  onChange={(e) => setOwnershipScope(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="private">{isHu ? '🔒 Csak én (Saját tárgy)' : 'Private (Only Me)'}</option>
                  <option value="household">{isHu ? '👨‍👩‍👧‍👦 Család (Közös tárgy)' : 'Household (Shared)'}</option>
                </select>
              </div>
            </div>

            {/* Photo URL & Storage File Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isHu ? 'Kép (URL vagy Fájl feltöltés)' : 'Photo (URL or File Upload)'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <label className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer transition-colors ${
                  isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                }`}>
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  ) : (
                    <Upload className="h-4 w-4 text-emerald-400" />
                  )}
                  <span>
                    {isUploadingPhoto
                      ? (isHu ? 'Feltöltés...' : 'Uploading...')
                      : (isHu ? 'Fájl Feltöltése' : 'Upload File')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user?.id) return;
                      setIsUploadingPhoto(true);
                      setPhotoUploadError(null);
                      const res = await uploadFileToStorage(file, 'photos', user.id);
                      setIsUploadingPhoto(false);
                      if (res.error) {
                        setPhotoUploadError(res.error);
                      } else if (res.signedUrl || res.path) {
                        setPhotoUrl(res.signedUrl || res.path || '');
                      }
                    }}
                  />
                </label>
              </div>

              {photoUploadError && (
                <p className="text-[11px] text-rose-400 mt-1 font-medium">{photoUploadError}</p>
              )}

              {/* Sample Photo Presets */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 font-semibold">
                  {isHu ? 'Gyors mintakép:' : 'Quick sample photo:'}
                </span>
                {PHOTO_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(p.url)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-800"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isHu ? 'Leírás (Opcionális)' : 'Description (Optional)'}
              </label>
              <textarea
                rows={2}
                placeholder={isHu ? 'Rövid leírás, tulajdonságok vagy adatlap...' : 'Brief description or spec sheet...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SECTION 2: PURCHASE & VALUATION */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {isHu ? '2. Vásárlási és Érték Adatok' : '2. Purchase & Current Valuation'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Vásárlás Dátuma' : 'Purchase Date'}
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Vételár (€ / Ft)' : 'Purchase Price (€)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="180"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Jelenlegi Becsült Érték (€ / Ft)' : 'Current Value (€)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="180"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Üzlet / Eladó' : 'Store / Seller'}
                </label>
                <input
                  type="text"
                  placeholder={isHu ? 'pl. Praktiker, MediaMarkt, Alza, Helyi bolt...' : 'e.g. Makita Store, Amazon, Local shop'}
                  value={storeSeller}
                  onChange={(e) => setStoreSeller(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Állapot *' : 'Condition *'}
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ItemCondition)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-emerald-500"
                >
                  {CONDITION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {isHu ? opt.labelHu : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: WARRANTY & NOTES */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {isHu ? '3. Garancia és Megjegyzések' : '3. Warranty & Notes'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Garancia Kezdete' : 'Warranty Start'}
                </label>
                <input
                  type="date"
                  value={warrantyStart}
                  onChange={(e) => setWarrantyStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isHu ? 'Garancia Lejárata' : 'Warranty Expiration'}
                </label>
                <input
                  type="date"
                  value={warrantyEnd}
                  onChange={(e) => setWarrantyEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isHu ? 'Megjegyzések & Gyári Számok' : 'Notes & Serial Numbers'}
              </label>
              <textarea
                rows={3}
                placeholder={isHu ? 'Gyári szám, szerviz napló, mellékelt tartozékok...' : 'Serial numbers, maintenance logs, accessories included...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-sm focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold"
            >
              {isHu ? 'Mégse' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-950/40"
            >
              {editingItem
                ? (isHu ? 'Módosítások Mentése' : 'Save Changes')
                : (isHu ? 'Tárgy Létrehozása' : 'Create Thing')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
