import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, ArrowLeft, Search, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const { language } = useApp();
  const isHu = language === 'hu';

  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessText, setScanSuccessText] = useState<string | null>(null);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = 'qr-scanner-region';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;
    setScannerError(null);
    setScanSuccessText(null);

    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerRegionId);
        html5QrcodeRef.current = html5Qrcode;

        const config = {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        };

        setIsScanning(true);

        await html5Qrcode.start(
          { facingMode: 'environment' }, // Prefer back camera on phones
          config,
          (decodedText) => {
            if (isMounted) {
              setScanSuccessText(isHu ? 'Sikeres beolvasás!' : 'Scan successful!');
              stopScanner();
              setTimeout(() => {
                onScanResult(decodedText);
              }, 400);
            }
          },
          () => {
            // Ignore frame scan failures
          }
        );
      } catch (err: any) {
        if (isMounted) {
          setIsScanning(false);
          const errMsg = err?.message || err || '';
          if (errMsg.includes('Permission') || errMsg.includes('allowed')) {
            setScannerError(
              isHu
                ? 'Kameraengedély megtagadva. Kérjük, engedélyezd a kamerát a böngésző beállításaiban.'
                : 'Camera permission denied. Please allow camera access in your browser settings.'
            );
          } else if (!window.isSecureContext) {
            setScannerError(
              isHu
                ? 'A kamera használatához biztonságos (HTTPS) kapcsolat szükséges.'
                : 'HTTPS connection is required to use camera.'
            );
          } else {
            setScannerError(
              isHu
                ? 'Kamera nem található vagy jelenleg nem érhető el.'
                : 'Camera not found or unavailable.'
            );
          }
        }
      }
    };

    // Small timeout to allow DOM element to render
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (e) {
        // Ignore stop errors
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onScanResult(manualInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)]">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {isHu ? 'QR Kód Beolvasása' : 'Scan QR Code'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport / Scanner Body */}
        <div className="p-6 space-y-5 flex flex-col items-center">
          
          {scanSuccessText && (
            <div className="w-full p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold animate-pulse">
              <CheckCircle2 className="h-5 w-5" />
              <span>{scanSuccessText}</span>
            </div>
          )}

          {scannerError ? (
            /* Error Fallback */
            <div className="w-full p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
              <div className="text-xs text-rose-300 leading-relaxed font-medium">
                {scannerError}
              </div>
            </div>
          ) : (
            /* Camera Scanner Container */
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black border-2 border-dashed border-[var(--color-primary-blue,#2563EB)]/50 flex items-center justify-center shadow-inner">
              <div id={scannerRegionId} className="w-full h-full overflow-hidden" />

              {isScanning && !scanSuccessText && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-[var(--color-primary-blue,#2563EB)] rounded-xl relative shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[var(--color-primary-blue,#2563EB)] -mt-1 -ml-1 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[var(--color-primary-blue,#2563EB)] -mt-1 -mr-1 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[var(--color-primary-blue,#2563EB)] -mb-1 -ml-1 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[var(--color-primary-blue,#2563EB)] -mb-1 -mr-1 rounded-br" />
                    {/* Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-[var(--color-primary-blue,#2563EB)] shadow-[0_0_8px_#2563EB] animate-pulse top-1/2 relative" />
                  </div>
                  <p className="text-xs text-[var(--color-primary-blue,#2563EB)] font-semibold mt-4 bg-black/80 px-3 py-1 rounded-full border border-[var(--color-primary-blue,#2563EB)]/40">
                    {isHu ? 'Tartsd a QR kódot a keretbe...' : 'Align QR code inside frame...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="w-full border-t border-[var(--border-color,#56616D)] pt-4">
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Manuális azonosító vagy URL' : 'Manual Item ID or URL'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={isHu ? 'Pl: c03a985... vagy URL' : 'E.g. c03a985... or URL'}
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/60 focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] focus:ring-1 focus:ring-[var(--color-primary-blue,#2563EB)] transition shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] disabled:opacity-50 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all shrink-0 hover:scale-[1.01]"
                >
                  <Search className="h-4 w-4" />
                  <span>{isHu ? 'Megnyitás' : 'Open'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
