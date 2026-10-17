import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
  User,
  Palette,
  Globe,
  Bell,
  Lock,
  Database,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Trash2,
  KeyRound,
  Mail,
  Smartphone,
  ExternalLink,
  Shield,
  CreditCard,
  Wrench,
  Check,
  Boxes,
  Package,
  Users,
  Handshake,
  Layers,
  ShoppingBag,
  StickyNote,
  ShoppingCart,
  LayoutDashboard,
  Plus,
  Menu,
} from 'lucide-react';

type SettingsTab = 'account' | 'appearance' | 'regional' | 'notifications' | 'security' | 'data';

const BOTTOM_BAR_OPTIONS = [
  { id: 'items', labelHu: 'Tárgyaim', labelEn: 'Items', icon: Boxes },
  { id: 'storage', labelHu: 'Tárolók (Fizikai dobozok)', labelEn: 'Storage (Boxes & Shelves)', icon: Package },
  { id: 'household', labelHu: 'Családi megosztás', labelEn: 'Family Sharing', icon: Users },
  { id: 'repairs', labelHu: 'Javítások & Karbantartás', labelEn: 'Repairs & Maintenance', icon: Wrench },
  { id: 'financing', labelHu: 'Finanszírozás & Részletek', labelEn: 'Financing & Installments', icon: CreditCard },
  { id: 'lending', labelHu: 'Kölcsönadás & Kapcsolatok', labelEn: 'Lending & Borrowing', icon: Handshake },
  { id: 'collections', labelHu: 'Gyűjtemények & Katalógus', labelEn: 'Collections & Catalogs', icon: Layers },
  { id: 'pantry', labelHu: 'Spájz & Készletek', labelEn: 'Pantry & Consumables', icon: ShoppingBag },
  { id: 'vault', labelHu: 'Széf & Védett tárgyak', labelEn: 'Vault & Protected', icon: Lock },
  { id: 'notes', labelHu: 'Gyorsjegyzetek', labelEn: 'Quick Notes', icon: StickyNote },
  { id: 'shopping_list', labelHu: 'Bevásárló kosár', labelEn: 'Shopping Cart', icon: ShoppingCart },
];

