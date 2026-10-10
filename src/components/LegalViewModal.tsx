import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { LegalSlug, LegalDocumentVersion } from '../types';
import { X, ShieldCheck, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] text-[var(--text-main,#E0E3E6)] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] p-6 bg-[var(--card-bg,#3A4551)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)]">
                {docTitles[slug] || 'Jogi Dokumentum'}
              </h2>
              {doc && (
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  Éles verzió: v{doc.version}.0 • Legutóbbi frissítés: {doc.published_at ? new Date(doc.published_at).toLocaleDateString() : 'N/A'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-blue,#2563EB)]" />
              <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Dokumentum betöltése...</p>
            </div>
          ) : doc ? (
            <div className="prose prose-invert max-w-none text-sm text-[var(--text-main,#E0E3E6)] whitespace-pre-wrap font-sans leading-relaxed space-y-4">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] mb-2">{doc.title}</h3>
              <div>{doc.content}</div>
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--text-sub,#B5BDC6)] text-sm">
              Jelenleg nem áll rendelkezésre publikált verzió ehhez a dokumentumhoz.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-color,#56616D)] p-4 bg-[var(--card-bg,#3A4551)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] hover:text-white font-bold text-xs border border-[var(--border-color,#56616D)] transition-colors"
          >
            Bezárás
          </button>
        </div>

      </div>
    </div>
  );
};
