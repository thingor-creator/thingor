import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { LegalSlug, LegalDocumentVersion } from '../types';
import { X, ShieldCheck, FileText, Loader2 } from 'lucide-react';

interface LegalViewModalProps {
  slug: LegalSlug;
  isOpen: boolean;
  onClose: () => void;
}

export const LegalViewModal: React.FC<LegalViewModalProps> = ({ slug, isOpen, onClose }) => {
  const { getPublishedLegalDoc } = useApp();
  const [doc, setDoc] = useState<LegalDocumentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && slug) {
      setIsLoading(true);
      getPublishedLegalDoc(slug).then(res => {
        setDoc(res);
        setIsLoading(false);
      });
    }
  }, [isOpen, slug]);

  if (!isOpen) return null;

  const docTitles: Record<LegalSlug, string> = {
    privacy: 'Adatvédelmi Tájékoztató (Privacy Policy)',
    terms: 'Felhasználási Feltételek (Terms of Service)',
    cookies: 'Cookie Tájékoztató (Cookie Policy)',
    imprint: 'Impresszum (Imprint)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {docTitles[slug] || 'Jogi Dokumentum'}
              </h2>
              {doc && (
                <p className="text-xs text-slate-400">
                  Éles verzió: v{doc.version}.0 • Legutóbbi frissítés: {doc.published_at ? new Date(doc.published_at).toLocaleDateString() : 'N/A'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-xs text-slate-400">Dokumentum betöltése...</p>
            </div>
          ) : doc ? (
            <div className="prose prose-invert max-w-none text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed space-y-4">
              <h3 className="text-base font-bold text-white mb-2">{doc.title}</h3>
              <div>{doc.content}</div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Jelenleg nem áll rendelkezésre publikált verzió ehhez a dokumentumhoz.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Bezárás
          </button>
        </div>

      </div>
    </div>
  );
};
