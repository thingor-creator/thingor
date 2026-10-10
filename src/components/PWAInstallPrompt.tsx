import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Check if user previously dismissed prompt in this session
    const dismissed = sessionStorage.getItem('thingor_pwa_prompt_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Listen for beforeinstallprompt event (Chromium browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  // Only render if browser captured beforeinstallprompt or on iOS Safari
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalledSuccess(true);
      setTimeout(() => {
        setIsDismissed(true);
      }, 3000);
    } else {
      handleDismiss();
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('thingor_pwa_prompt_dismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 bg-[var(--card-bg,#3A4551)]/95 backdrop-blur-md border border-[var(--border-color,#56616D)] rounded-2xl p-4 shadow-2xl animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md shadow-blue-500/20">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-1.5">
              <span>Telepítsd a Thingor-t</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)]">
                PWA
              </span>
            </h4>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5 leading-snug">
              Érd el leltáradat egyetlen kattintással a telefonod kezdőképernyőjéről!
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] p-1.5 rounded-lg hover:bg-[var(--surface-bg,#465362)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue,#2563EB)]"
          title="Bezárás"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isInstalledSuccess ? (
        <div className="mt-3 p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 border border-emerald-500/30">
          <Check className="w-4 h-4 text-emerald-400" />
          Sikeresen hozzáadva a kezdőképernyőhöz!
        </div>
      ) : isIOS ? (
        <div className="mt-3 text-[11px] text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] p-2.5 rounded-xl border border-[var(--border-color,#56616D)] leading-relaxed">
          Koppints a Safari <span className="font-bold text-[var(--color-primary-blue,#2563EB)]">Megosztás (Share)</span> gombjára, majd válaszd a <span className="font-bold text-[var(--color-primary-blue,#2563EB)]">"Hozzáadás a kezdőképernyőhöz"</span> lehetőséget.
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue,#2563EB)] focus:ring-offset-2 focus:ring-offset-[var(--card-bg,#3A4551)]"
          >
            <Download className="w-4 h-4" />
            <span>Telepítés</span>
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] border border-[var(--border-color,#56616D)] font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-color,#56616D)]"
          >
            Most nem
          </button>
        </div>
      )}
    </div>
  );
};