export const SettingsView: React.FC = () => {
  const {
    user,
    userPreferences,
    updateUserPreferences,
    language,
    setLanguage,
    userNotificationSettings,
    updateNotificationSettings,
    vaultSettings,
    updatePassword,
    deleteAccount,
    setCurrentView,
    goBack,
  } = useApp();

  const isHu = language === 'hu';
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Feedback states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Email Update State
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setSaveStatus(type);
    setStatusMessage(msg);
    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage(null);
    }, 4000);
  };

  // 1. Profil név frissítése
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setIsUpdatingProfile(true);
    setSaveStatus('saving');

    try {
      if (supabase) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ display_name: displayName.trim() })
          .eq('user_id', user.id);

        if (profileErr) throw profileErr;

        await supabase.auth.updateUser({
          data: { display_name: displayName.trim() }
        });
      }

      // Frissítsük a helyi tárolót és állapotot
      const updatedUser = { ...user, display_name: displayName.trim() };
      localStorage.setItem('thingor_user', JSON.stringify(updatedUser));

      showFeedback('success', isHu ? 'Profil sikeresen frissítve!' : 'Profile updated successfully!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showFeedback('error', (isHu ? 'Hiba a profil mentésekor: ' : 'Error updating profile: ') + errorMsg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 2. Email cím módosítási kérelem (Supabase biztonságos folyamat)
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !supabase) return;

    setIsUpdatingEmail(true);
    setSaveStatus('saving');

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;

      setNewEmail('');
      showFeedback(
        'success',
        isHu
          ? 'Megerősítő link elküldve! Kérjük, ellenőrizd az új email fiókodat a véglegesítéshez.'
          : 'Confirmation link sent! Please check your new inbox to complete email change.'
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showFeedback('error', (isHu ? 'Hiba az email frissítésekor: ' : 'Error updating email: ') + errorMsg);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // 3. Jelszó módosítása
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showFeedback('error', isHu ? 'A jelszónak legalább 6 karakter hosszúnak kell lennie!' : 'Password must be at least 6 characters!');
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback('error', isHu ? 'A megadott jelszavak nem egyeznek!' : 'Passwords do not match!');
      return;
    }

    setIsUpdatingPassword(true);
    setSaveStatus('saving');

    try {
      const result = await updatePassword(newPassword);
      if (result.success) {
        setNewPassword('');
        setConfirmPassword('');
        showFeedback('success', isHu ? 'A jelszó sikeresen megváltoztatva!' : 'Password successfully updated!');
      } else {
        showFeedback('error', result.error || (isHu ? 'Hiba történt a jelszó módosításakor' : 'Error updating password'));
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showFeedback('error', errorMsg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 4. Fióktörlés végrehajtása
  const handleDeleteAccountConfirm = async () => {
    const requiredConfirmation = isHu ? 'TÖRLÉS' : 'DELETE';
    if (deleteConfirmationInput.trim() !== requiredConfirmation) {
      showFeedback('error', isHu ? `Kérjük írd be pontosan: "${requiredConfirmation}"` : `Please type exactly: "${requiredConfirmation}"`);
      return;
    }

    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount();
      if (!result.success) {
        showFeedback('error', result.error || (isHu ? 'Nem sikerült a fiók törlése.' : 'Failed to delete account.'));
        setIsDeletingAccount(false);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showFeedback('error', errorMsg);
      setIsDeletingAccount(false);
    }
  };

  // 5. Kompakt mód kapcsolása
  const handleToggleCompactMode = async () => {
    const nextMode = !userPreferences.compact_mode;
    document.documentElement.classList.toggle('compact-mode', nextMode);
    await updateUserPreferences({ compact_mode: nextMode });
    showFeedback('success', isHu ? 'Megjelenítési mód frissítve!' : 'Appearance mode updated!');
  };

  // 6. Nyelvváltás
  const handleLanguageChange = async (newLang: 'hu' | 'en') => {
    setLanguage(newLang);
    await updateUserPreferences({ language: newLang });
    showFeedback('success', newLang === 'hu' ? 'Nyelv beállítva: Magyar' : 'Language set to: English');
  };

  // 7. Pénznem választás
  const handleCurrencyChange = async (newCurrency: 'HUF' | 'EUR' | 'USD') => {
    await updateUserPreferences({ currency: newCurrency });
    showFeedback('success', isHu ? `Alapértelmezett pénznem beállítva: ${newCurrency}` : `Default currency set to: ${newCurrency}`);
  };

  const tabs = [
    { id: 'account', label: isHu ? 'Fiók & Profil' : 'Account & Profile', icon: User },
    { id: 'appearance', label: isHu ? 'Megjelenés' : 'Appearance', icon: Palette },
    { id: 'regional', label: isHu ? 'Nyelv & Pénznem' : 'Language & Currency', icon: Globe },
    { id: 'notifications', label: isHu ? 'Értesítések' : 'Notifications', icon: Bell },
    { id: 'security', label: isHu ? 'Széf & Biztonság' : 'Vault & Security', icon: Lock },
    { id: 'data', label: isHu ? 'Adatok & Megosztás' : 'Data & Sharing', icon: Database },
  ] as const;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3.5">
          <button
            onClick={goBack}
            className="p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors"
            title={isHu ? 'Vissza' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main,#E0E3E6)]">
              {isHu ? 'Beállítások' : 'Settings'}
            </h1>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5">
              {isHu
                ? 'Személyre szabhatóság, fiókkezelés és rendszerpreferenciák'
                : 'Personalization, account management and system preferences'}
            </p>
          </div>
        </div>

        {/* Állapot visszajelző címke */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border animate-in fade-in duration-200 ${
              saveStatus === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : saveStatus === 'error'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}
          >
            {saveStatus === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Fülek / Navigációs sáv */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-md shadow-blue-900/30'
                  : 'bg-[var(--card-bg,#3A4551)] text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-white border border-[var(--border-color,#56616D)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FIÓK & PROFIL */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Megjelenített név módosítása */}
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Profil adatok' : 'Profile Information'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'A rendszerben megjelenő neved módosítása' : 'Change your public display name'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1.5">
                  {isHu ? 'Megjelenített név' : 'Display Name'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-xl text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                  placeholder={isHu ? 'Pl. Kovács Péter' : 'e.g. John Doe'}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1.5">
                  {isHu ? 'Jelenlegi Email cím' : 'Current Email Address'}
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)]/50 rounded-xl text-sm text-[var(--text-sub,#B5BDC6)] font-mono">
                  <Mail className="w-4 h-4 text-[var(--text-sub,#B5BDC6)] shrink-0" />
                  <span className="truncate">{user?.email || '—'}</span>
                  <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {user?.role === 'admin' ? 'Admin' : 'Aktív'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingProfile || !displayName.trim() || displayName === user?.display_name}
                  className="px-4 py-2.5 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdatingProfile ? (isHu ? 'Mentés...' : 'Saving...') : (isHu ? 'Név mentése' : 'Save Name')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Email cím módosítási kérelem */}
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-purple-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Email cím módosítása' : 'Change Email'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Biztonságos kétlépcsős megerősítési folyamat' : 'Secure two-step email confirmation'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1.5">
                  {isHu ? 'Új Email cím' : 'New Email Address'}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-xl text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="uj.email@pelda.hu"
                  required
                />
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 leading-relaxed">
                {isHu
                  ? 'A mentés után a rendszer megerősítő levelet küld az új címre. Az email csak a visszaigazolás után frissül.'
                  : 'After saving, a confirmation link will be sent to the new email address. Changes take effect upon confirmation.'}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingEmail || !newEmail.trim()}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isUpdatingEmail ? (isHu ? 'Küldés...' : 'Sending...') : (isHu ? 'Email módosítási kérelem' : 'Request Email Change')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Jelszó módosítása */}
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Jelszó megváltoztatása' : 'Change Password'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Supabase Auth biztonságos titkosítás' : 'Secure Supabase Auth encryption'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1.5">
                  {isHu ? 'Új jelszó (legalább 6 karakter)' : 'New Password (min. 6 characters)'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-xl text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1.5">
                  {isHu ? 'Új jelszó megerősítése' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-xl text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !newPassword || newPassword.length < 6}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isUpdatingPassword ? (isHu ? 'Frissítés...' : 'Updating...') : (isHu ? 'Jelszó frissítése' : 'Update Password')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Veszélyes zóna: Fiók törlése */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-900/40">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-300">
                  {isHu ? 'Veszélyes zóna' : 'Danger Zone'}
                </h3>
                <p className="text-xs text-rose-400/80">
                  {isHu ? 'Végleges, nem visszavonható műveletek' : 'Irreversible permanent account deletion'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-sub,#B5BDC6)] leading-relaxed">
              {isHu
                ? 'A fiók törlésével az összes rögzített tárgy, dokumentum, kategória és profilbeállítás véglegesen törlődik az adatbázisból. Ez a lépés nem visszavonható.'
                : 'Deleting your account will permanently remove all your items, documents, categories, and preferences from the database. This action cannot be undone.'}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteConfirmationInput('');
                }}
                className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800 text-rose-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isHu ? 'Fiók végleges törlése...' : 'Permanently Delete Account...'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEGJELENÉS */}
      {activeTab === 'appearance' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Felületi elrendezés és nézet' : 'UI Layout and View'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Kompakt mód és vizuális sűrűség szabályozása' : 'Compact mode and visual density control'}
                </p>
              </div>
            </div>

            {/* Kompakt mód kapcsoló */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
              <div className="space-y-1 pr-4">
                <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Kompakt megjelenítés' : 'Compact View Mode'}
                </div>
                <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu
                    ? 'Kisebb térközök és sűrűbb listák a leltár és táblázatok áttekintéséhez.'
                    : 'Reduced padding and denser lists for inventory tables and cards.'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!userPreferences.compact_mode}
                  onChange={handleToggleCompactMode}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--card-bg,#3A4551)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)]"></div>
              </label>
            </div>

            {/* Színpaletta és téma jelző */}
            <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                    {isHu ? 'Alkalmazás témája' : 'Application Theme'}
                  </div>
                  <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                    {isHu ? 'Thingor Dark Slate (Alapértelmezett sötét téma)' : 'Thingor Dark Slate (Default dark theme)'}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-primary-blue,#2563EB)]/20 text-[var(--color-primary-blue,#2563EB)] border border-[var(--color-primary-blue,#2563EB)]/30">
                  #303943
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="w-6 h-6 rounded-lg bg-[#303943] border border-white/20 shadow-inner" title="Bg Main" />
                <div className="w-6 h-6 rounded-lg bg-[#3A4551] border border-white/20 shadow-inner" title="Card Bg" />
                <div className="w-6 h-6 rounded-lg bg-[#465362] border border-white/20 shadow-inner" title="Surface Bg" />
                <div className="w-6 h-6 rounded-lg bg-[#2563EB] border border-white/20 shadow-inner" title="Primary Blue" />
                <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] ml-2">
                  {isHu ? 'Konzisztens szemkímélő sötét felület' : 'Eye-friendly low-contrast dark palette'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobil alsó menüsáv testreszabása */}
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Mobil alsó navigációs sáv testreszabása' : 'Customize Mobile Bottom Navigation Bar'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu
                    ? 'Szabd testre a képernyő alján megjelenő központi [+] gomb bal és jobb oldalán lévő gyorsfunkciókat.'
                    : 'Configure the quick-action buttons placed to the left and right of the central [+] button.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bal oldali gomb választó */}
              <div className="space-y-2 p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Bal oldali gyorsgomb (a [+] előtt)' : 'Left Quick Button (before [+])'}
                </label>
                <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mb-2">
                  {isHu ? 'Alapértelmezett: Tárgyaim' : 'Default: Items'}
                </p>
                <select
                  value={userPreferences.mobile_bottom_bar_left || 'items'}
                  onChange={async e => {
                    await updateUserPreferences({ mobile_bottom_bar_left: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-xl text-xs sm:text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                >
                  {BOTTOM_BAR_OPTIONS.map(opt => (
                    <option key={`left-${opt.id}`} value={opt.id}>
                      {isHu ? opt.labelHu : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jobb oldali gomb választó */}
              <div className="space-y-2 p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Jobb oldali gyorsgomb (a [+] után)' : 'Right Quick Button (after [+])'}
                </label>
                <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mb-2">
                  {isHu ? 'Alapértelmezett: Tárolók' : 'Default: Storage'}
                </p>
                <select
                  value={userPreferences.mobile_bottom_bar_right || 'storage'}
                  onChange={async e => {
                    await updateUserPreferences({ mobile_bottom_bar_right: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-xl text-xs sm:text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                >
                  {BOTTOM_BAR_OPTIONS.map(opt => (
                    <option key={`right-${opt.id}`} value={opt.id}>
                      {isHu ? opt.labelHu : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Élő előnézet */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-color,#56616D)]/60">
              <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider block">
                {isHu ? 'Mobil alsó sáv élő előnézete' : 'Live Mobile Bar Preview'}
              </span>
              <div className="max-w-md mx-auto p-2.5 bg-[var(--bg-main,#303943)] rounded-2xl border border-[var(--border-color,#56616D)] shadow-inner flex items-center justify-around">
                {/* 1. Vezérlőpult */}
                <div className="flex flex-col items-center gap-0.5 text-[var(--text-sub,#B5BDC6)] px-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="text-[9px]">{isHu ? 'Vezérlőpult' : 'Dashboard'}</span>
                </div>

                {/* 2. Választott bal gomb */}
                {(() => {
                  const opt = BOTTOM_BAR_OPTIONS.find(o => o.id === (userPreferences.mobile_bottom_bar_left || 'items')) || BOTTOM_BAR_OPTIONS[0];
                  const Icon = opt.icon;
                  return (
                    <div className="flex flex-col items-center gap-0.5 text-[var(--color-primary-blue,#2563EB)] font-bold px-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] truncate max-w-[65px]">{isHu ? opt.labelHu.split(' ')[0] : opt.labelEn.split(' ')[0]}</span>
                    </div>
                  );
                })()}

                {/* 3. Központi FAB [+] */}
                <div className="h-8 w-8 rounded-full bg-[var(--color-primary-blue,#2563EB)] text-white flex items-center justify-center shadow">
                  <Plus className="h-4 w-4 stroke-[3]" />
                </div>

                {/* 4. Választott jobb gomb */}
                {(() => {
                  const opt = BOTTOM_BAR_OPTIONS.find(o => o.id === (userPreferences.mobile_bottom_bar_right || 'storage')) || BOTTOM_BAR_OPTIONS[1];
                  const Icon = opt.icon;
                  return (
                    <div className="flex flex-col items-center gap-0.5 text-[var(--text-sub,#B5BDC6)] px-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] truncate max-w-[65px]">{isHu ? opt.labelHu.split(' ')[0] : opt.labelEn.split(' ')[0]}</span>
                    </div>
                  );
                })()}

                {/* 5. Menü */}
                <div className="flex flex-col items-center gap-0.5 text-[var(--text-sub,#B5BDC6)] px-2">
                  <Menu className="h-4 w-4" />
                  <span className="text-[9px]">{isHu ? 'Menü' : 'Menu'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NYELV ÉS PÉNZNEM */}
      {activeTab === 'regional' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Nyelvi és területi beállítások' : 'Language and Regional Preferences'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Különálló nyelv- és pénznemválasztás, felhőszinkronizációval' : 'Separate language and currency settings with cloud sync'}
                </p>
              </div>
            </div>

            {/* Nyelvválasztó */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
                {isHu ? 'Alkalmazás nyelve' : 'Application Language'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hu')}
                  className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    language === 'hu'
                      ? 'bg-[var(--surface-bg,#465362)] border-[var(--color-primary-blue,#2563EB)] shadow-md'
                      : 'bg-[var(--surface-bg,#465362)]/50 border-[var(--border-color,#56616D)] hover:border-[var(--text-sub,#B5BDC6)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇭🇺</span>
                    <div>
                      <div className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">Magyar</div>
                      <div className="text-xs text-[var(--text-sub,#B5BDC6)]">Alapértelmezett rendszerfordítás</div>
                    </div>
                  </div>
                  {language === 'hu' && <Check className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)]" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    language === 'en'
                      ? 'bg-[var(--surface-bg,#465362)] border-[var(--color-primary-blue,#2563EB)] shadow-md'
                      : 'bg-[var(--surface-bg,#465362)]/50 border-[var(--border-color,#56616D)] hover:border-[var(--text-sub,#B5BDC6)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇬🇧</span>
                    <div>
                      <div className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">English</div>
                      <div className="text-xs text-[var(--text-sub,#B5BDC6)]">Complete UI localization</div>
                    </div>
                  </div>
                  {language === 'en' && <Check className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)]" />}
                </button>
              </div>
            </div>

            {/* Pénznemválasztó */}
            <div className="space-y-3 pt-3 border-t border-[var(--border-color,#56616D)]">
              <label className="block text-xs font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
                {isHu ? 'Alapértelmezett pénznem' : 'Default Currency'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { code: 'HUF', symbol: 'Ft', name: isHu ? 'Magyar Forint' : 'Hungarian Forint' },
                  { code: 'EUR', symbol: '€', name: 'Euro' },
                  { code: 'USD', symbol: '$', name: isHu ? 'Amerikai Dollár' : 'US Dollar' },
                ].map(curr => {
                  const isSelected = (userPreferences.currency || 'HUF') === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => handleCurrencyChange(curr.code as 'HUF' | 'EUR' | 'USD')}
                      className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[var(--surface-bg,#465362)] border-emerald-500 shadow-md'
                          : 'bg-[var(--surface-bg,#465362)]/50 border-[var(--border-color,#56616D)] hover:border-[var(--text-sub,#B5BDC6)]'
                      }`}
                    >
                      <div>
                        <div className="text-base font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                          <span>{curr.code}</span>
                          <span className="text-xs font-normal text-emerald-400 font-mono">({curr.symbol})</span>
                        </div>
                        <div className="text-xs text-[var(--text-sub,#B5BDC6)]">{curr.name}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Biztonsági tájékoztató a pénznemről */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>{isHu ? 'Fontos tudnivaló:' : 'Important notice:'}</strong>{' '}
                  {isHu
                    ? 'A pénznem kiválasztása felületi preferencia. Önmagában nem módosítja a már rögzített tételek és részletfizetések összegeit, és nem végez automatikus árfolyam-átváltást.'
                    : 'Currency selection is a display preference. It does not alter previously entered item values and does not execute currency conversion.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ÉRTESÍTÉSEK */}
      {activeTab === 'notifications' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Értesítési szabályok és csatornák' : 'Notification Rules & Channels'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Kategóriánkénti vezérlés a meglévő értesítési motorral' : 'Per-category controls wired to the notification engine'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Garancia toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                      {isHu ? 'Garancia lejárati figyelmeztetések' : 'Warranty Expiry Warnings'}
                    </div>
                    <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? '30 és 7 nappal a lejárati dátum előtt' : '30 and 7 days prior to expiration'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userNotificationSettings?.warranty_enabled ?? true}
                  onChange={e => updateNotificationSettings({ warranty_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] accent-[var(--color-primary-blue,#2563EB)] cursor-pointer"
                />
              </div>

              {/* Finanszírozás toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                      {isHu ? 'Finanszírozás / Részletfizetés esedékességek' : 'Financing & Due Dates'}
                    </div>
                    <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? '7, 3 nappal korábban és esedékesség napján' : '7, 3 days before and on due date'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userNotificationSettings?.financing_enabled ?? true}
                  onChange={e => updateNotificationSettings({ financing_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] accent-[var(--color-primary-blue,#2563EB)] cursor-pointer"
                />
              </div>

              {/* Javítások toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                      {isHu ? 'Javítási státuszfrissítések' : 'Repair Status Updates'}
                    </div>
                    <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Javítás indításakor, elkészültekor és lezárásakor' : 'On repair status changes'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userNotificationSettings?.repair_enabled ?? true}
                  onChange={e => updateNotificationSettings({ repair_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] accent-[var(--color-primary-blue,#2563EB)] cursor-pointer"
                />
              </div>

              {/* Bevásárló kosár & Készlet toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                      {isHu ? 'Bevásárló kosár & Készlet figyelmeztetések' : 'Shopping Cart & Stock Alerts'}
                    </div>
                    <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Figyelmeztetés, ha a háztartási alapcikkekből fogyóban van a készlet' : 'Alerts when household staple items run low or out of stock'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userNotificationSettings?.shopping_cart_enabled ?? true}
                  onChange={e => updateNotificationSettings({ shopping_cart_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] accent-[var(--color-primary-blue,#2563EB)] cursor-pointer"
                />
              </div>

              {/* In-app értesítés toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                      {isHu ? 'Alkalmazáson belüli értesítések' : 'In-App Notifications'}
                    </div>
                    <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Harang jelvény és értesítési központ' : 'Notification bell icon and center'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userNotificationSettings?.inapp_enabled ?? true}
                  onChange={e => updateNotificationSettings({ inapp_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] accent-[var(--color-primary-blue,#2563EB)] cursor-pointer"
                />
              </div>

              {/* Email értesítés toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                      {isHu ? 'Email emlékeztetők' : 'Email Reminders'}
                    </div>
                    <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Időzített küldés a regisztrált email címre' : 'Scheduled delivery to primary email'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userNotificationSettings?.email_enabled ?? true}
                  onChange={e => updateNotificationSettings({ email_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] accent-[var(--color-primary-blue,#2563EB)] cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3 bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/60 rounded-xl text-xs text-[var(--text-sub,#B5BDC6)]">
              {isHu
                ? 'Megjegyzés: A beállítások azonnal szinkronizálódnak a Supabase user_notification_settings táblájába.'
                : 'Note: Preferences are synchronized immediately with user_notification_settings in Supabase.'}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SZÉF & BIZTONSÁG */}
      {activeTab === 'security' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Széf és védett adattárolás' : 'Vault and Protected Storage'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'PBKDF2-hashelt PIN védelem és automatikus zárolás' : 'PBKDF2-hashed PIN protection and auto-locking'}
                </p>
              </div>
            </div>

            {/* Széf státusz kártya */}
            <div className="p-5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-xl border ${vaultSettings?.pin_hash ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
                    {vaultSettings?.pin_hash
                      ? (isHu ? 'Thingor Széf aktív és konfigurálva' : 'Thingor Vault active and configured')
                      : (isHu ? 'A Széf még nincs konfigurálva' : 'Vault is not yet configured')}
                  </div>
                  <div className="text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5">
                    {vaultSettings?.pin_hash
                      ? (isHu ? 'Külön PIN kód és brute-force elleni késleltetés aktív.' : 'Dedicated PIN and brute-force protection active.')
                      : (isHu ? 'Állíts be PIN kódot értékes tárgyaid és dokumentumaid zárolásához.' : 'Set up a PIN to lock sensitive items and documents.')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentView('vault')}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0 shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>{isHu ? 'Ugrás a Széfhez' : 'Open Vault'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/60 space-y-1">
                <div className="text-xs font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>{isHu ? 'PIN-kód titkosítás' : 'PIN Encryption'}</span>
                </div>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)] leading-relaxed">
                  {isHu
                    ? 'A PIN kód kizárólag kriptográfiai PBKDF2 saltolt hash formájában tárolódik a Supabase adatbázisban.'
                    : 'Your PIN is stored strictly as a salted PBKDF2 hash inside the Supabase database.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/60 space-y-1">
                <div className="text-xs font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>{isHu ? 'Automatikus zárolás' : 'Auto-Lock Timeout'}</span>
                </div>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)] leading-relaxed">
                  {isHu
                    ? '5 perc inaktivitás vagy a böngészőablak bezárása után a széf munkamenete azonnal lezárul.'
                    : 'The vault locks automatically after 5 minutes of inactivity or upon tab closure.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ADATOK & MEGOSZTÁS */}
      {activeTab === 'data' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'Leltár export és megosztások' : 'Inventory Export & Sharing'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Adatexportálás és háztartási hozzáférések áttekintése' : 'Export your data and review household permissions'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* CSV Export opció */}
              <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
                    {isHu ? 'Leltár és Tárgylista CSV Export' : 'Inventory & Items CSV Export'}
                  </div>
                  <div className="text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5">
                    {isHu
                      ? 'A teljes tárgylista letölthető táblázatkezelő (Excel, Google Sheets) kompatibilis CSV formátumban.'
                      : 'Download your full items inventory in spreadsheet-compatible CSV format.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('items')}
                  className="px-4 py-2 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0 shadow-sm"
                >
                  <span>{isHu ? 'Tárgyak és Export megnyitása' : 'Open Items & Export'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Háztartási megosztás */}
              <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
                    {isHu ? 'Családi és Háztartási Megosztás' : 'Household & Family Sharing'}
                  </div>
                  <div className="text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5">
                    {isHu
                      ? 'Közös raktárhelyek, kategóriák és meghívott családtagok jogosultságainak kezelése.'
                      : 'Manage shared storage locations, categories and household member privileges.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('household')}
                  className="px-4 py-2 bg-[var(--surface-bg,#465362)] hover:bg-[var(--border-color,#56616D)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0"
                >
                  <span>{isHu ? 'Háztartás megnyitása' : 'Open Household'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* JSON export ütemezési tájékoztató */}
              <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)]/40 text-xs text-[var(--text-sub,#B5BDC6)] leading-relaxed">
                <strong>{isHu ? 'Teljes GDPR JSON Adatexport:' : 'Full GDPR JSON Export:'}</strong>{' '}
                {isHu
                  ? 'A teljes felhasználói fiók (képekkel, széf-metaadatokkal és történeti naplóval) egykattintásos JSON archívuma a következő rendszerfrissítésben válik elérhetővé.'
                  : 'Full GDPR JSON export archiving (including all images, vault metadata and audit trail) will be released in an upcoming scheduled update.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fióktörlési Megerősítő Modális */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--card-bg,#3A4551)] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">
                {isHu ? 'Biztosan törölni szeretnéd a fiókodat?' : 'Are you sure you want to delete your account?'}
              </h3>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                {isHu
                  ? 'Ez a művelet visszavonhatatlan. Az összes tárgyad, számlád, jótállási dokumentumod és beállításod azonnal törlődik.'
                  : 'This action is irreversible. All your items, invoices, warranty documents and settings will be permanently erased.'}
              </p>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1.5">
                {isHu
                  ? 'A jóváhagyáshoz írd be a(z) "TÖRLÉS" szót:'
                  : 'To confirm, type the word "DELETE":'}
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={e => setDeleteConfirmationInput(e.target.value)}
                placeholder={isHu ? 'TÖRLÉS' : 'DELETE'}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-bg,#465362)] border border-rose-500/40 rounded-xl text-sm text-center font-bold tracking-widest text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationInput('');
                }}
                className="px-4 py-2.5 bg-[var(--surface-bg,#465362)] hover:bg-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] text-xs font-semibold rounded-xl transition-colors"
              >
                {isHu ? 'Mégsem' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || deleteConfirmationInput.trim() !== (isHu ? 'TÖRLÉS' : 'DELETE')}
                onClick={handleDeleteAccountConfirm}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingAccount ? (isHu ? 'Törlés...' : 'Deleting...') : (isHu ? 'Végleges törlés' : 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
