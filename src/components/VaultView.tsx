import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Shield,
  KeyRound,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  FolderLock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Item, ItemDocument } from '../types';

export const VaultView: React.FC = () => {
  const {
    items,
    documents,
    vaultSettings,
    isVaultUnlocked,
    unlockVault,
    lockVault,
    setupVaultPin,
    changeVaultPin,
    setItemVaultProtection,
    setDocumentVaultProtection,
    setSelectedItemId,
    language
  } = useApp();

  // PIN Input states
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'documents'>('items');

  // Change PIN modal state
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');

  // Add Item to Vault modal state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<string>('');

  // Keypad number press helper
  const handleNumClick = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  // Keyboard support for PIN entry
  useEffect(() => {
    if (isVaultUnlocked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) setPin(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isVaultUnlocked, vaultSettings]);

  // Handle Unlock
  const handleUnlock = async () => {
    if (!pin) {
      setErrorMessage('Kérjük, add meg a PIN kódot!');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await unlockVault(pin);
      if (!res.success) {
        setErrorMessage(res.error || 'Helytelen PIN kód!');
        setPin('');
      } else {
        setPin('');
      }
    } catch {
      setErrorMessage('Hiba történt a feloldás során.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Initial PIN setup
  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMessage('A PIN kódnak legalább 4 számjegyűnek kell lennie!');
      return;
    }
    if (pin !== pinConfirm) {
      setErrorMessage('A megerősítő PIN kód nem egyezik!');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const ok = await setupVaultPin(pin);
      if (ok) {
        setPin('');
        setPinConfirm('');
        setSuccessMessage('A Széf PIN kód sikeresen beállítva és aktiválva!');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage('Nem sikerült beállítani a PIN kódot.');
      }
    } catch {
      setErrorMessage('Hiba történt a PIN beállítása során.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Change PIN
  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setErrorMessage('Az új PIN legalább 4 karakter legyen!');
      return;
    }
    if (newPin !== newPinConfirm) {
      setErrorMessage('Az új PIN megerősítése nem egyezik!');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await changeVaultPin(oldPin, newPin);
      if (res.success) {
        setIsChangePinOpen(false);
        setOldPin('');
        setNewPin('');
        setNewPinConfirm('');
        setSuccessMessage('A PIN kód sikeresen megváltoztatva!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(res.error || 'Hiba a PIN módosításakor.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move item to vault
  const handleAddItemToVault = async () => {
    if (!selectedItemToAdd) return;
    await setItemVaultProtection(selectedItemToAdd, true);
    setIsAddItemModalOpen(false);
    setSelectedItemToAdd('');
    setSuccessMessage('A tárgy sikeresen átkerült a védett széfbe!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Protected items and documents
  const vaultItems = items.filter(i => i.is_vault_protected);
  const vaultDocuments = documents.filter(d => d.is_vault_protected);

  const availableItemsToProtect = items.filter(i => !i.is_vault_protected);

  const totalVaultValue = vaultItems.reduce((acc, item) => {
    const val = item.current_value ?? item.purchase_price ?? 0;
    return acc + Number(val);
  }, 0);

  // 1. ÁLLAPOT: Nincs még beállítva PIN kód
  if (!vaultSettings) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-8 shadow-2xl text-center backdrop-blur-md">
          <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Shield className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Védett Terület — Thingor Széf</h2>
          <p className="text-sm text-[var(--text-sub)] mb-8 leading-relaxed">
            Biztosítsd a legérzékenyebb értéktárgyaidat, fontos számláidat és szerződéseidet egyedi PIN-kóddal titkosított széfben. 
            A védelem azonnal blokkolja az illetéktelen hozzáférést.
          </p>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3 text-left">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSetupPin} className="space-y-6 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)] mb-2">
                Új PIN kód (4–6 számjegy)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-mono px-4 py-3 bg-[var(--surface-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)] mb-2">
                PIN kód megerősítése
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinConfirm}
                onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-mono px-4 py-3 bg-[var(--surface-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || pin.length < 4}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <KeyRound className="w-5 h-5" />
              <span>Széf aktiválása PIN kóddal</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. ÁLLAPOT: Széf le van zárva -> PIN billentyűzet & feloldó képernyő
  if (!isVaultUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden backdrop-blur-xl">
          {/* Háttér fény aura */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-1">Thingor Széf Zárolva</h2>
          <p className="text-xs text-[var(--text-sub)] mb-6">
            Add meg a 4–6 számjegyű biztonsági PIN kódodat a védett adatok megtekintéséhez.
          </p>

          {/* PIN Dots kijelző */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110'
                    : 'bg-[var(--border-color)]'
                }`}
              />
            ))}
            {pin.length > 4 && (
              <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110" />
            )}
            {pin.length > 5 && (
              <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110" />
            )}
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 justify-center">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Virtuális numerikus billentyűzet */}
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-[280px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num)}
                className="h-14 bg-[var(--surface-bg)] hover:bg-[var(--border-color)] active:scale-95 text-xl font-semibold text-[var(--text-main)] rounded-2xl border border-[var(--border-color)] transition-all flex items-center justify-center shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-14 bg-[var(--surface-bg)] hover:bg-red-500/10 active:scale-95 text-xs font-semibold text-red-400 rounded-2xl border border-[var(--border-color)] transition-all flex items-center justify-center"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              className="h-14 bg-[var(--surface-bg)] hover:bg-[var(--border-color)] active:scale-95 text-xl font-semibold text-[var(--text-main)] rounded-2xl border border-[var(--border-color)] transition-all flex items-center justify-center shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 bg-[var(--surface-bg)] hover:bg-[var(--border-color)] active:scale-95 text-sm font-semibold text-[var(--text-sub)] rounded-2xl border border-[var(--border-color)] transition-all flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            disabled={isSubmitting || pin.length < 4}
            onClick={handleUnlock}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Unlock className="w-5 h-5" />
            <span>Széf feloldása</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. ÁLLAPOT: Széf FEL VAN OLDVA
  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Értesítések */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Széf Fejléc és Műveletek */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <Unlock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--text-main)]">Thingor Széf</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Feloldva
              </span>
            </div>
            <p className="text-xs text-[var(--text-sub)] mt-1">
              Aktív biztonságos munkamenet (5 perc inaktivitás után automatikusan lezárul).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tárgy széfbe helyezése</span>
          </button>
          <button
            onClick={() => setIsChangePinOpen(true)}
            className="px-3.5 py-2.5 bg-[var(--surface-bg)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-xl text-sm font-medium border border-[var(--border-color)] transition-colors flex items-center gap-2"
            title="PIN kód módosítása"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">PIN módosítása</span>
          </button>
          <button
            onClick={lockVault}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Lezárás most</span>
          </button>
        </div>
      </div>

      {/* Széf Statisztika */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-sub)] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Védett Tárgyak</span>
            <FolderLock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)]">{vaultItems.length} db</div>
          <p className="text-xs text-[var(--text-sub)] mt-1">Zárolt személyes leltári elem</p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-sub)] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Védett Érték</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {totalVaultValue.toLocaleString('hu-HU')} Ft
          </div>
          <p className="text-xs text-[var(--text-sub)] mt-1">Összesített széf leltárérték</p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-sub)] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Bizalmas Fájlok</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)]">{vaultDocuments.length} db</div>
          <p className="text-xs text-[var(--text-sub)] mt-1">Számla, garancia & szerződés</p>
        </div>
      </div>

      {/* Fülek (Védett Tárgyak / Védett Dokumentumok) */}
      <div className="flex border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'items'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--text-sub)] hover:text-[var(--text-main)]'
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>Védett Tárgyak ({vaultItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--text-sub)] hover:text-[var(--text-main)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Védett Dokumentumok ({vaultDocuments.length})</span>
        </button>
      </div>

      {/* TAB 1: Védett Tárgyak */}
      {activeTab === 'items' && (
        <div>
          {vaultItems.length === 0 ? (
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
              <FolderLock className="w-12 h-12 text-[var(--text-sub)] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-[var(--text-main)] mb-1">Még nincsenek tárgyak a széfben</h3>
              <p className="text-xs text-[var(--text-sub)] max-w-md mx-auto mb-6">
                Helyezz el érzékeny értéktárgyakat (pl. órák, ékszerek, készpénz, széf kulcsok), hogy kizárólag PIN feloldás után legyenek elérhetők.
              </p>
              <button
                onClick={() => setIsAddItemModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tárgy hozzáadása a széfhez</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vaultItems.map(item => (
                <div
                  key={item.id}
                  className="bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-indigo-500/50 rounded-2xl p-4 shadow-sm transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                            <Lock className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-sm text-[var(--text-main)] group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {item.name}
                          </h4>
                          <span className="text-xs text-[var(--text-sub)]">
                            {item.condition || 'Normál állapot'}
                          </span>
                        </div>
                      </div>

                      <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400" title="Széfben őrzött">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-[var(--text-sub)] line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs py-2 border-t border-[var(--border-color)]">
                      <span className="text-[var(--text-sub)]">Becsült érték:</span>
                      <span className="font-bold text-[var(--text-main)]">
                        {item.current_value || item.purchase_price
                          ? `${Number(item.current_value || item.purchase_price).toLocaleString('hu-HU')} Ft`
                          : 'Nincs megadva'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
                    <button
                      onClick={() => setSelectedItemId(item.id)}
                      className="flex-1 py-1.5 px-3 bg-[var(--surface-bg)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Részletek</span>
                    </button>
                    <button
                      onClick={() => setItemVaultProtection(item.id, false)}
                      className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                      title="Kivétel a széfből normál leltárba"
                    >
                      Kivétel a széfből
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Védett Dokumentumok */}
      {activeTab === 'documents' && (
        <div>
          {vaultDocuments.length === 0 ? (
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-[var(--text-sub)] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-[var(--text-main)] mb-1">Nincsenek védett dokumentumok</h3>
              <p className="text-xs text-[var(--text-sub)] max-w-md mx-auto">
                A tárgyakhoz csatolt dokumentumoknál beállítható a széf védelem a bizalmas számlák és garanciák elrejtéséhez.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-[var(--border-color)]">
                {vaultDocuments.map(doc => {
                  const parentItem = items.find(i => i.id === doc.item_id);
                  return (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-[var(--surface-bg)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--text-main)]">{doc.file_name}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--surface-bg)] text-[var(--text-sub)] border border-[var(--border-color)]">
                              {doc.document_type}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--text-sub)]">
                            Kapcsolódó tárgy: {parentItem?.name || 'Ismeretlen'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[var(--surface-bg)] hover:bg-[var(--border-color)] text-[var(--text-main)] transition-colors"
                            title="Megnyitás"
                          >
                            <ExternalLink className="w-4 h-4 text-indigo-400" />
                          </a>
                        )}
                        <button
                          onClick={() => setDocumentVaultProtection(doc.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                        >
                          Feloldás
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Tárgy széfbe helyezése */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
              <FolderLock className="w-5 h-5 text-indigo-400" />
              <span>Tárgy széfbe helyezése</span>
            </h3>
            <p className="text-xs text-[var(--text-sub)] mb-4">
              Válaszd ki azt a meglévő leltári elemet, amit a védett széfbe szeretnél költöztetni.
            </p>

            {availableItemsToProtect.length === 0 ? (
              <p className="text-xs text-amber-400 py-4">Minden meglévő tárgyad már a széfben van vagy nincs leltározott tárgy!</p>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedItemToAdd}
                  onChange={e => setSelectedItemToAdd(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--surface-bg)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Válassz egy tárgyat --</option>
                  {availableItemsToProtect.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.current_value ? `(${item.current_value.toLocaleString('hu-HU')} Ft)` : ''}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddItemModalOpen(false);
                      setSelectedItemToAdd('');
                    }}
                    className="px-4 py-2 bg-[var(--surface-bg)] hover:bg-[var(--border-color)] text-[var(--text-sub)] rounded-xl text-xs font-semibold"
                  >
                    Mégse
                  </button>
                  <button
                    type="button"
                    disabled={!selectedItemToAdd}
                    onClick={handleAddItemToVault}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                  >
                    Széfbe helyezés
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: PIN kód módosítása */}
      {isChangePinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>PIN kód megváltoztatása</span>
            </h3>
            <p className="text-xs text-[var(--text-sub)] mb-4">
              Add meg a jelenlegi kódodat és az új 4–6 számjegyű kódot.
            </p>

            <form onSubmit={handleChangePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                  Jelenlegi PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={oldPin}
                  onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-[var(--surface-bg)] border border-[var(--border-color)] rounded-xl text-center text-sm font-mono text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                  Új PIN kód
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-[var(--surface-bg)] border border-[var(--border-color)] rounded-xl text-center text-sm font-mono text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                  Új PIN megerősítése
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPinConfirm}
                  onChange={e => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-[var(--surface-bg)] border border-[var(--border-color)] rounded-xl text-center text-sm font-mono text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePinOpen(false)}
                  className="px-4 py-2 bg-[var(--surface-bg)] hover:bg-[var(--border-color)] text-[var(--text-sub)] rounded-xl text-xs font-semibold"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPin.length < 4}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
