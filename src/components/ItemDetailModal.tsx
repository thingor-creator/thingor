import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ItemDocument } from '../types';
import {
  X,
  Edit3,
  Trash2,
  MapPin,
  Tag,
  ShieldCheck,
  FileText,
  Calendar,
  Euro,
  Store,
  Plus,
  AlertTriangle,
  ExternalLink,
  FileCode,
  Image as ImageIcon,
  Upload,
  Loader2,
  Share2,
  CreditCard,
  Wrench,
  Link2,
  Check
} from 'lucide-react';
import { uploadFileToStorage } from '../lib/storage';
import { ShareModal } from './ShareModal';

export const ItemDetailModal: React.FC = () => {
  const {
    selectedItemId,
    setSelectedItemId,
    items,
    documents,
    deleteItem,
    updateItem,
    setEditingItem,
    setIsAddEditItemModalOpen,
    getLocationPath,
    getCategoryName,
    categories,
    locations,
    addDocument,
    deleteDocument,
    repairs,
    financings,
    recordInstallmentPayment,
    addItemRelation,
    deleteItemRelation,
    getItemRelations,
    user,
    language
  } = useApp();

  const isHu = language === 'hu';

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'photos' | 'notes'>('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Inline Editing State for specific fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState<any>('');
  const [inlineSecondValue, setInlineSecondValue] = useState<any>('');
  const [isSavingInline, setIsSavingInline] = useState(false);

  const startInlineEdit = (e: React.MouseEvent, fieldName: string, initialValue: any, initialSecondValue?: any) => {
    e.stopPropagation();
    setEditingField(fieldName);
    setInlineValue(initialValue ?? '');
    if (initialSecondValue !== undefined) {
      setInlineSecondValue(initialSecondValue ?? '');
    }
  };

  const cancelInlineEdit = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setEditingField(null);
    setInlineValue('');
    setInlineSecondValue('');
  };

  const saveInlineField = async (e?: React.SyntheticEvent, fieldName?: string) => {
    if (e) e.stopPropagation();
    const fieldToSave = fieldName || editingField;
    if (!fieldToSave || !item) return;

    setIsSavingInline(true);
    let updates: Record<string, any> = {};

    if (fieldToSave === 'warranty') {
      updates = {
        warranty_start: inlineValue || null,
        warranty_end: inlineSecondValue || null,
      };
    } else if (fieldToSave === 'purchase_price' || fieldToSave === 'current_value') {
      const val = inlineValue !== '' ? parseFloat(inlineValue) : null;
      updates = { [fieldToSave]: val };
    } else {
      updates = { [fieldToSave]: inlineValue || null };
    }

    await updateItem(item.id, updates);
    setIsSavingInline(false);
    setEditingField(null);
  };

  // New Document Upload State
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<ItemDocument['document_type']>('Invoice');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  // New Relation State
  const [isAddRelationOpen, setIsAddRelationOpen] = useState(false);
  const [targetItemIdRelation, setTargetItemIdRelation] = useState('');
  const [relationTypeForm, setRelationTypeForm] = useState<any>('accessory');

  if (!selectedItemId) return null;

  const item = items.find(i => i.id === selectedItemId);
  if (!item) return null;

  const itemDocs = documents.filter(d => d.item_id === item.id);
  const locationPath = getLocationPath(item.location_id);
  const categoryName = getCategoryName(item.category_id);

  const handleDelete = async () => {
    await deleteItem(item.id);
    setSelectedItemId(null);
  };

  const handleEdit = () => {
    setEditingItem(item);
    setIsAddEditItemModalOpen(true);
  };

  const handleAddDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    await addDocument(
      item.id,
      newDocName,
      newDocUrl || '#',
      newDocType
    );

    setNewDocName('');
    setNewDocUrl('');
    setIsAddDocOpen(false);
  };

  // Warranty status calculation
  let warrantyStatus: 'active' | 'expiring' | 'expired' | 'none' = 'none';
  let daysRemaining = 0;

  if (item.warranty_end) {
    const now = new Date();
    const expDate = new Date(item.warranty_end);
    const diffTime = expDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      warrantyStatus = 'expired';
    } else if (daysRemaining <= 30) {
      warrantyStatus = 'expiring';
    } else {
      warrantyStatus = 'active';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">

        {/* Close Button */}
        <button
          onClick={() => setSelectedItemId(null)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header with Hero Banner */}
        <div className="relative border-b border-slate-800 bg-slate-950">
          <div className="flex flex-col md:flex-row gap-6 p-6">

            {/* Main Photo */}
            <div className="h-40 w-full md:w-48 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-800 relative">
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
                  }}
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-600">
                  <ImageIcon className="h-8 w-8 mb-1" />
                  <span className="text-xs">{isHu ? 'Nincs kép' : 'No photo'}</span>
                </div>
              )}
            </div>

            {/* Header Meta */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {/* Category Badge Inline Edit */}
                  {editingField === 'category_id' ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-950 text-white border border-emerald-500 focus:outline-none"
                        autoFocus
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{getCategoryName(cat.id)}</option>
                        ))}
                      </select>
                      <button onClick={(e) => saveInlineField(e, 'category_id')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={(e) => startInlineEdit(e, 'category_id', item.category_id)}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 cursor-pointer hover:border-emerald-500 hover:bg-emerald-900/40 transition-all"
                      title={isHu ? 'Kattints a kategória módosításához' : 'Click to edit category'}
                    >
                      <Tag className="h-3 w-3" />
                      {categoryName}
                    </span>
                  )}

                  {/* Condition Badge Inline Edit */}
                  {editingField === 'condition' ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-950 text-white border border-emerald-500 focus:outline-none"
                        autoFocus
                      >
                        <option value="New">{isHu ? 'Új' : 'New'}</option>
                        <option value="Excellent">{isHu ? 'Kiváló' : 'Excellent'}</option>
                        <option value="Good">{isHu ? 'Jó' : 'Good'}</option>
                        <option value="Fair">{isHu ? 'Elfogadható' : 'Fair'}</option>
                        <option value="Poor">{isHu ? 'Gyenge' : 'Poor'}</option>
                        <option value="Broken">{isHu ? 'Hibás' : 'Broken'}</option>
                      </select>
                      <button onClick={(e) => saveInlineField(e, 'condition')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={(e) => startInlineEdit(e, 'condition', item.condition)}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 cursor-pointer hover:bg-slate-700 hover:text-white transition-all"
                      title={isHu ? 'Kattints az állapot módosításához' : 'Click to edit condition'}
                    >
                      {isHu ? `${item.condition} állapot` : `${item.condition} condition`}
                    </span>
                  )}

                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 ml-auto">
                    <Edit3 className="h-3 w-3 text-emerald-400" />
                    {isHu ? 'Kattints az adatra a gyors szerkesztéshez' : 'Click field for inline edit'}
                  </span>
                </div>

                {/* Name Title Inline Edit */}
                {editingField === 'name' ? (
                  <div className="flex items-center gap-2 my-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      className="text-xl font-extrabold bg-slate-950 border border-emerald-500 text-white rounded-xl px-3 py-1.5 w-full focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveInlineField(e, 'name');
                        if (e.key === 'Escape') cancelInlineEdit(e);
                      }}
                    />
                    <button
                      onClick={(e) => saveInlineField(e, 'name')}
                      disabled={isSavingInline}
                      className="p-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold shrink-0 shadow"
                      title={isHu ? 'Mentés' : 'Save'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelInlineEdit}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white shrink-0"
                      title={isHu ? 'Mégse' : 'Cancel'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'name', item.name)}
                    className="group/title cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-slate-900/80 hover:border hover:border-emerald-500/40 transition-all relative flex items-center justify-between"
                    title={isHu ? 'Kattints a név módosításához' : 'Click to edit name'}
                  >
                    <h2 className="text-2xl font-extrabold text-white tracking-tight group-hover/title:text-emerald-300 transition-colors">
                      {item.name}
                    </h2>
                    <Edit3 className="h-4 w-4 text-emerald-400 opacity-0 group-hover/title:opacity-100 transition-opacity ml-2 shrink-0" />
                  </div>
                )}

                {/* Location Path Inline Edit */}
                {editingField === 'location_id' ? (
                  <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 text-white border border-emerald-500 focus:outline-none"
                      autoFocus
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{getLocationPath(loc.id)}</option>
                      ))}
                    </select>
                    <button onClick={(e) => saveInlineField(e, 'location_id')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'location_id', item.location_id)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer group/loc hover:text-emerald-300 transition-colors"
                    title={isHu ? 'Kattints a helyszín módosításához' : 'Click to edit location'}
                  >
                    <MapPin className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-medium text-slate-300 group-hover/loc:text-emerald-300 transition-colors">{locationPath}</span>
                    <Edit3 className="h-3 w-3 text-emerald-400 opacity-0 group-hover/loc:opacity-100 transition-opacity ml-1" />
                  </div>
                )}
              </div>

              {/* Action Buttons: Edit, Share & Delete */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isHu ? 'Szerkesztés' : 'Edit'}
                </button>

                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-all"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {isHu ? 'Megosztás' : 'Share'}
                </button>

                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                    >
                      {isHu ? 'Törlés megerősítése' : 'Confirm Delete'}
                    </button>
                    <button
                      onClick={() => setIsDeleting(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                    >
                      {isHu ? 'Mégse' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDeleting(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800/60 text-slate-400 text-xs transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isHu ? 'Törlés' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex border-t border-slate-800 px-6 gap-2 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-3 border-b-2 transition-colors ${activeTab === 'overview'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              {isHu ? 'Áttekintés' : 'Overview'}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'documents'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              {isHu ? 'Dokumentumok' : 'Documents'} ({itemDocs.length})
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`py-3 px-3 border-b-2 transition-colors ${activeTab === 'photos'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              {isHu ? 'Fényképek' : 'Photos'} ({(item.additional_photos?.length || 0) + (item.photo_url ? 1 : 0)})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-3 px-3 border-b-2 transition-colors ${activeTab === 'notes'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              {isHu ? 'Megjegyzések' : 'Notes'}
            </button>
          </div>
        </div>

        {/* Modal Body Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: OVERVIEW & WARRANTY (Section 11) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* Description Inline Edit */}
              {editingField === 'description' ? (
                <div className="p-3.5 rounded-xl border border-emerald-500 bg-slate-950 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      {isHu ? 'Leírás szerkesztése' : 'Edit Description'}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button onClick={cancelInlineEdit} className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300">
                        {isHu ? 'Mégse' : 'Cancel'}
                      </button>
                      <button onClick={(e) => saveInlineField(e, 'description')} className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {isHu ? 'Mentés' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={inlineValue}
                    onChange={(e) => setInlineValue(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-sm focus:outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  onClick={(e) => startInlineEdit(e, 'description', item.description || '')}
                  className="group/desc cursor-pointer p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all relative"
                  title={isHu ? 'Kattints a leírás inline szerkesztéséhez' : 'Click to edit description'}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {isHu ? 'Leírás' : 'Description'}
                    </h3>
                    <Edit3 className="h-3.5 w-3.5 text-emerald-400 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.description || <span className="text-slate-500 italic">{isHu ? 'Kattints ide leírás hozzáadásához...' : 'Click to add description...'}</span>}
                  </p>
                </div>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Purchase Date */}
                {editingField === 'purchase_date' ? (
                  <div className="p-3 rounded-xl border border-emerald-500 bg-slate-950 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {isHu ? 'Vásárlás dátuma' : 'Purchase Date'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="w-full p-1 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg"
                        autoFocus
                      />
                      <button onClick={(e) => saveInlineField(e, 'purchase_date')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'purchase_date', item.purchase_date || '')}
                    className="group/spec p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all cursor-pointer relative"
                    title={isHu ? 'Kattints a vásárlási dátum szerkesztéséhez' : 'Click to edit purchase date'}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-emerald-400" /> {isHu ? 'Vásárlás dátuma' : 'Purchase Date'}
                      </span>
                      <Edit3 className="h-3 w-3 text-emerald-400 opacity-0 group-hover/spec:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold text-white mt-1 block">
                      {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString(isHu ? 'hu-HU' : 'en-US') : 'N/A'}
                    </span>
                  </div>
                )}

                {/* Purchase Price */}
                {editingField === 'purchase_price' ? (
                  <div className="p-3 rounded-xl border border-emerald-500 bg-slate-950 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Euro className="h-3.5 w-3.5" /> {isHu ? 'Vételár (Ft)' : 'Purchase Price (€)'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="w-full p-1 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineField(e, 'purchase_price');
                          if (e.key === 'Escape') cancelInlineEdit(e);
                        }}
                      />
                      <button onClick={(e) => saveInlineField(e, 'purchase_price')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'purchase_price', item.purchase_price ?? '')}
                    className="group/spec p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all cursor-pointer relative"
                    title={isHu ? 'Kattints a vételár szerkesztéséhez' : 'Click to edit purchase price'}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Euro className="h-3.5 w-3.5 text-emerald-400" /> {isHu ? 'Vételár' : 'Purchase Price'}
                      </span>
                      <Edit3 className="h-3 w-3 text-emerald-400 opacity-0 group-hover/spec:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold text-white mt-1 block">
                      {item.purchase_price ? (isHu ? `${Number(item.purchase_price).toLocaleString('hu-HU')} Ft` : `€${item.purchase_price}`) : 'N/A'}
                    </span>
                  </div>
                )}

                {/* Current Value */}
                {editingField === 'current_value' ? (
                  <div className="p-3 rounded-xl border border-emerald-500 bg-slate-950 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Euro className="h-3.5 w-3.5" /> {isHu ? 'Jelenlegi érték (Ft)' : 'Current Value (€)'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="w-full p-1 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineField(e, 'current_value');
                          if (e.key === 'Escape') cancelInlineEdit(e);
                        }}
                      />
                      <button onClick={(e) => saveInlineField(e, 'current_value')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'current_value', item.current_value ?? '')}
                    className="group/spec p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all cursor-pointer relative"
                    title={isHu ? 'Kattints a jelenlegi érték szerkesztéséhez' : 'Click to edit current value'}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Euro className="h-3.5 w-3.5 text-emerald-400" /> {isHu ? 'Jelenlegi érték' : 'Current Value'}
                      </span>
                      <Edit3 className="h-3 w-3 text-emerald-400 opacity-0 group-hover/spec:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold text-emerald-400 mt-1 block">
                      {item.current_value ? (isHu ? `${Number(item.current_value).toLocaleString('hu-HU')} Ft` : `€${item.current_value}`) : 'N/A'}
                    </span>
                  </div>
                )}

                {/* Store Seller */}
                {editingField === 'store_seller' ? (
                  <div className="p-3 rounded-xl border border-emerald-500 bg-slate-950 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" /> {isHu ? 'Üzlet / Eladó' : 'Store / Seller'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder={isHu ? 'pl. MediaMarkt' : 'e.g. MediaMarkt'}
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="w-full p-1 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineField(e, 'store_seller');
                          if (e.key === 'Escape') cancelInlineEdit(e);
                        }}
                      />
                      <button onClick={(e) => saveInlineField(e, 'store_seller')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'store_seller', item.store_seller || '')}
                    className="group/spec p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all cursor-pointer relative"
                    title={isHu ? 'Kattints az üzlet szerkesztéséhez' : 'Click to edit store'}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Store className="h-3.5 w-3.5 text-emerald-400" /> {isHu ? 'Üzlet / Eladó' : 'Store / Seller'}
                      </span>
                      <Edit3 className="h-3 w-3 text-emerald-400 opacity-0 group-hover/spec:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-semibold text-white mt-1 block truncate">
                      {item.store_seller || (isHu ? 'Nincs megadva' : 'Unspecified')}
                    </span>
                  </div>
                )}

                {/* Location Path */}
                {editingField === 'location_id' ? (
                  <div className="p-3 rounded-xl border border-emerald-500 bg-slate-950 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {isHu ? 'Helyszín' : 'Location'}
                    </span>
                    <div className="flex items-center gap-1">
                      <select
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="w-full p-1 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg"
                        autoFocus
                      >
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{getLocationPath(loc.id)}</option>
                        ))}
                      </select>
                      <button onClick={(e) => saveInlineField(e, 'location_id')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'location_id', item.location_id)}
                    className="group/spec p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all cursor-pointer relative"
                    title={isHu ? 'Kattints a helyszín szerkesztéséhez' : 'Click to edit location'}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" /> {isHu ? 'Helyszín' : 'Location'}
                      </span>
                      <Edit3 className="h-3 w-3 text-emerald-400 opacity-0 group-hover/spec:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs font-semibold text-white mt-1 block truncate">
                      {locationPath}
                    </span>
                  </div>
                )}

                {/* Condition */}
                {editingField === 'condition' ? (
                  <div className="p-3 rounded-xl border border-emerald-500 bg-slate-950 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> {isHu ? 'Állapot' : 'Condition'}
                    </span>
                    <div className="flex items-center gap-1">
                      <select
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="w-full p-1 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg"
                        autoFocus
                      >
                        <option value="New">{isHu ? 'Új' : 'New'}</option>
                        <option value="Excellent">{isHu ? 'Kiváló' : 'Excellent'}</option>
                        <option value="Good">{isHu ? 'Jó' : 'Good'}</option>
                        <option value="Fair">{isHu ? 'Elfogadható' : 'Fair'}</option>
                        <option value="Poor">{isHu ? 'Gyenge' : 'Poor'}</option>
                        <option value="Broken">{isHu ? 'Hibás' : 'Broken'}</option>
                      </select>
                      <button onClick={(e) => saveInlineField(e, 'condition')} className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startInlineEdit(e, 'condition', item.condition)}
                    className="group/spec p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all cursor-pointer relative"
                    title={isHu ? 'Kattints az állapot szerkesztéséhez' : 'Click to edit condition'}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5 text-emerald-400" /> {isHu ? 'Állapot' : 'Condition'}
                      </span>
                      <Edit3 className="h-3 w-3 text-emerald-400 opacity-0 group-hover/spec:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-bold text-white mt-1 block">
                      {item.condition}
                    </span>
                  </div>
                )}
              </div>

              {/* WARRANTY CARD (Section 11) */}
              {editingField === 'warranty' ? (
                <div className="p-4 rounded-2xl border border-emerald-500 bg-slate-950 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      {isHu ? 'Garanciális Dátumok Szerkesztése' : 'Edit Warranty Dates'}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button onClick={cancelInlineEdit} className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300">
                        {isHu ? 'Mégse' : 'Cancel'}
                      </button>
                      <button onClick={(e) => saveInlineField(e, 'warranty')} className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {isHu ? 'Mentés' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">{isHu ? 'Garancia kezdete' : 'Warranty Start'}</label>
                      <input
                        type="date"
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        className="w-full p-1.5 bg-slate-900 border border-slate-800 text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">{isHu ? 'Garancia lejárata' : 'Warranty End'}</label>
                      <input
                        type="date"
                        value={inlineSecondValue}
                        onChange={(e) => setInlineSecondValue(e.target.value)}
                        className="w-full p-1.5 bg-slate-900 border border-slate-800 text-white rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={(e) => startInlineEdit(e, 'warranty', item.warranty_start || '', item.warranty_end || '')}
                  className="group/war p-4 rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all cursor-pointer space-y-3 relative"
                  title={isHu ? 'Kattints a garancia szerkesztéséhez' : 'Click to edit warranty'}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      {isHu ? 'Garancia információk' : 'Warranty Info'}
                    </h3>

                    {warrantyStatus === 'active' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {isHu ? 'Garancia aktív' : 'Warranty Active'}
                      </span>
                    )}
                    {warrantyStatus === 'expiring' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {isHu ? `Hamarosan lejár (${daysRemaining} nap)` : `Expiring Soon (${daysRemaining} days left)`}
                      </span>
                    )}
                    {warrantyStatus === 'expired' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                        {isHu ? 'Garancia lejárt' : 'Warranty Expired'}
                      </span>
                    )}
                    {warrantyStatus === 'none' && (
                      <span className="text-xs text-slate-500">
                        {isHu ? 'Nincs megadva garanciális dátum' : 'No warranty dates set'}
                      </span>
                    )}
                  </div>

                  {item.warranty_end && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-400 block">{isHu ? 'Garancia kezdete' : 'Warranty Start'}</span>
                        <span className="font-semibold text-white">
                          {item.warranty_start ? new Date(item.warranty_start).toLocaleDateString(isHu ? 'hu-HU' : 'en-US') : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{isHu ? 'Lejárat' : 'Expires'}</span>
                        <span className="font-semibold text-white">
                          {new Date(item.warranty_end).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FINANCING CARD */}
              {(() => {
                const itemFinancing = financings.find(f => f.item_id === item.id);
                if (!itemFinancing) return null;
                const progress = Math.min(100, Math.round((itemFinancing.paid_installments / itemFinancing.total_installments) * 100));

                return (
                  <div className="p-4 rounded-2xl border border-indigo-900/60 bg-indigo-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-indigo-400" />
                        {isHu ? 'Részletfizetés & Finanszírozás' : 'Financing & Installments'}
                      </h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-900 text-indigo-300 font-semibold border border-indigo-700/50">
                        {itemFinancing.provider}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold text-slate-300">
                        <span>{isHu ? 'Törlesztés:' : 'Progress:'}</span>
                        <span className="text-indigo-400">{itemFinancing.paid_installments} / {itemFinancing.total_installments} {isHu ? 'részlet' : 'months'} ({progress}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">{isHu ? 'Havi részlet:' : 'Monthly:'}</span>
                        <span className="font-bold text-indigo-300 text-sm">{itemFinancing.monthly_installment.toLocaleString()} Ft</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{isHu ? 'Fennálló tartozás:' : 'Remaining Debt:'}</span>
                        <span className="font-bold text-rose-400 text-sm">{itemFinancing.remaining_debt.toLocaleString()} Ft</span>
                      </div>
                    </div>

                    {itemFinancing.remaining_installments > 0 && (
                      <div className="pt-2 border-t border-indigo-900/40 flex justify-between items-center">
                        <span className="text-xs text-slate-400">{isHu ? 'Esedékes:' : 'Due:'} <strong>{itemFinancing.next_payment_date}</strong></span>
                        <button
                          onClick={() => recordInstallmentPayment(itemFinancing.id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
                        >
                          {isHu ? '+1 részlet fizetve' : 'Record 1 payment'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* REPAIRS & MAINTENANCE CARD */}
              {(() => {
                const itemRepairsList = repairs.filter(r => r.item_id === item.id);
                const totalRepairExp = itemRepairsList.reduce((sum, r) => sum + (r.total_cost || 0), 0);
                const totalInvested = (item.purchase_price || 0) + totalRepairExp;

                return (
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-400" />
                        {isHu ? 'Javítások & Ráfordítások' : 'Repairs & Maintenance Logs'}
                      </h3>
                      {totalRepairExp > 0 && (
                        <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
                          {isHu ? 'Összes ráfordítás:' : 'Total Cost:'} {totalInvested.toLocaleString()} Ft
                        </span>
                      )}
                    </div>

                    {itemRepairsList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        {isHu ? 'Még nem rögzítettél ehhez a tárgyhoz javítási bejegyzést.' : 'No maintenance logs recorded for this item.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {itemRepairsList.map(rep => (
                          <div key={rep.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-200">{rep.fault_title}</p>
                              <p className="text-slate-400 text-[11px]">{rep.reported_date} • {rep.repairer_name || (isHu ? 'Ismeretlen szerviz' : 'Service')}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-amber-400 block">{rep.total_cost > 0 ? `${rep.total_cost.toLocaleString()} Ft` : (isHu ? 'Díjmentes' : 'Free')}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">{rep.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ITEM RELATIONSHIPS CARD (Section 1 & 2) */}
              {(() => {
                const currentRelations = getItemRelations(item.id);

                const getRelationLabel = (relType: string, isSource: boolean) => {
                  switch (relType) {
                    case 'accessory': return isSource ? (isHu ? 'Tartozéka' : 'Accessory of') : (isHu ? 'Tartozék tárgya' : 'Has accessory');
                    case 'compatible': return isHu ? 'Kompatibilis vele' : 'Compatible with';
                    case 'part_of': return isSource ? (isHu ? 'Magában foglalja' : 'Includes part') : (isHu ? 'Része a tárgynak' : 'Part of');
                    case 'required_for': return isSource ? (isHu ? 'Használatához szükséges' : 'Required for') : (isHu ? 'Szükséges ehhez' : 'Needs item');
                    case 'pair': return isHu ? 'Párja' : 'Paired with';
                    case 'bought_together': return isHu ? 'Együtt vásárolva' : 'Bought together with';
                    default: return isHu ? 'Kapcsolódik hozzá' : 'Related to';
                  }
                };

                const handleAddRelationSubmit = async (e: React.FormEvent) => {
                  e.preventDefault();
                  if (!targetItemIdRelation) return;
                  await addItemRelation(item.id, targetItemIdRelation, relationTypeForm);
                  setTargetItemIdRelation('');
                  setIsAddRelationOpen(false);
                };

                return (
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-emerald-400" />
                        {isHu ? 'Kapcsolódó Tárgyak & Tartozékok' : 'Linked Items & Accessories'}
                      </h3>
                      <button
                        onClick={() => setIsAddRelationOpen(!isAddRelationOpen)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {isHu ? 'Tárgy összekapcsolása' : 'Link Item'}
                      </button>
                    </div>

                    {isAddRelationOpen && (
                      <form onSubmit={handleAddRelationSubmit} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">{isHu ? 'Melyik tárggyal?' : 'Which item?'}</label>
                            <select
                              required
                              value={targetItemIdRelation}
                              onChange={(e) => setTargetItemIdRelation(e.target.value)}
                              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                            >
                              <option value="">{isHu ? '-- Válassz tárgyat --' : '-- Select item --'}</option>
                              {items.filter(i => i.id !== item.id).map(i => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1">{isHu ? 'Kapcsolat típusa' : 'Relation type'}</label>
                            <select
                              value={relationTypeForm}
                              onChange={(e) => setRelationTypeForm(e.target.value as any)}
                              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                            >
                              <option value="accessory">{isHu ? 'Tartozéka' : 'Accessory'}</option>
                              <option value="compatible">{isHu ? 'Kompatibilis vele' : 'Compatible'}</option>
                              <option value="part_of">{isHu ? 'Része / Magában foglalja' : 'Part of / Includes'}</option>
                              <option value="required_for">{isHu ? 'Használatához szükséges' : 'Required for'}</option>
                              <option value="pair">{isHu ? 'Párja' : 'Pair'}</option>
                              <option value="related">{isHu ? 'Kapcsolódik hozzá' : 'Related'}</option>
                              <option value="bought_together">{isHu ? 'Együtt vásárolva' : 'Bought together'}</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddRelationOpen(false)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white"
                          >
                            {isHu ? 'Mégse' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg"
                          >
                            {isHu ? 'Összekapcsolás' : 'Link'}
                          </button>
                        </div>
                      </form>
                    )}

                    {currentRelations.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        {isHu ? 'Ehhez a tárgyhoz még nincs kapcsolódó tárgy vagy tartozék beállítva.' : 'No linked items or accessories configured for this item.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {currentRelations.map(rel => {
                          const isSource = rel.source_item_id === item.id;
                          const otherItemId = isSource ? rel.target_item_id : rel.source_item_id;
                          const otherItem = items.find(i => i.id === otherItemId);

                          return (
                            <div key={rel.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold text-[10px]">
                                  {getRelationLabel(rel.relation_type, isSource)}
                                </span>
                                <button
                                  onClick={() => otherItem && setSelectedItemId(otherItem.id)}
                                  className="font-semibold text-white hover:text-emerald-400 transition"
                                >
                                  {otherItem ? otherItem.name : (isHu ? 'Törölt tárgy' : 'Deleted item')}
                                </button>
                              </div>

                              <button
                                onClick={() => deleteItemRelation(rel.id)}
                                className="p-1 text-slate-400 hover:text-red-400"
                                title={isHu ? 'Kapcsolat törlése' : 'Remove link'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )}

          {/* TAB 2: DOCUMENTS (Section 11) */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  {isHu ? 'Csatolt Dokumentumok' : 'Attached Documents'}
                </h3>

                <button
                  onClick={() => setIsAddDocOpen(!isAddDocOpen)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> {isHu ? 'Dokumentum Feltöltése' : 'Upload Document'}
                </button>
              </div>

              {/* Add document mini-form */}
              {isAddDocOpen && (
                <form onSubmit={handleAddDocSubmit} className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
                  <h4 className="text-xs font-bold text-white">
                    {isHu ? 'Új Dokumentum Rögzítése' : 'Add New Document Record'}
                  </h4>

                  {/* File Upload Area */}
                  <div className="p-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center gap-1.5">
                    <label className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors ${
                      isUploadingDoc ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                      {isUploadingDoc ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      ) : (
                        <Upload className="h-4 w-4 text-slate-950" />
                      )}
                      <span>
                        {isUploadingDoc
                          ? (isHu ? 'Feltöltés...' : 'Uploading...')
                          : (isHu ? 'Fájl Feltöltése' : 'Upload File to Storage')}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user?.id) return;
                          setIsUploadingDoc(true);
                          setDocUploadError(null);
                          if (!newDocName) setNewDocName(file.name);
                          const res = await uploadFileToStorage(file, 'documents', user.id);
                          setIsUploadingDoc(false);
                          if (res.error) {
                            setDocUploadError(res.error);
                          } else if (res.signedUrl || res.path) {
                            setNewDocUrl(res.signedUrl || res.path || '');
                          }
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      {isHu ? 'PDF, PNG, JPG vagy DOC maximum 15MB' : 'PDF, PNG, JPG or DOC up to 15MB'}
                    </p>
                    {docUploadError && (
                      <p className="text-[11px] text-rose-400 font-medium">{docUploadError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">
                        {isHu ? 'Dokumentum Neve *' : 'Document Name *'}
                      </label>
                      <input
                        type="text"
                        placeholder={isHu ? 'pl. Szamla_Nyugta.pdf' : 'e.g. Invoice_Receipt.pdf'}
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        required
                        className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">
                        {isHu ? 'Dokumentum Típusa' : 'Document Type'}
                      </label>
                      <select
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value as ItemDocument['document_type'])}
                        className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-white"
                      >
                        <option value="Invoice">{isHu ? 'Számla / Nyugta' : 'Invoice / Receipt'}</option>
                        <option value="Warranty">{isHu ? 'Garancialevél' : 'Warranty Certificate'}</option>
                        <option value="Manual">{isHu ? 'Használati Útmutató' : 'User Manual'}</option>
                        <option value="Certificate">{isHu ? 'Igazolás / Tanúsítvány' : 'Certificate'}</option>
                        <option value="Photo">{isHu ? 'Fénykép Dok' : 'Photo Record'}</option>
                        <option value="Other">{isHu ? 'Egyéb' : 'Other'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddDocOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      {isHu ? 'Mégse' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-slate-950 rounded-lg"
                    >
                      {isHu ? 'Dokumentum Mentése' : 'Save Document'}
                    </button>
                  </div>
                </form>
              )}

              {/* Documents List */}
              {itemDocs.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 text-xs">
                  {isHu
                    ? 'Még nincsenek csatolt dokumentumok ehhez a tárgyhoz. Kattints a "Dokumentum Feltöltése" gombra számlák vagy útmutatók hozzáadásához.'
                    : 'No documents attached to this item yet. Click "Upload Document" to add invoices or manuals.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {itemDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-900 text-emerald-400 flex-shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{doc.file_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {(isHu ? (
                              doc.document_type === 'Invoice' ? 'Számla / Nyugta' :
                              doc.document_type === 'Warranty' ? 'Garancialevél' :
                              doc.document_type === 'Manual' ? 'Útmutató' :
                              doc.document_type === 'Certificate' ? 'Igazolás' :
                              doc.document_type === 'Photo' ? 'Fénykép' : 'Egyéb'
                            ) : doc.document_type)} • {isHu ? 'Hozzáadva:' : 'Added'} {new Date(doc.created_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> {isHu ? 'Megtekintés' : 'View'}
                        </a>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                          title={isHu ? 'Dokumentum törlése' : 'Delete document'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: PHOTOS (Section 11) */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                  {isHu ? 'Fénykép galéria' : 'Photo Gallery'}
                </h3>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isHu ? 'Fényképek kezelése / feltöltése' : 'Manage / Upload Photos'}
                </button>
              </div>

              {(!item.photo_url && (!item.additional_photos || item.additional_photos.length === 0)) ? (
                <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 text-xs">
                  {isHu ? 'Még nincsenek feltöltött képek. Kattints a "Fényképek kezelése" gombra új képek feltöltéséhez.' : 'No photos uploaded yet. Click "Manage Photos" to upload images.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {item.photo_url && (
                    <div className="rounded-xl overflow-hidden border border-emerald-500/60 bg-slate-950 aspect-video relative group shadow-md">
                      <img src={item.photo_url} alt="Primary" className="w-full h-full object-cover max-w-full max-h-full block group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-emerald-950/90 text-[10px] font-bold text-emerald-400 border border-emerald-800/60">
                        {isHu ? 'Fő kép' : 'Primary Photo'}
                      </span>
                    </div>
                  )}

                  {item.additional_photos?.map((url, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video relative group shadow-md">
                      <img src={url} alt={`Additional ${idx + 1}`} className="w-full h-full object-cover max-w-full max-h-full block group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-bold text-slate-300">
                        {idx + 2}. {isHu ? 'kép' : 'photo'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NOTES (Section 11) */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-emerald-400" />
                  {isHu ? 'Megjegyzések és karbantartási napló' : 'Item Notes & Maintenance Log'}
                </h3>
              </div>

              {editingField === 'notes' ? (
                <div className="p-4 rounded-xl border border-emerald-500 bg-slate-950 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      {isHu ? 'Megjegyzések szerkesztése:' : 'Edit Notes:'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button onClick={cancelInlineEdit} className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-300">
                        {isHu ? 'Mégse' : 'Cancel'}
                      </button>
                      <button onClick={(e) => saveInlineField(e, 'notes')} className="px-3.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {isHu ? 'Mentés' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    value={inlineValue}
                    onChange={(e) => setInlineValue(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900 text-white text-sm focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  onClick={(e) => startInlineEdit(e, 'notes', item.notes || '')}
                  className="group/notes cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-950 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap relative"
                  title={isHu ? 'Kattints a megjegyzések inline szerkesztéséhez' : 'Click to edit notes'}
                >
                  <Edit3 className="h-4 w-4 text-emerald-400 opacity-0 group-hover/notes:opacity-100 transition-opacity absolute top-3 right-3" />
                  {item.notes || (isHu
                    ? 'Még nincsenek egyedi megjegyzések ehhez a tárgyhoz. Kattints ide megjegyzések rögzítéséhez.'
                    : 'No custom notes added to this item yet. Click here to add notes.')}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      <ShareModal
        item={item}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
