import React, { useState, useEffect, useCallback } from 'react';
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
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  FileText,
  Crown,
  Ticket,
  Clock,
  Award,
  Gift,
  Loader2,
} from 'lucide-react';
import { THEMES, ACCENT_COLORS, applyTheme } from '../lib/theme';

type SettingsTab = 'account' | 'appearance' | 'regional' | 'notifications' | 'security' | 'data' | 'subscription';

const BOTTOM_BAR_OPTIONS = [
  { id: 'dashboard', labelHu: 'Vezérlőpult', labelEn: 'Dashboard', icon: LayoutDashboard },
  { id: 'items', labelHu: 'Tárgyaim', labelEn: 'Items', icon: Boxes },
  { id: 'storage', labelHu: 'Tárolók (Fizikai dobozok)', labelEn: 'Storage (Boxes & Shelves)', icon: Package },
  { id: 'documents', labelHu: 'Dokumentumok', labelEn: 'Documents', icon: FileText },
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

  // Subscription & VIP Entitlement State
  interface UserEntitlement {
    plan_id: string;
    plan_name: string;
    is_vip: boolean;
    vip_expires_at: string | null;
    item_limit: number | null;
    doc_limit: number | null;
    storage_limit_bytes: number;
    container_limit: number | null;
    household_invites_limit: number | null;
    has_vault: boolean;
    has_insurance_pdf: boolean;
    has_export: boolean;
  }
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(null);
  const [isLoadingEntitlement, setIsLoadingEntitlement] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState<{ planName: string; duration: string; expiresAt: string | null } | null>(null);
  const [redemptionError, setRedemptionError] = useState<string | null>(null);

  const fetchUserEntitlement = useCallback(async () => {
    if (!supabase || !user) return;
    setIsLoadingEntitlement(true);
    try {
      const { data, error } = await supabase.rpc('get_user_effective_entitlement');
      if (error) throw error;
      setEntitlement(data);
    } catch (err: any) {
      console.error('Hiba az előfizetési adatok lekérésekor:', err);
    } finally {
      setIsLoadingEntitlement(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserEntitlement();
    }
  }, [user, fetchUserEntitlement]);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCodeInput.trim().toUpperCase();
    if (!cleanCode || !supabase) return;

    setIsRedeeming(true);
    setRedemptionError(null);
    setRedemptionSuccess(null);

    try {
      const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: cleanCode });
      if (error) {
        throw error;
      }
      if (data?.success) {
        if (data.entitlement) {
          setEntitlement(data.entitlement);
        } else {
          await fetchUserEntitlement();
        }

        const planName = data.entitlement?.plan_name || data.target_plan_id?.toUpperCase() || 'VIP';
        const duration = data.is_perpetual
          ? (isHu ? 'Örökös hozzáférés (lejárat nélküli)' : 'Perpetual access (no expiration)')
          : data.expires_at
          ? new Date(data.expires_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')
          : (isHu ? 'Aktiválva' : 'Activated');

        setRedemptionSuccess({
          planName,
          duration,
          expiresAt: data.expires_at
        });
        setPromoCodeInput('');
        showFeedback(
          'success',
          isHu
            ? `VIP kód sikeresen beváltva: ${planName} csomag azonnal aktív!`
            : `VIP code successfully redeemed: ${planName} plan activated!`
        );
      } else {
        throw new Error(isHu ? 'A beváltás sikertelen volt.' : 'Redemption was unsuccessful.');
      }
    } catch (err: any) {
      const msg = err?.message || (isHu ? 'Ismeretlen hiba a kód beváltásakor.' : 'Error redeeming code.');
      setRedemptionError(msg);
      showFeedback('error', msg);
    } finally {
      setIsRedeeming(false);
    }
  };

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
    { id: 'subscription', label: isHu ? 'Csomag & VIP' : 'Plan & VIP', icon: Crown },
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

      {/* TAB: ELŐFIZETÉS & VIP */}
      {activeTab === 'subscription' && (
        <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
          {/* 1. AKTÍV CSOMAG & VIP STÁTUSZ KÁRTYA */}
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            {/* Top decorative accent */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              entitlement?.is_vip
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600'
                : entitlement?.plan_id === 'business'
                ? 'bg-gradient-to-r from-amber-500 to-purple-600'
                : entitlement?.plan_id === 'family'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                : entitlement?.plan_id === 'plus'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                : 'bg-gradient-to-r from-slate-600 to-slate-500'
            }`} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-2xl shadow-md ${
                  entitlement?.is_vip
                    ? 'bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/40'
                    : 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)]'
                }`}>
                  {entitlement?.is_vip ? (
                    <Crown className="w-6 h-6 text-amber-400 animate-pulse" />
                  ) : (
                    <Award className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)]">
                      {entitlement?.plan_name || 'Free'} {isHu ? 'Csomag' : 'Plan'}
                    </h3>
                    {entitlement?.is_vip && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm flex items-center gap-1">
                        <Crown className="w-3 h-3 text-slate-950" />
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5">
                    {isHu ? 'Jelenleg érvényes előfizetési csomagod és kvótáid' : 'Your current active subscription package and limits'}
                  </p>
                </div>
              </div>

              {/* VIP / Expiration Badge */}
              <div className="flex flex-col sm:items-end">
                {isLoadingEntitlement ? (
                  <span className="text-xs text-[var(--text-sub,#B5BDC6)] flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {isHu ? 'Betöltés...' : 'Loading...'}
                  </span>
                ) : entitlement?.is_vip ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right">
                    <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
                      {isHu ? 'VIP HOZZÁFÉRÉS ÁLLAPOTA' : 'VIP STATUS'}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-1.5 justify-end mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {entitlement.vip_expires_at
                        ? `${isHu ? 'Lejárat: ' : 'Expires: '}${new Date(entitlement.vip_expires_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')}`
                        : (isHu ? 'Örökös VIP tagság (Lejárat nélküli)' : 'Perpetual VIP access (No expiry)')}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] text-right">
                    <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] block">
                      {isHu ? 'Státusz:' : 'Status:'}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {isHu ? 'Aktív ingyenes csomag' : 'Active Free Tier'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* KVÓTÁK ÉS KORLÁTOK ÁTTEKINTŐ RÁCS */}
            <div>
              <h4 className="text-xs font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider mb-3">
                {isHu ? 'Csomaghoz tartozó keretek és jogosultságok' : 'Plan Quotas and Capabilities'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Tárgy limit */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                  <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] block mb-1">
                    {isHu ? 'Tárgyak' : 'Items'}
                  </span>
                  <span className="text-base font-black text-[var(--text-main,#E0E3E6)]">
                    {entitlement?.item_limit ? `${entitlement.item_limit.toLocaleString()} db` : (isHu ? 'Korlátlan' : 'Unlimited')}
                  </span>
                </div>

                {/* Dokumentum limit */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                  <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] block mb-1">
                    {isHu ? 'Dokumentumok' : 'Documents'}
                  </span>
                  <span className="text-base font-black text-[var(--text-main,#E0E3E6)]">
                    {entitlement?.doc_limit ? `${entitlement.doc_limit.toLocaleString()} db` : (isHu ? 'Korlátlan' : 'Unlimited')}
                  </span>
                </div>

                {/* Tárhely kvóta */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                  <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] block mb-1">
                    {isHu ? 'Média Tárhely' : 'Cloud Storage'}
                  </span>
                  <span className="text-base font-black text-amber-400">
                    {entitlement?.storage_limit_bytes
                      ? `${Math.round(entitlement.storage_limit_bytes / (1024 * 1024))} MB`
                      : '100 MB'}
                  </span>
                </div>

                {/* Digitális Széf */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                  <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] block mb-1">
                    {isHu ? 'Digitális Széf' : 'Vault Access'}
                  </span>
                  <span className={`text-base font-black ${entitlement?.has_vault ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {entitlement?.has_vault ? (isHu ? 'Aktív' : 'Active') : (isHu ? 'Nincs' : 'Disabled')}
                  </span>
                </div>

                {/* Családi megosztások */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] block mb-1">
                    {isHu ? 'Családi Tagok' : 'Family Sharing'}
                  </span>
                  <span className="text-base font-black text-[var(--text-main,#E0E3E6)]">
                    {entitlement?.household_invites_limit ? `${entitlement.household_invites_limit} fő` : (isHu ? 'Egyéni' : 'Personal')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. VIP KÓD BEVÁLTÁSA SZEKCIÓ */}
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? 'VIP vagy Promóciós Kód Beváltása' : 'Redeem VIP or Promo Code'}
                </h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu
                    ? 'Rendelkezel promóciós kuponnal vagy VIP kóddal? Váltsd be a magasabb csomagért!'
                    : 'Have a VIP or promotional voucher code? Enter it below to unlock enhanced quotas!'}
                </p>
              </div>
            </div>

            {/* Sikeres beváltás visszajelzés */}
            {redemptionSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-sm text-emerald-400">
                    {isHu ? 'Sikeres Kódbeváltás!' : 'Code Successfully Redeemed!'}
                  </p>
                  <p>
                    {isHu
                      ? `Gratulálunk! A fiókod mostantól ${redemptionSuccess.planName} csomaggal és emelt kvótákkal működik.`
                      : `Congratulations! Your account is now upgraded to the ${redemptionSuccess.planName} tier.`}
                  </p>
                  <p className="font-semibold text-emerald-200">
                    {isHu ? `Érvényesség: ${redemptionSuccess.duration}` : `Validity: ${redemptionSuccess.duration}`}
                  </p>
                </div>
              </div>
            )}

            {/* Hibás beváltás visszajelzés */}
            {redemptionError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-sm text-rose-400">
                    {isHu ? 'A beváltás sikertelen' : 'Redemption Failed'}
                  </p>
                  <p>{redemptionError}</p>
                </div>
              </div>
            )}

            {/* Beváltó űrlap */}
            <form onSubmit={handleRedeemCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1.5">
                  {isHu ? 'VIP / Promóciós Kód' : 'VIP / Promo Code'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={e => {
                      setPromoCodeInput(e.target.value.toUpperCase());
                      if (redemptionError) setRedemptionError(null);
                    }}
                    placeholder={isHu ? 'pl. THINGOR-VIP-7F2A8C' : 'e.g. THINGOR-VIP-7F2A8C'}
                    required
                    className="w-full px-4 py-3 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-xl text-sm font-mono uppercase tracking-wider text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  {promoCodeInput && (
                    <button
                      type="button"
                      onClick={() => setPromoCodeInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mt-1.5">
                  {isHu
                    ? 'A kódok nem érzékenyek a kis- és nagybetűkre, szóköz nélkül érvényesek.'
                    : 'Codes are case-insensitive and processed automatically by the server.'}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isRedeeming || !promoCodeInput.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  {isRedeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{isHu ? 'Ellenőrzés és beváltás...' : 'Validating & Redeeming...'}</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 text-slate-950" />
                      <span>{isHu ? 'Kód Beváltása' : 'Redeem Code'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 3. CSOMAGOK ÖSSZEHASONLÍTÁSA KÁRTYÁK */}
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
              {isHu ? 'Thingor Csomagok Részletei' : 'Thingor Subscription Tiers'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'free', name: 'Free', items: '100 tárgy', storage: '100 MB', tag: isHu ? 'Alapcsomag' : 'Free Tier' },
                { id: 'plus', name: 'Plus', items: '1 000 tárgy', storage: '500 MB', tag: isHu ? 'Egyéni' : 'Personal' },
                { id: 'family', name: 'Family', items: '5 000 tárgy', storage: '2 GB', tag: isHu ? '5 családtag' : '5 members' },
                { id: 'business', name: 'Business', items: isHu ? 'Korlátlan' : 'Unlimited', storage: '10 GB', tag: isHu ? 'VIP & Garancia' : 'VIP & Vault' },
              ].map(plan => {
                const isCurrent = entitlement?.plan_id === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-[var(--surface-bg,#465362)] border-amber-400 ring-1 ring-amber-400 shadow-md'
                        : 'bg-[var(--surface-bg,#465362)]/50 border-[var(--border-color,#56616D)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">{plan.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                          {isHu ? 'Aktuális' : 'Current'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-sub,#B5BDC6)] space-y-1">
                      <p>• {plan.items}</p>
                      <p>• {plan.storage} {isHu ? 'tárhely' : 'storage'}</p>
                      <p>• {plan.tag}</p>
                    </div>
                  </div>
                );
              })}
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

            {/* SZÍNTÉMA VÁLASZTÓ ÉS TESTRESZABÁS */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <div className="text-sm font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                    <span>{isHu ? 'Színtéma és felület stílusa' : 'Color Theme & Surface Style'}</span>
                  </div>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                    {isHu
                      ? 'Válassz a prémium dizájner színtémák közül a teljes alkalmazás megjelenésének megváltoztatásához.'
                      : 'Choose from curated premium themes to transform the visual atmosphere of Thingor.'}
                  </p>
                </div>
                {userPreferences.theme_id && userPreferences.theme_id !== 'slate' && (
                  <button
                    onClick={async () => {
                      applyTheme('slate', undefined);
                      await updateUserPreferences({ theme_id: 'slate', accent_color: undefined });
                    }}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:text-white flex items-center gap-1.5 border border-[var(--border-color,#56616D)] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isHu ? 'Alapértelmezett visszaállítása' : 'Reset to Default'}</span>
                  </button>
                )}
              </div>

              {/* Téma kártyák rácsa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {THEMES.map(theme => {
                  const isSelected = (userPreferences.theme_id || 'slate') === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={async () => {
                        applyTheme(theme.id, userPreferences.accent_color);
                        await updateUserPreferences({ theme_id: theme.id });
                      }}
                      className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 group ${
                        isSelected
                          ? 'border-[var(--color-primary-blue,#2563EB)] ring-2 ring-[var(--color-primary-blue,#2563EB)]/40 shadow-lg'
                          : 'border-[var(--border-color,#56616D)]/80 hover:border-[var(--color-primary-blue,#2563EB)]/50 hover:shadow-md'
                      }`}
                      style={{ backgroundColor: theme.cardBg }}
                    >
                      {/* Fejléc: Téma neve és Ikon */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div
                            className="text-xs font-bold transition-colors flex items-center gap-1.5"
                            style={{ color: theme.textMain }}
                          >
                            {theme.isLight ? (
                              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            )}
                            <span className="truncate">{isHu ? theme.nameHu : theme.nameEn}</span>
                          </div>
                          <div
                            className="text-[11px] line-clamp-2 mt-0.5 leading-tight"
                            style={{ color: theme.textSub }}
                          >
                            {isHu ? theme.descHu : theme.descEn}
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow text-white"
                            style={{ backgroundColor: userPreferences.accent_color || theme.defaultAccent }}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Mini felületi előnézet */}
                      <div
                        className="w-full rounded-xl p-2 border flex flex-col gap-1.5 shadow-inner"
                        style={{ backgroundColor: theme.bgMain, borderColor: theme.borderColor }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.defaultAccent }} />
                            <div className="h-1.5 w-10 rounded" style={{ backgroundColor: theme.textSub, opacity: 0.5 }} />
                          </div>
                          <div className="h-1.5 w-4 rounded" style={{ backgroundColor: theme.borderColor }} />
                        </div>
                        <div
                          className="rounded-lg p-1.5 flex items-center justify-between"
                          style={{ backgroundColor: theme.surfaceBg }}
                        >
                          <div className="h-2 w-12 rounded" style={{ backgroundColor: theme.textMain, opacity: 0.8 }} />
                          <div
                            className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: userPreferences.accent_color || theme.defaultAccent }}
                          >
                            OK
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KIEMELŐ SZÍN (ACCENT COLOR) VÁLASZTÓ */}
            <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                    <span>{isHu ? 'Egyéni kiemelő szín (Accent Color)' : 'Custom Accent Color'}</span>
                  </div>
                  <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                    {isHu
                      ? 'Gombok, aktív fülek, kiemelt ikonok és cselekvési felületek színe.'
                      : 'Customize the highlight color for primary buttons, active tabs, and links.'}
                  </div>
                </div>

                {userPreferences.accent_color && (
                  <button
                    onClick={async () => {
                      applyTheme(userPreferences.theme_id, undefined);
                      await updateUserPreferences({ accent_color: undefined });
                    }}
                    className="self-start sm:self-auto text-xs text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] underline transition-colors"
                  >
                    {isHu ? 'Téma alapértelmezett' : 'Use theme default'}
                  </button>
                )}
              </div>

              {/* Színes körök sora */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {ACCENT_COLORS.map(color => {
                  const currentTheme = THEMES.find(t => t.id === (userPreferences.theme_id || 'slate')) || THEMES[0];
                  const activeAccent = userPreferences.accent_color || currentTheme.defaultAccent;
                  const isSelected = activeAccent.toLowerCase() === color.hex.toLowerCase();

                  return (
                    <button
                      key={color.id}
                      type="button"
                      title={isHu ? color.labelHu : color.labelEn}
                      onClick={async () => {
                        applyTheme(userPreferences.theme_id, color.hex);
                        await updateUserPreferences({ accent_color: color.hex });
                      }}
                      className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold ${
                        isSelected
                          ? 'border-white text-white shadow-md ring-2 ring-white/30 scale-105'
                          : 'border-transparent text-[var(--text-sub,#B5BDC6)] hover:text-white bg-[var(--card-bg,#3A4551)]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-inner flex items-center justify-center shrink-0"
                        style={{ backgroundColor: color.hex }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                      </span>
                      <span>{isHu ? color.labelHu : color.labelEn}</span>
                    </button>
                  );
                })}
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
                    ? 'A vezérlőpult és a menü gomb helyett tetszőleges 4 gyorsfunkciót állíthatsz be a központi [+] gomb körül (a szendvicsmenü felülre került).'
                    : 'Customize all 4 action buttons around the central [+] button. The hamburger menu is moved to the top header.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Slot */}
              <div className="space-y-2 p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? '1. Gomb (bal szélső)' : 'Button 1 (far left)'}
                </label>
                <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mb-2">
                  {isHu ? 'Alapértelmezett: Tárgyaim' : 'Default: Items'}
                </p>
                <select
                  value={userPreferences.mobile_bottom_bar_slot1 || 'items'}
                  onChange={async e => {
                    await updateUserPreferences({ mobile_bottom_bar_slot1: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-xl text-xs sm:text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                >
                  {BOTTOM_BAR_OPTIONS.map(opt => (
                    <option key={`slot1-${opt.id}`} value={opt.id}>
                      {isHu ? opt.labelHu : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Slot */}
              <div className="space-y-2 p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? '2. Gomb (a [+] előtt)' : 'Button 2 (before [+])'}
                </label>
                <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mb-2">
                  {isHu ? 'Alapértelmezett: Tárolók' : 'Default: Storage'}
                </p>
                <select
                  value={userPreferences.mobile_bottom_bar_slot2 || userPreferences.mobile_bottom_bar_left || 'storage'}
                  onChange={async e => {
                    await updateUserPreferences({ mobile_bottom_bar_slot2: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-xl text-xs sm:text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                >
                  {BOTTOM_BAR_OPTIONS.map(opt => (
                    <option key={`slot2-${opt.id}`} value={opt.id}>
                      {isHu ? opt.labelHu : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Slot */}
              <div className="space-y-2 p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? '3. Gomb (a [+] után)' : 'Button 3 (after [+])'}
                </label>
                <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mb-2">
                  {isHu ? 'Alapértelmezett: Spájz' : 'Default: Pantry'}
                </p>
                <select
                  value={userPreferences.mobile_bottom_bar_slot3 || userPreferences.mobile_bottom_bar_right || 'pantry'}
                  onChange={async e => {
                    await updateUserPreferences({ mobile_bottom_bar_slot3: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-xl text-xs sm:text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                >
                  {BOTTOM_BAR_OPTIONS.map(opt => (
                    <option key={`slot3-${opt.id}`} value={opt.id}>
                      {isHu ? opt.labelHu : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Slot */}
              <div className="space-y-2 p-4 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                  {isHu ? '4. Gomb (jobb szélső)' : 'Button 4 (far right)'}
                </label>
                <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mb-2">
                  {isHu ? 'Alapértelmezett: Családi megosztás' : 'Default: Family Sharing'}
                </p>
                <select
                  value={userPreferences.mobile_bottom_bar_slot4 || 'household'}
                  onChange={async e => {
                    await updateUserPreferences({ mobile_bottom_bar_slot4: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-xl text-xs sm:text-sm text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                >
                  {BOTTOM_BAR_OPTIONS.map(opt => (
                    <option key={`slot4-${opt.id}`} value={opt.id}>
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
                {/* 1. Gomb */}
                {(() => {
                  const opt = BOTTOM_BAR_OPTIONS.find(o => o.id === (userPreferences.mobile_bottom_bar_slot1 || 'items')) || BOTTOM_BAR_OPTIONS[1];
                  const Icon = opt.icon;
                  return (
                    <div className="flex flex-col items-center gap-0.5 text-[var(--color-primary-blue,#2563EB)] font-bold px-1 text-center">
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] truncate max-w-[60px]">{isHu ? opt.labelHu.split(' ')[0] : opt.labelEn.split(' ')[0]}</span>
                    </div>
                  );
                })()}

                {/* 2. Gomb */}
                {(() => {
                  const opt = BOTTOM_BAR_OPTIONS.find(o => o.id === (userPreferences.mobile_bottom_bar_slot2 || userPreferences.mobile_bottom_bar_left || 'storage')) || BOTTOM_BAR_OPTIONS[2];
                  const Icon = opt.icon;
                  return (
                    <div className="flex flex-col items-center gap-0.5 text-[var(--color-primary-blue,#2563EB)] font-bold px-1 text-center">
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] truncate max-w-[60px]">{isHu ? opt.labelHu.split(' ')[0] : opt.labelEn.split(' ')[0]}</span>
                    </div>
                  );
                })()}

                {/* Központi FAB [+] */}
                <div className="h-8 w-8 rounded-full bg-[var(--color-primary-blue,#2563EB)] text-white flex items-center justify-center shadow">
                  <Plus className="h-4 w-4 stroke-[3]" />
                </div>

                {/* 3. Gomb */}
                {(() => {
                  const opt = BOTTOM_BAR_OPTIONS.find(o => o.id === (userPreferences.mobile_bottom_bar_slot3 || userPreferences.mobile_bottom_bar_right || 'pantry')) || BOTTOM_BAR_OPTIONS[9];
                  const Icon = opt.icon;
                  return (
                    <div className="flex flex-col items-center gap-0.5 text-[var(--color-primary-blue,#2563EB)] font-bold px-1 text-center">
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] truncate max-w-[60px]">{isHu ? opt.labelHu.split(' ')[0] : opt.labelEn.split(' ')[0]}</span>
                    </div>
                  );
                })()}

                {/* 4. Gomb */}
                {(() => {
                  const opt = BOTTOM_BAR_OPTIONS.find(o => o.id === (userPreferences.mobile_bottom_bar_slot4 || 'household')) || BOTTOM_BAR_OPTIONS[4];
                  const Icon = opt.icon;
                  return (
                    <div className="flex flex-col items-center gap-0.5 text-[var(--color-primary-blue,#2563EB)] font-bold px-1 text-center">
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] truncate max-w-[60px]">{isHu ? opt.labelHu.split(' ')[0] : opt.labelEn.split(' ')[0]}</span>
                    </div>
                  );
                })()}
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
