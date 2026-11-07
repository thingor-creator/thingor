import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Printer,
  Download,
  QrCode,
  Share2,
  Type,
  Palette,
  RotateCcw,
  AlertTriangle,
  EyeOff,
  CheckSquare,
  Square,
  Layers,
  Plus,
  Minus,
} from 'lucide-react';
import type { Item } from '../types';
import { useApp } from '../context/AppContext';

export interface PrintableContainerInfo {
  id: string;
  name: string;
  code: string;
  locationName?: string;
}

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  shareToken?: string | null;
  container?: PrintableContainerInfo | null;
  allContainers?: PrintableContainerInfo[];
}

interface LabelEntry {
  id: string;
  url: string;
  topText: string;
  bottomText: string;
  isPrimary: boolean;
}

const PRESET_COLORS = [
  { hex: '#000000', labelHu: 'Fekete', labelEn: 'Black' },
  { hex: '#1E3A8A', labelHu: 'Sötétkék', labelEn: 'Navy' },
  { hex: '#065F46', labelHu: 'Smaragd', labelEn: 'Emerald' },
  { hex: '#7F1D1D', labelHu: 'Bordó', labelEn: 'Burgundy' },
  { hex: '#4C1D95', labelHu: 'Mélylila', labelEn: 'Purple' },
  { hex: '#334155', labelHu: 'Antracit', labelEn: 'Slate' },
];

