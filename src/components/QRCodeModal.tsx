import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, QrCode, Tag, MapPin, Share2 } from 'lucide-react';
import type { Item } from '../types';
import { useApp } from '../context/AppContext';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  shareToken?: string | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  item,
  shareToken,
}) => {
  const { language, getCategoryName, getLocationPath } = useApp();
  const qrRef = useRef<HTMLDivElement>(null);
  const isHu = language === 'hu';

  if (!isOpen || (!item && !shareToken)) return null;

  const itemName = item?.name || (isHu ? 'Megosztott tárgy' : 'Shared Item');
  const categoryName = item ? getCategoryName(item.category_id) : '';
  const locationPath = item ? getLocationPath(item.location_id) : '';

  // Determine QR Target URL
  const qrTargetUrl = shareToken
    ? `${window.location.origin}/#share/${shareToken}`
    : item
    ? `${window.location.origin}/#item/${item.id}`
    : window.location.href;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 10, 10, 280, 280);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${itemName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {isHu ? 'Tárgy QR-kódja' : 'Item QR Code'}
              </h3>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Nyomtatható fizikai azonosító címke' : 'Printable physical identification label'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex flex-col items-center text-center">
          
          {/* Printable Container */}
          <div
            id="printable-qr-label"
            className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-white text-slate-950 shadow-inner w-full max-w-[280px]"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <QrCode className="h-3.5 w-3.5" />
              <span>Thingor Inventory</span>
            </div>

            <h4 className="text-base font-extrabold text-slate-900 line-clamp-2 px-1">
              {itemName}
            </h4>

            {/* QR Code SVG */}
            <div ref={qrRef} className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <QRCodeSVG
                value={qrTargetUrl}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#090D16"
                level="M"
                includeMargin={false}
              />
            </div>

            {(categoryName || locationPath) && (
              <div className="space-y-1 text-xs text-slate-600 font-medium">
                {categoryName && (
                  <div className="flex items-center justify-center gap-1">
                    <Tag className="h-3 w-3 text-slate-500" />
                    <span>{categoryName}</span>
                  </div>
                )}
                {locationPath && (
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{locationPath}</span>
                  </div>
                )}
              </div>
            )}

            {shareToken && (
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                <Share2 className="h-3 w-3" />
                <span>{isHu ? 'Vendég Megosztás' : 'Guest Share'}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-xs">
            {isHu
              ? 'Nyomtasd ki a QR kódos címkét és ragaszd a tárgyra vagy a tárolódobozra a gyors mobil azonosításhoz.'
              : 'Print the QR label and attach it to the item or box for instant mobile identification.'}
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full pt-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01]"
            >
              <Printer className="h-4 w-4" />
              <span>{isHu ? 'Nyomtatás' : 'Print Label'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] font-semibold text-xs border border-[var(--border-color,#56616D)] transition-all"
            >
              <Download className="h-4 w-4" />
              <span>{isHu ? 'QR Mentése' : 'Save Image'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
