import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Search, ExternalLink, Trash2, Boxes } from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { documents, items, deleteDocument, setSelectedItemId } = useApp();

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
        return 'bg-emerald-950 text-emerald-400 border-emerald-800/60';
      case 'Warranty':
        return 'bg-teal-950 text-teal-300 border-teal-800/60';
      case 'Manual':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Documents Repository
            </h1>
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs">
              {documents.length} files
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Central ledger of invoices, warranty papers, and instruction manuals across all things.
          </p>
        </div>
      </div>

      {/* Search & Type Filters */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by file name or item name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All Document Types</option>
          <option value="Invoice">Invoices & Receipts</option>
          <option value="Warranty">Warranty Certificates</option>
          <option value="Manual">User Manuals</option>
          <option value="Certificate">Certificates</option>
          <option value="Photo">Photo Records</option>
          <option value="Other">Other Files</option>
        </select>
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
          <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          No documents found matching the search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => {
            const item = items.find(i => i.id === doc.item_id);

            return (
              <div
                key={doc.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-400">
                      <FileText className="h-5 w-5" />
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDocTypeBadge(doc.document_type)}`}>
                      {doc.document_type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">{doc.file_name}</h3>

                  {item && (
                    <button
                      onClick={() => setSelectedItemId(item.id)}
                      className="mt-1 text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium truncate"
                    >
                      <Boxes className="h-3 w-3" /> Attached to: {item.name}
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 text-[11px]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
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
