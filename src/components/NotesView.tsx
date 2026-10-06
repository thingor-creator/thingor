import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StickyNote, Plus, Search, Tag, MapPin, ArrowRight, Trash2, Edit3, CheckCircle2, Package } from 'lucide-react';
import type { QuickNote } from '../types';

export const NotesView: React.FC = () => {
  const { quickNotes, addQuickNote, updateQuickNote, deleteQuickNote, convertNoteToItem, setSelectedItemId, language, t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [locationHint, setLocationHint] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const isHu = language === 'hu';

  const handleOpenAddModal = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setLocationHint('');
    setTagsInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: QuickNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setLocationHint(note.location_hint || '');
    setTagsInput(note.tags ? note.tags.join(', ') : '');
    setIsModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArr = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (editingNote) {
      await updateQuickNote(editingNote.id, {
        title: title.trim(),
        content: content.trim(),
        location_hint: locationHint.trim() || undefined,
        tags: tagsArr,
      });
    } else {
      await addQuickNote({
        title: title.trim(),
        content: content.trim(),
        location_hint: locationHint.trim() || undefined,
        tags: tagsArr,
        is_converted: false,
      });
    }

    setIsModalOpen(false);
  };

  // Collect all unique tags
  const allTags = Array.from(
    new Set(quickNotes.flatMap(n => n.tags || []))
  );

  const filteredNotes = quickNotes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.location_hint && note.location_hint.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = selectedTag === 'all' || (note.tags && note.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <StickyNote className="w-7 h-7 text-amber-500" />
            {isHu ? 'Gyors Jegyzetek & Feljegyzések' : 'Quick Notes'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isHu
              ? 'Rögzíts gyorsan feljegyzéseket anyagaidról, alkatrészeidről vagy tetszőleges tárgyakról.'
              : 'Record fast notes about raw materials, parts, or arbitrary items.'}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {isHu ? 'Új Jegyzet' : 'New Note'}
        </button>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={isHu ? 'Keresés jegyzetek között...' : 'Search notes...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 outline-none shadow-xs"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedTag === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isHu ? 'Összes címke' : 'All tags'}
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedTag === tag
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes List Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {isHu ? 'Nincs megjeleníthető jegyzet' : 'No notes found'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            {isHu
              ? 'Még nem rögzítettél gyors feljegyzést, vagy a szűrő nem ad találatot.'
              : 'No quick notes recorded yet or matching your search filter.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-600 transition"
          >
            <Plus className="w-4 h-4" />
            {isHu ? 'Első Jegyzet Létrehozása' : 'Create First Note'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`bg-white rounded-2xl border ${
                note.is_converted ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200/90'
              } p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 text-base">{note.title}</h3>
                  {note.is_converted ? (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      {isHu ? 'Tárggyá alakítva' : 'Converted'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      {isHu ? 'Jegyzet' : 'Note'}
                    </span>
                  )}
                </div>

                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed my-2">
                  {note.content}
                </p>

                {note.location_hint && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{note.location_hint}</span>
                  </div>
                )}

                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-3">
                    {note.tags.map(tag => (
                      <span key={tag} className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {!note.is_converted ? (
                  <button
                    onClick={() => convertNoteToItem(note.id)}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" />
                    {isHu ? 'Átalakítás tárggyá' : 'Convert to Item'}
                  </button>
                ) : (
                  <button
                    onClick={() => note.converted_item_id && setSelectedItemId(note.converted_item_id)}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition flex items-center gap-1"
                  >
                    {isHu ? 'Tárgy megtekintése' : 'View Item'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(note)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title={isHu ? 'Szerkesztés' : 'Edit'}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteQuickNote(note.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title={isHu ? 'Törlés' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <StickyNote className="w-6 h-6 text-amber-500" />
              {editingNote
                ? (isHu ? 'Jegyzet Szerkesztése' : 'Edit Note')
                : (isHu ? 'Új Gyors Jegyzet' : 'New Quick Note')}
            </h2>

            <form onSubmit={handleSaveNote} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isHu ? 'Cím *' : 'Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isHu ? 'Pl. Laposvas, 5×10-es deszka, Garázs festék' : 'e.g. Steel bar, Lumber 2x4'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isHu ? 'Tartalom / Részletek *' : 'Content / Details *'}
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={isHu ? 'Pl. 40×5 mm acél, 2 méter hossz, 3 darab az állványon' : 'Describe quantity, dimensions, or text...'}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isHu ? 'Helyszín feljegyzés (Opcionális)' : 'Location Hint (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isHu ? 'Pl. Műhely hátsó állvány' : 'e.g. Garage top shelf'}
                  value={locationHint}
                  onChange={(e) => setLocationHint(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isHu ? 'Címkék (vesszővel elválasztva)' : 'Tags (comma separated)'}
                </label>
                <input
                  type="text"
                  placeholder={isHu ? 'Pl. faanyag, fém, alkatrész' : 'e.g. wood, metal, parts'}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm transition"
                >
                  {isHu ? 'Mentés' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
