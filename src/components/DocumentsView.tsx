import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Search, ExternalLink, Trash2, Boxes } from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { documents, items, deleteDocument, setSelectedItemId, language } = useApp();
  const isHu = language === 'hu';

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredDocs = documents.filter(doc => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const item = items.find(i => i.id === doc.item_id);
      const itemName = item?.name.toLowerCase() || '';
      const docName = doc.file_name.toLowerCase();
      if (!docName.includes(q) && !itemName.includes(q)) return false;
    }

    if (selectedType !== 'all' && doc.document_type !== selectedType) {
      return false;
    }

    return true;
  });

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'Invoice':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Warranty':
        return 'bg-[var(--color-primary-blue,#2563EB)]/10 text-[var(--color-primary-blue,#2563EB)] border-[var(--color-primary-blue,#2563EB)]/30';
      case 'Manual':
        return 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-[var(--border-color,#56616D)]';
      default:
        return 'bg-[var(--surface-bg,#465362)]/60 text-[var(--text-sub,#B5BDC6)] border-[var(--border-color,#56616D)]';
    }
  };

  const getDocTypeLabel = (type: string) => {
    if (!isHu) return type;
    switch (type) {
      case 'Invoice':
        return 'Számla / Nyugta';
      case 'Warranty':
        return 'Garancialevél';
      case 'Manual':
        return 'Útmutató';
      case 'Certificate':
        return 'Igazolás';
      case 'Photo':
        return 'Fénykép';
      default:
        return 'Egyéb';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
              {isHu ? 'Dokumentumok' : 'Documents Repository'}
            </h1>
            <span className="px-3 py-1 rounded-full bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)] font-bold text-xs">
              {documents.length} {isHu ? 'fájl' : 'files'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-1">
            {isHu
              ? 'Számlák, garancialevelek és használati útmutatók központi gyűjteménye.'
              : 'Central ledger of invoices, warranty papers, and instruction manuals across all things.'}
          </p>
        </div>
      </div>

      {/* Search & Type Filters */}
      <div className="p-4 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
          <input
            type="text"
            placeholder={isHu ? 'Keresés dokumentum neve vagy tárgynév alapján...' : 'Search documents by file name or item name...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] text-xs placeholder-[var(--text-sub,#B5BDC6)] focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] text-xs focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
        >
          <option value="all">{isHu ? 'Minden dokumentum típus' : 'All Document Types'}</option>
          <option value="Invoice">{isHu ? 'Számlák & Nyugták' : 'Invoices & Receipts'}</option>
          <option value="Warranty">{isHu ? 'Garancialevelek' : 'Warranty Certificates'}</option>
          <option value="Manual">{isHu ? 'Használati útmutatók' : 'User Manuals'}</option>
          <option value="Certificate">{isHu ? 'Igazolások & Tanúsítványok' : 'Certificates'}</option>
          <option value="Photo">{isHu ? 'Fénykép dokumentumok' : 'Photo Records'}</option>
          <option value="Other">{isHu ? 'Egyéb fájlok' : 'Other Files'}</option>
        </select>
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="p-16 text-center rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)]/40 text-[var(--text-sub,#B5BDC6)] text-xs">
          <FileText className="h-12 w-12 text-[var(--text-sub,#B5BDC6)]/40 mx-auto mb-3" />
          {isHu ? 'Nem található a keresési feltételeknek megfelelő dokumentum.' : 'No documents found matching the search criteria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => {
            const item = items.find(i => i.id === doc.item_id);

            return (
              <div
                key={doc.id}
                className="p-4 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--color-primary-blue,#2563EB)]/60 transition-all flex flex-col justify-between min-w-0 overflow-hidden"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${getDocTypeBadge(doc.document_type)}`}>
                      {getDocTypeLabel(doc.document_type)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] truncate" title={doc.file_name}>
                    {doc.file_name}
                  </h3>

                  {item && (
                    <button
                      onClick={() => setSelectedItemId(item.id)}
                      className="mt-1 text-xs text-[var(--color-primary-blue,#2563EB)] hover:underline flex items-center gap-1 font-medium max-w-full text-left"
                      title={`${isHu ? 'Tárgyhoz csatolva:' : 'Attached to:'} ${item.name}`}
                    >
                      <Boxes className="h-3 w-3 shrink-0 text-[var(--color-primary-blue,#2563EB)]" />
                      <span className="truncate min-w-0">
                        {isHu ? 'Tárgyhoz csatolva:' : 'Attached to:'} {item.name}
                      </span>
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-between text-xs">
                  <span className="text-[var(--text-sub,#B5BDC6)] font-mono text-[11px]">
                    {new Date(doc.created_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] hover:text-white hover:bg-[var(--color-primary-blue,#2563EB)] flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {isHu ? 'Megtekintés' : 'View'}
                    </a>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