function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return 0;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatioWithWhite(hex: string): number {
  const lum = getRelativeLuminance(hex);
  return (1.0 + 0.05) / (lum + 0.05);
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  item = null,
  shareToken = null,
  container = null,
  allContainers = [],
}) => {
  const { language, getCategoryName, getLocationPath, items } = useApp();
  const qrRef = useRef<HTMLDivElement>(null);
  const isHu = language === 'hu';

  const isContainerMode = Boolean(container && !item);

  // Default texts computed from active item or container
  const defaultTopText = useMemo(() => {
    if (isContainerMode && container) {
      return container.name || container.code;
    }
    return item?.name || (isHu ? 'Megosztott tárgy' : 'Shared Item');
  }, [isContainerMode, container, item, isHu]);

  const defaultBottomText = useMemo(() => {
    if (isContainerMode && container) {
      return [container.code, container.locationName].filter(Boolean).join(' • ');
    }
    if (item) {
      const cat = getCategoryName(item.category_id);
      const loc = getLocationPath(item.location_id);
      return [cat, loc].filter(Boolean).join(' • ');
    }
    return '';
  }, [isContainerMode, container, item, getCategoryName, getLocationPath]);

  // Label editor state (strictly local component state)
  const [topText, setTopText] = useState<string>(defaultTopText);
  const [bottomText, setBottomText] = useState<string>(defaultBottomText);
  const [showTopText, setShowTopText] = useState<boolean>(true);
  const [showBottomText, setShowBottomText] = useState<boolean>(true);
  const [qrColor, setQrColor] = useState<string>('#000000');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [copyCount, setCopyCount] = useState<number>(1);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState<boolean>(false);

  // Sync defaults when modal opens or target item/container changes
  useEffect(() => {
    if (isOpen) {
      setTopText(defaultTopText);
      setBottomText(defaultBottomText);
      setShowTopText(true);
      setShowBottomText(Boolean(defaultBottomText));
      setQrColor('#000000');
      setTextColor('#000000');
      setCopyCount(1);
      setSelectedExtraIds([]);
      setIsMultiSelectOpen(false);
    }
  }, [isOpen, defaultTopText, defaultBottomText, item?.id, container?.id]);

  if (!isOpen || (!item && !shareToken && !container)) return null;

  // Determine Primary QR Target URL (preserving exact existing target logic)
  const originBase =
    typeof window !== 'undefined'
      ? isContainerMode
        ? `${window.location.origin}${window.location.pathname}`
        : `${window.location.origin}/`
      : '';

  const primaryQrUrl = shareToken
    ? `${window.location.origin}/#share/${shareToken}`
    : isContainerMode && container
    ? `${originBase}#storage/${container.id}`
    : item
    ? `${window.location.origin}/#item/${item.id}`
    : typeof window !== 'undefined'
    ? window.location.href
    : '';

  // Contrast check for QR foreground color against white background
  const qrContrast = getContrastRatioWithWhite(qrColor);
  const isLowContrastQr = qrContrast < 3.5;

  // Build list of labels to render (supports 1 label, multiple copies, or multiple selected items/containers)
  const labelEntries: LabelEntry[] = [];

  const primaryEntry: LabelEntry = {
    id: isContainerMode && container ? container.id : item?.id || 'primary',
    url: primaryQrUrl,
    topText,
    bottomText,
    isPrimary: true,
  };

  for (let i = 0; i < Math.max(1, copyCount); i++) {
    labelEntries.push({
      ...primaryEntry,
      id: `${primaryEntry.id}-copy-${i}`,
    });
  }

  if (isContainerMode) {
    selectedExtraIds.forEach((extraId) => {
      const found = allContainers.find((c) => c.id === extraId);
      if (found && found.id !== container?.id) {
        labelEntries.push({
          id: `extra-cont-${found.id}`,
          url: `${originBase}#storage/${found.id}`,
          topText: found.name || found.code,
          bottomText: [found.code, found.locationName].filter(Boolean).join(' • '),
          isPrimary: false,
        });
      }
    });
  } else {
    selectedExtraIds.forEach((extraId) => {
      const found = items.find((it) => it.id === extraId);
      if (found && found.id !== item?.id) {
        const cat = getCategoryName(found.category_id);
        const loc = getLocationPath(found.location_id);
        labelEntries.push({
          id: `extra-item-${found.id}`,
          url: `${window.location.origin}/#item/${found.id}`,
          topText: found.name,
          bottomText: [cat, loc].filter(Boolean).join(' • '),
          isPrimary: false,
        });
      }
    });
  }

  const toggleExtraSelection = (id: string) => {
    setSelectedExtraIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const extraCandidates = isContainerMode
    ? allContainers.filter((c) => c.id !== container?.id)
    : items
        .filter((it) => it.id !== item?.id)
        .map((it) => ({
          id: it.id,
          name: it.name,
          code: getCategoryName(it.category_id),
        }));

  const handleResetDefaults = () => {
    setTopText(defaultTopText);
    setBottomText(defaultBottomText);
    setShowTopText(true);
    setShowBottomText(Boolean(defaultBottomText));
    setQrColor('#000000');
    setTextColor('#000000');
    setCopyCount(1);
    setSelectedExtraIds([]);
  };

  const handleQrOnlyMode = () => {
    const currentlyQrOnly = !showTopText && !showBottomText;
    if (currentlyQrOnly) {
      setShowTopText(true);
      setShowBottomText(Boolean(bottomText.trim() || defaultBottomText));
      if (!topText.trim()) setTopText(defaultTopText);
      if (!bottomText.trim()) setBottomText(defaultBottomText);
    } else {
      setShowTopText(false);
      setShowBottomText(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const effectiveTop = showTopText ? topText.trim() : '';
    const effectiveBottom = showBottomText ? bottomText.trim() : '';

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const width = 320;
      const topHeight = effectiveTop ? 44 : 0;
      const bottomHeight = effectiveBottom ? 40 : 0;
      const qrBoxSize = 240;
      const padding = 20;
      const height = padding * 2 + topHeight + qrBoxSize + bottomHeight;

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;

        let currentY = padding;

        if (effectiveTop) {
          ctx.font = 'bold 16px Inter, sans-serif';
          ctx.fillText(effectiveTop.slice(0, 34), width / 2, currentY + 22, width - 24);
          currentY += topHeight;
        }

        const qrX = (width - qrBoxSize) / 2;
        ctx.drawImage(img, qrX, currentY, qrBoxSize, qrBoxSize);
        currentY += qrBoxSize;

        if (effectiveBottom) {
          ctx.font = '600 13px Inter, sans-serif';
          ctx.fillText(effectiveBottom.slice(0, 42), width / 2, currentY + 24, width - 24);
        }

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        const baseName = (effectiveTop || defaultTopText || 'QR').replace(/\s+/g, '_');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${baseName}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const isQrOnly =
    (!showTopText || topText.trim().length === 0) &&
    (!showBottomText || bottomText.trim().length === 0);

  return createPortal(
    <div
      id="qr-print-portal-root"
      className="qr-print-reset fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Scoped print CSS overriding index.css to prevent blank pages, vertical centering, and page overflow */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 8mm;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html body > *:not(#qr-print-portal-root) {
            display: none !important;
          }
          html body #qr-print-portal-root .qr-print-hide {
            display: none !important;
          }
          html body #qr-print-portal-root,
          html body #qr-print-portal-root .qr-print-reset {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
            backdrop-filter: none !important;
            visibility: visible !important;
          }
          html body #printable-qr-label,
          html body #printable-qr-label * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html body #printable-qr-label {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: flex-start !important;
            align-content: flex-start !important;
            justify-content: flex-start !important;
            gap: 10px !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            z-index: auto !important;
          }
          html body #printable-qr-label .qr-label-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div className="qr-print-reset relative w-full max-w-3xl rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="qr-print-hide flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {isContainerMode
                  ? isHu
                    ? 'Tároló QR-címke és Nyomtatás'
                    : 'Container QR Label & Print'
                  : isHu
                  ? 'Tárgy QR-címke és Nyomtatás'
                  : 'Item QR Label & Print'}
              </h3>
              <p className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                {isHu
                  ? 'Testreszabható, nyomtatható fizikai azonosító címke'
                  : 'Customizable printable physical identification label'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              title={isHu ? 'Alapértelmezések visszaállítása' : 'Reset defaults'}
              className="p-2 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Editor + Live Preview */}
        <div className="qr-print-reset p-4 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Label Customization Controls */}
          <div className="qr-print-hide md:col-span-7 space-y-4 text-left">
            {/* Quick Mode Toggle: Text vs QR-only */}
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Címke szövegezése' : 'Label Text Options'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleQrOnlyMode}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  isQrOnly
                    ? 'bg-[var(--color-primary-blue,#2563EB)] text-white border-blue-400'
                    : 'bg-[var(--card-bg,#3A4551)] text-[var(--text-sub,#B5BDC6)] hover:text-white border-[var(--border-color,#56616D)]'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>{isHu ? 'Csak QR-kód (szöveg nélkül)' : 'QR Only (No Text)'}</span>
              </button>
            </div>

            {/* A) Top Text Control */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-main,#E0E3E6)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTopText}
                    onChange={(e) => setShowTopText(e.target.checked)}
                    className="rounded border-[var(--border-color,#56616D)] accent-[var(--color-primary-blue,#2563EB)] w-4 h-4 cursor-pointer"
                  />
                  <span>{isHu ? 'Felső szöveg (Név / Azonosító)' : 'Top Text (Name / ID)'}</span>
                </label>
                {showTopText && topText && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopText('');
                      setShowTopText(false);
                    }}
                    className="text-[11px] text-rose-300 hover:text-rose-200 font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                  >
                    {isHu ? 'Törlés / Kikapcsolás' : 'Clear / Hide'}
                  </button>
                )}
              </div>
              {showTopText && (
                <div className="relative">
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder={
                      isHu ? 'Írd be a felső szöveget...' : 'Enter top label text...'
                    }
                    className="w-full px-3 py-2 pr-8 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                  {topText && (
                    <button
                      type="button"
                      onClick={() => setTopText('')}
                      title={isHu ? 'Szöveg ürítése' : 'Clear text'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)] hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* B) Bottom Text Control */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-main,#E0E3E6)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBottomText}
                    onChange={(e) => setShowBottomText(e.target.checked)}
                    className="rounded border-[var(--border-color,#56616D)] accent-[var(--color-primary-blue,#2563EB)] w-4 h-4 cursor-pointer"
                  />
                  <span>
                    {isHu
                      ? 'Alsó szöveg (Kategória / Hely / Kód)'
                      : 'Bottom Text (Category / Location / Code)'}
                  </span>
                </label>
                {showBottomText && bottomText && (
                  <button
                    type="button"
                    onClick={() => {
                      setBottomText('');
                      setShowBottomText(false);
                    }}
                    className="text-[11px] text-rose-300 hover:text-rose-200 font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                  >
                    {isHu ? 'Törlés / Kikapcsolás' : 'Clear / Hide'}
                  </button>
                )}
              </div>
              {showBottomText && (
                <div className="relative">
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder={
                      isHu ? 'Írd be az alsó szöveget...' : 'Enter bottom label text...'
                    }
                    className="w-full px-3 py-2 pr-8 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                  {bottomText && (
                    <button
                      type="button"
                      onClick={() => setBottomText('')}
                      title={isHu ? 'Szöveg ürítése' : 'Clear text'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)] hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Color Customization: QR Color & Text Color */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Színbeállítások (fehér háttéren)' : 'Color Settings (on white background)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* QR Code Color */}
                <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'QR-kód színe' : 'QR Code Color'}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="color"
                        value={qrColor}
                        onChange={(e) => setQrColor(e.target.value)}
                        aria-label={isHu ? 'QR-kód színe' : 'QR Code Color'}
                        className="w-6 h-6 rounded cursor-pointer border border-[var(--border-color,#56616D)] bg-transparent p-0"
                      />
                      <span className="text-[10px] font-mono text-[var(--text-main,#E0E3E6)] uppercase">
                        {qrColor}
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={`qr-${preset.hex}`}
                        type="button"
                        onClick={() => setQrColor(preset.hex)}
                        title={isHu ? preset.labelHu : preset.labelEn}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          qrColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-white scale-110 ring-1 ring-blue-400'
                            : 'border-white/30 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Text Color */}
                <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Szöveg színe' : 'Text Color'}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        aria-label={isHu ? 'Szöveg színe' : 'Text Color'}
                        className="w-6 h-6 rounded cursor-pointer border border-[var(--border-color,#56616D)] bg-transparent p-0"
                      />
                      <span className="text-[10px] font-mono text-[var(--text-main,#E0E3E6)] uppercase">
                        {textColor}
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={`txt-${preset.hex}`}
                        type="button"
                        onClick={() => setTextColor(preset.hex)}
                        title={isHu ? preset.labelHu : preset.labelEn}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          textColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-white scale-110 ring-1 ring-blue-400'
                            : 'border-white/30 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {isLowContrastQr && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {isHu
                      ? 'Figyelem: A választott QR-kód szín túl világos a fehér háttéren, ami ronthatja a beolvashatóságot. Javasoljuk sötétebb szín választását!'
                      : 'Warning: Selected QR color has low contrast on white background and may fail scanning.'}
                  </span>
                </div>
              )}
            </div>

            {/* Multi-label / Batch Printing Controls */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                  <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                    {isHu ? 'Példányszám / Több címke nyomtatása' : 'Copies / Multi-label Print'}
                  </span>
                </div>

                {/* Copies stepper */}
                <div className="flex items-center gap-1.5 bg-[var(--card-bg,#3A4551)] px-2 py-1 rounded-xl border border-[var(--border-color,#56616D)]">
                  <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] mr-1">
                    {isHu ? 'Példány:' : 'Copies:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCopyCount((c) => Math.max(1, c - 1))}
                    className="p-1 rounded-lg hover:bg-[var(--surface-bg,#465362)] text-white cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-white min-w-[20px] text-center">
                    {copyCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCopyCount((c) => Math.min(24, c + 1))}
                    className="p-1 rounded-lg hover:bg-[var(--surface-bg,#465362)] text-white cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {extraCandidates.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsMultiSelectOpen((v) => !v)}
                    className="text-[11px] font-semibold text-blue-300 hover:text-blue-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      {isContainerMode
                        ? isHu
                          ? `További tárolók hozzáadása ugyanerre a lapra (${selectedExtraIds.length} kijelölve)`
                          : `Add more containers to this sheet (${selectedExtraIds.length} selected)`
                        : isHu
                        ? `További tárgyak hozzáadása ugyanerre a lapra (${selectedExtraIds.length} kijelölve)`
                        : `Add more items to this sheet (${selectedExtraIds.length} selected)`}
                    </span>
                  </button>

                  {isMultiSelectOpen && (
                    <div className="mt-2 p-2 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] max-h-32 overflow-y-auto space-y-1">
                      <div className="flex items-center justify-between pb-1 mb-1 border-b border-[var(--border-color,#56616D)]/50 px-1">
                        <span className="text-[10px] text-[var(--text-sub,#B5BDC6)]">
                          {isHu ? 'Válassz további elemeket:' : 'Select additional items:'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedExtraIds(
                              selectedExtraIds.length === extraCandidates.length
                                ? []
                                : extraCandidates.map((c) => c.id)
                            )
                          }
                          className="text-[10px] font-bold text-blue-300 hover:underline cursor-pointer"
                        >
                          {selectedExtraIds.length === extraCandidates.length
                            ? isHu
                              ? 'Kijelölés törlése'
                              : 'Clear all'
                            : isHu
                            ? 'Összes kijelölése'
                            : 'Select all'}
                        </button>
                      </div>
                      {extraCandidates.map((cand) => {
                        const checked = selectedExtraIds.includes(cand.id);
                        return (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => toggleExtraSelection(cand.id)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-[var(--surface-bg,#465362)] text-left text-xs text-[var(--text-main,#E0E3E6)] cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {checked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-[var(--text-sub,#B5BDC6)] shrink-0" />
                              )}
                              <span className="truncate font-medium">{cand.name}</span>
                            </div>
                            {cand.code && (
                              <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] shrink-0 font-mono">
                                {cand.code}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Real-time Print Preview & Printable Container */}
          <div className="qr-print-reset md:col-span-5 flex flex-col items-center w-full space-y-3">
            <div className="qr-print-hide flex items-center justify-between w-full px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Valós idejű előnézet' : 'Live Print Preview'}
              </span>
              <span className="text-[11px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {labelEntries.length} {isHu ? 'db címke' : 'label(s)'}
              </span>
            </div>

            {/* Preview Box Container (becomes transparent static flow in @media print) */}
            <div className="qr-print-reset w-full rounded-2xl bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)] p-4 flex flex-col items-center justify-center min-h-[250px] max-h-[380px] overflow-y-auto">
              <div
                id="printable-qr-label"
                className="flex flex-wrap items-start justify-center gap-3 w-full"
              >
                {labelEntries.map((entry, idx) => {
                  const rawTop = entry.isPrimary ? topText : entry.topText;
                  const rawBottom = entry.isPrimary ? bottomText : entry.bottomText;
                  const effectiveTop = showTopText ? rawTop.trim() : '';
                  const effectiveBottom = showBottomText ? rawBottom.trim() : '';
                  const hasTop = effectiveTop.length > 0;
                  const hasBottom = effectiveBottom.length > 0;
                  const cardQrOnly = !hasTop && !hasBottom;

                  return (
                    <div
                      key={entry.id}
                      ref={idx === 0 ? qrRef : undefined}
                      className={`qr-label-card flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-300 shadow-sm ${
                        cardQrOnly
                          ? 'p-3 w-fit'
                          : 'px-4 py-3.5 w-[210px] space-y-2'
                      }`}
                    >
                      {hasTop && (
                        <div
                          className="qr-label-top-text text-sm font-extrabold leading-snug break-words w-full px-1"
                          style={{ color: textColor }}
                        >
                          {effectiveTop}
                        </div>
                      )}

                      {/* QR Code with guaranteed white quiet zone */}
                      <div className="p-1.5 rounded-xl bg-white flex items-center justify-center mx-auto">
                        <QRCodeSVG
                          value={entry.url}
                          size={156}
                          bgColor="#FFFFFF"
                          fgColor={qrColor}
                          level="M"
                          includeMargin={true}
                        />
                      </div>

                      {hasBottom && (
                        <div
                          className="qr-label-bottom-text text-xs font-semibold leading-snug break-words w-full px-1"
                          style={{ color: textColor }}
                        >
                          {effectiveBottom}
                        </div>
                      )}

                      {shareToken && entry.isPrimary && !cardQrOnly && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          <Share2 className="h-3 w-3" />
                          <span>{isHu ? 'Vendég Megosztás' : 'Guest Share'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="qr-print-hide text-[11px] text-[var(--text-sub,#B5BDC6)] text-center leading-relaxed px-1">
              {isContainerMode
                ? isHu
                  ? 'A QR-kód beolvasása a Thingor szkennerével közvetlenül ezt a fizikai tárolót nyitja meg.'
                  : 'Scanning this QR code opens this storage container directly in Thingor.'
                : isHu
                ? 'A QR-kód beolvasása közvetlenül megnyitja a tárgy adatlapját a gyors azonosításhoz.'
                : 'Scanning this QR code opens the item details directly for instant identification.'}
            </p>

            {/* Action Buttons */}
            <div className="qr-print-hide grid grid-cols-2 gap-2.5 w-full pt-1">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>{isHu ? 'Nyomtatás' : 'Print Label'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] font-semibold text-xs border border-[var(--border-color,#56616D)] transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{isHu ? 'QR Mentése' : 'Save Image'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
