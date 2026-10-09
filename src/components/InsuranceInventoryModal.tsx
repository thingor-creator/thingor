import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  X,
  FileText,
  Download,
  Printer,
  ShieldCheck,
  Boxes,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface InsuranceInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InsuranceInventoryModal: React.FC<InsuranceInventoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    items,
    documents,
    getLocationPath,
    getCategoryName,
    user,
    language
  } = useApp();

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const isHu = language === 'hu';

  if (!isOpen) return null;

  // Filter items (only valid user items)
  const userItems = items;

  // Summary Metrics
  const totalItemsCount = userItems.length;
  const totalPurchasePrice = userItems.reduce((acc, item) => acc + (item.purchase_price || 0), 0);
  const totalCurrentValue = userItems.reduce(
    (acc, item) => acc + (item.current_value ?? item.purchase_price ?? 0),
    0
  );
  const warrantyCount = userItems.filter(item => {
    if (!item.warranty_end) return false;
    return new Date(item.warranty_end) > new Date();
  }).length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isHu ? 'hu-HU' : 'en-US');
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (val?: number) => {
    if (val === undefined || val === null) return '-';
    return isHu
      ? `${val.toLocaleString('hu-HU')} Ft`
      : `€${val.toLocaleString('en-US')}`;
  };

  const getConditionLabel = (cond: string) => {
    switch (cond) {
      case 'New': return isHu ? 'Új' : 'New';
      case 'Excellent': return isHu ? 'Kiváló' : 'Excellent';
      case 'Good': return isHu ? 'Jó' : 'Good';
      case 'Fair': return isHu ? 'Közepes' : 'Fair';
      case 'Poor': return isHu ? 'Gyenge' : 'Poor';
      case 'Broken': return isHu ? 'Hibás/Törött' : 'Broken';
      default: return cond;
    }
  };

  const convertImageToBase64 = async (url: string): Promise<string> => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;

    // Try direct fetch first
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      }
    } catch {}

    // Fallback via CORS-friendly image proxy (weserv.nl)
    try {
      const cleanUrl = url.replace(/^https?:\/\//, '');
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=300&output=jpg`;
      const res = await fetch(proxyUrl, { cache: 'force-cache' });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      }
    } catch {}

    return '';
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const element = printRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: async (clonedDoc) => {
          // 1. Remove all external <link rel="stylesheet"> and <style> tags in clonedDoc that contain Tailwind v4 oklch rules
          clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());

          // 2. Build a combined CSS string from document.styleSheets in the parent document
          let combinedCss = '';
          try {
            Array.from(document.styleSheets).forEach(sheet => {
              try {
                const rules = Array.from(sheet.cssRules || []);
                rules.forEach(rule => {
                  combinedCss += rule.cssText + '\n';
                });
              } catch {
                // Cross-origin stylesheet rules might be inaccessible, ignore
              }
            });
          } catch {}

          // 3. Replace all oklch(...) occurrences in combinedCss
          if (combinedCss.includes('oklch')) {
            combinedCss = combinedCss.replace(/oklch\([^)]+\)/g, '#0f172a');
          }

          // 4. Create a clean sanitized <style> element in clonedDoc head
          const sanitizedStyle = clonedDoc.createElement('style');
          sanitizedStyle.textContent = combinedCss;
          clonedDoc.head.appendChild(sanitizedStyle);

          // 5. Convert all item photo images in clonedDoc to inline Base64 Data URLs
          const imgElements = Array.from(
            clonedDoc.querySelectorAll('#printable-insurance-inventory img')
          ) as HTMLImageElement[];

          await Promise.all(
            imgElements.map(async (img) => {
              const src = img.getAttribute('src');
              if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
                const base64 = await convertImageToBase64(src);
                if (base64) {
                  img.src = base64;
                  img.removeAttribute('crossorigin');
                } else {
                  img.style.display = 'none';
                }
              }
            })
          );

          // 6. Sanitize any inline element style properties containing oklch
          const container = clonedDoc.getElementById('printable-insurance-inventory');
          if (container) {
            const allElements = container.querySelectorAll('*');
            const sanitizeNode = (el: HTMLElement) => {
              try {
                const style = window.getComputedStyle(el);
                ['color', 'backgroundColor', 'borderColor', 'stroke', 'fill'].forEach(prop => {
                  const val = (el.style as any)[prop] || style.getPropertyValue(prop);
                  if (val && val.includes('oklch')) {
                    (el.style as any)[prop] = prop === 'color' ? '#0f172a' : prop === 'backgroundColor' ? '#ffffff' : '#e2e8f0';
                  }
                });
              } catch {
                // Ignore style read errors
              }
            };
            sanitizeNode(container);
            allElements.forEach(node => sanitizeNode(node as HTMLElement));
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      pdf.save(`Thingor_Biztositasi_Leltar_${todayStr}.pdf`);
    } catch (err: any) {
      console.error('PDF Generation failed:', err);
      setErrorMsg(
        isHu
          ? 'Hiba történt a PDF generálásakor. Kérjük, próbáld meg újra.'
          : 'Failed to generate PDF. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintNative = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isHu ? 'Biztosítási Leltár Export (PDF)' : 'Insurance Inventory Export (PDF)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isHu
                  ? 'Hivatalos vagyontárgy kimutatás és archiválható PDF dokumentum'
                  : 'Official asset documentation for insurance and offline archiving'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Controls Top Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-emerald-400" />
            <span>
              {isHu
                ? `${totalItemsCount} tárgy készen áll az exportálásra`
                : `${totalItemsCount} items ready for export`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrintNative}
              disabled={isGenerating || totalItemsCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isHu ? 'Nyomtatás' : 'Print'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating || totalItemsCount === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{isHu ? 'PDF Letöltése' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Preview & Print Template Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/90">
          
          {totalItemsCount === 0 ? (
            <div className="p-12 text-center space-y-4">
              <Boxes className="h-12 w-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">
                {isHu ? 'Nincs exportálható tárgy' : 'No items to export'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isHu
                  ? 'A leltár jelenleg üres. Vegyél fel új tárgyakat az exportálás előtt.'
                  : 'Your inventory is currently empty. Add items before exporting.'}
              </p>
            </div>
          ) : (
            /* Printable Template (A4 Light Style with Explicit Hex Colors for html2canvas compatibility) */
            <div
              ref={printRef}
              id="printable-insurance-inventory"
              className="w-full p-4 sm:p-8 rounded-xl shadow-lg space-y-6 text-left border"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderColor: '#e2e8f0'
              }}
            >
              
              {/* PDF Document Header */}
              <div
                className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5"
                style={{ borderBottom: '2px solid #059669' }}
              >
                <div>
                  <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm uppercase tracking-wider" style={{ color: '#047857' }}>
                    <ShieldCheck className="h-4 sm:h-5 w-4 sm:w-5" />
                    <span>Thingor Inventory System</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black mt-1" style={{ color: '#0f172a' }}>
                    BIZTOSÍTÁSI LELTÁR KIMUTATÁS
                  </h1>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: '#64748b' }}>
                    Hivatalos vagyontárgy jegyzék biztosítási kárigényhez és archiváláshoz
                  </p>
                </div>

                <div className="sm:text-right space-y-1 text-xs shrink-0">
                  <div className="font-bold" style={{ color: '#1e293b' }}>
                    Dátum: <span className="font-normal" style={{ color: '#475569' }}>{new Date().toLocaleDateString('hu-HU')}</span>
                  </div>
                  <div className="font-bold" style={{ color: '#1e293b' }}>
                    Tulajdonos: <span className="font-normal" style={{ color: '#475569' }}>{user?.email || 'Nyilvántartott Felhasználó'}</span>
                  </div>
                  <div
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}
                  >
                    Hitelesített Leltár
                  </div>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl text-xs"
                style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                <div>
                  <span className="block text-[10px] uppercase font-bold" style={{ color: '#64748b' }}>Tárgyak száma</span>
                  <span className="text-base sm:text-lg font-black" style={{ color: '#0f172a' }}>{totalItemsCount} db</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold" style={{ color: '#64748b' }}>Összes vételár</span>
                  <span className="text-base sm:text-lg font-black" style={{ color: '#047857' }}>{formatPrice(totalPurchasePrice)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold" style={{ color: '#64748b' }}>Becsült érték</span>
                  <span className="text-base sm:text-lg font-black" style={{ color: '#0f172a' }}>{formatPrice(totalCurrentValue)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold" style={{ color: '#64748b' }}>Aktív garancia</span>
                  <span className="text-base sm:text-lg font-black" style={{ color: '#1d4ed8' }}>{warrantyCount} tárgy</span>
                </div>
              </div>

              {/* Items Detail Table */}
              <div className="space-y-3 pt-2">
                <h3
                  className="text-xs font-extrabold uppercase tracking-wider pb-1"
                  style={{ color: '#334155', borderBottom: '1px solid #cbd5e1' }}
                >
                  Részletes Tárgylistázás ({totalItemsCount} tételezett elem)
                </h3>

                <div className="overflow-x-auto w-full rounded-lg border border-slate-200">
                  <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className="text-[11px] font-bold"
                      style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155' }}
                    >
                      <th className="p-2 w-12 text-center">Fotó</th>
                      <th className="p-2">Tárgy megnevezése</th>
                      <th className="p-2">Kategória / Helyszín</th>
                      <th className="p-2">Vásárlás</th>
                      <th className="p-2 text-right">Vételár</th>
                      <th className="p-2 text-right">Aktuális Érték</th>
                      <th className="p-2 text-center">Garancia</th>
                      <th className="p-2 text-center">Dok.</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]" style={{ color: '#1e293b' }}>
                    {userItems.map((item, idx) => {
                      const category = getCategoryName(item.category_id);
                      const location = getLocationPath(item.location_id);
                      const itemDocs = documents.filter(d => d.item_id === item.id);

                      return (
                        <tr
                          key={item.id}
                          style={{
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #f1f5f9'
                          }}
                        >
                          
                          {/* Thumbnail photo */}
                          <td className="p-2 text-center align-top">
                            {item.photo_url ? (
                              <img
                                src={item.photo_url}
                                alt={item.name}
                                className="w-9 h-9 object-cover rounded mx-auto"
                                style={{ border: '1px solid #cbd5e1' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                className="w-9 h-9 rounded flex items-center justify-center text-[9px] mx-auto font-semibold"
                                style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}
                              >
                                Nincs
                              </div>
                            )}
                          </td>

                          {/* Name & Details */}
                          <td className="p-2 align-top">
                            <div className="font-bold" style={{ color: '#0f172a' }}>{item.name}</div>
                            {item.store_seller && (
                              <div className="text-[10px]" style={{ color: '#64748b' }}>Üzlet: {item.store_seller}</div>
                            )}
                            <div className="text-[10px]" style={{ color: '#64748b' }}>Állapot: {getConditionLabel(item.condition)}</div>
                          </td>

                          {/* Category & Location */}
                          <td className="p-2 align-top">
                            <div className="font-semibold" style={{ color: '#1e293b' }}>{category}</div>
                            <div className="text-[10px]" style={{ color: '#64748b' }}>{location}</div>
                          </td>

                          {/* Purchase Date */}
                          <td className="p-2 align-top whitespace-nowrap">
                            {formatDate(item.purchase_date)}
                          </td>

                          {/* Purchase Price */}
                          <td className="p-2 text-right align-top font-semibold whitespace-nowrap">
                            {formatPrice(item.purchase_price)}
                          </td>

                          {/* Current Value */}
                          <td className="p-2 text-right align-top font-bold whitespace-nowrap" style={{ color: '#0f172a' }}>
                            {formatPrice(item.current_value ?? item.purchase_price)}
                          </td>

                          {/* Warranty */}
                          <td className="p-2 text-center align-top whitespace-nowrap">
                            {item.warranty_end ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={
                                  new Date(item.warranty_end) > new Date()
                                    ? { backgroundColor: '#dcfce7', color: '#166534' }
                                    : { backgroundColor: '#e2e8f0', color: '#475569' }
                                }
                              >
                                {formatDate(item.warranty_end)}
                              </span>
                            ) : (
                              <span className="text-[10px]" style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Documents indicator */}
                          <td className="p-2 text-center align-top font-semibold">
                            {itemDocs.length > 0 ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                              >
                                {itemDocs.length} db
                              </span>
                            ) : (
                              <span className="text-[10px]" style={{ color: '#94a3b8' }}>Nem</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              {/* PDF Document Footer */}
              <div
                className="pt-4 flex items-center justify-between text-[10px]"
                style={{ borderTop: '1px solid #cbd5e1', color: '#64748b' }}
              >
                <div>
                  Készült a <span className="font-bold" style={{ color: '#334155' }}>Thingor</span> nyilvántartóból. Minden jog fenntartva.
                </div>
                <div>
                  Biztosítási Archiválási azonosító: <span className="font-mono" style={{ color: '#334155' }}>{user?.id?.slice(0, 8) || 'THINGOR-PDF'}</span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
};
