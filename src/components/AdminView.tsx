import React, { useState, useEffect } from 'react';
import { useApp, useModalBack } from '../context/AppContext';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Boxes,
  RefreshCw,
  FileText,
  Search,
  X,
  UserX,
  UserCheck,
  Share2,
  Sliders,
  Activity,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  Palette,
  Layers,
  HelpCircle,
  FolderTree,
  BookOpen,
  ArrowLeft,
  LogOut,
  Shield,
  Upload,
  Loader2,
  Image as ImageIcon,
  Menu,
  Ticket,
  Gift,
  Copy,
  Check,
  Clock,
  Ban,
  Crown,
} from 'lucide-react';
import type { UserStatus, LegalSlug, UserDetailStats } from '../types';
import { supabase } from '../lib/supabase';
import { isAdmin as checkIsAdmin } from '../lib/permissions';
import { isR2Configured } from '../lib/r2';
import { uploadFileToStorage, deleteFileFromStorage } from '../lib/storage';

export const AdminView: React.FC = () => {
  const {
    user,
    isAdmin,
    setCurrentView,
    items,
    itemShares,
    language,
    siteSettings,
    updateSiteSettings,
    toggleRegistration,
    toggleMaintenance,
    usersList,
    fetchUsersList,
    fetchUserDetailStats,
    toggleUserSuspension,
    deleteUserAccountByAdmin,
    adminAuditLogs,
    activeLegalSlug,
    setActiveLegalSlug,
    legalDocumentVersions,
    fetchLegalDocumentVersions,
    saveLegalDocumentVersion,
    landingBlocks,
    fetchLandingBlocks,
    saveLandingBlock,
    faqsList,
    fetchFAQs,
    saveFAQ,
    deleteFAQ,
    goBack,
  } = useApp();

interface PromoCodeRecord {
  id: string;
  code: string;
  type: 'vip' | 'promo';
  target_plan_id: string;
  duration_days: number | null;
  valid_until: string | null;
  max_uses: number;
  used_count: number;
  status: 'active' | 'exhausted' | 'expired' | 'revoked';
  campaign_name: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'registration' | 'content' | 'legal' | 'settings' | 'audit' | 'faq' | 'promo'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User details modal state
  const [selectedUserStats, setSelectedUserStats] = useState<UserDetailStats | null>(null);
  const [showSuspendConfirmModal, setShowSuspendConfirmModal] = useState(false);
  const [targetUserToSuspend, setTargetUserToSuspend] = useState<{ id: string; name: string; currentStatus: UserStatus } | null>(null);
  const [showDeleteUserConfirmModal, setShowDeleteUserConfirmModal] = useState(false);
  const [targetUserToDelete, setTargetUserToDelete] = useState<{ id: string; email: string } | null>(null);

  // Promo / VIP codes state
  const [promoCodes, setPromoCodes] = useState<PromoCodeRecord[]>([]);
  const [isLoadingPromoCodes, setIsLoadingPromoCodes] = useState(false);
  const [promoSearchTerm, setPromoSearchTerm] = useState('');
  const [promoStatusFilter, setPromoStatusFilter] = useState<'all' | 'active' | 'exhausted' | 'expired' | 'revoked'>('all');
  const [showCreatePromoModal, setShowCreatePromoModal] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'vip' | 'promo'>('vip');
  const [newPromoTargetPlan, setNewPromoTargetPlan] = useState<'plus' | 'family' | 'business'>('plus');
  const [newPromoDurationPreset, setNewPromoDurationPreset] = useState<'7' | '30' | '90' | '180' | '365' | 'perpetual' | 'custom'>('30');
  const [newPromoDurationCustom, setNewPromoDurationCustom] = useState<number | ''>('');
  const [newPromoValidUntil, setNewPromoValidUntil] = useState('');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(1);
  const [newPromoCampaign, setNewPromoCampaign] = useState('');
  const [newPromoNotes, setNewPromoNotes] = useState('');
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [targetCodeToRevoke, setTargetCodeToRevoke] = useState<PromoCodeRecord | null>(null);
  const [revokeMode, setRevokeMode] = useState<'immediate' | 'graceful'>('graceful');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeGracePeriodDays, setRevokeGracePeriodDays] = useState(30);
  const [isRevokingPromo, setIsRevokingPromo] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Mobile back button traps: closing modals on back button without changing route
  useModalBack(selectedUserStats !== null, () => setSelectedUserStats(null), 'admin-user-stats');
  useModalBack(showSuspendConfirmModal, () => setShowSuspendConfirmModal(false), 'admin-suspend-confirm');
  useModalBack(showDeleteUserConfirmModal, () => setShowDeleteUserConfirmModal(false), 'admin-delete-confirm');
  useModalBack(showCreatePromoModal, () => setShowCreatePromoModal(false), 'admin-create-promo');
  useModalBack(targetCodeToRevoke !== null, () => setTargetCodeToRevoke(null), 'admin-revoke-promo');

  // Settings form state
  const [siteName, setSiteName] = useState(siteSettings.site_name);
  const [siteDescription, setSiteDescription] = useState(siteSettings.site_description || '');
  const [heroTitle, setHeroTitle] = useState(siteSettings.hero_title);
  const [heroSubtitle, setHeroSubtitle] = useState(siteSettings.hero_subtitle || '');
  const [announcement, setAnnouncement] = useState(siteSettings.announcement || '');
  const [maintenanceMessage, setMaintenanceMessage] = useState(siteSettings.maintenance_message || '');
  const [contactEmail, setContactEmail] = useState(siteSettings.contact_email || 'info@thingor.com');
  const [supportEmail, setSupportEmail] = useState(siteSettings.support_email || 'support@thingor.com');
  const [primaryColor, setPrimaryColor] = useState(siteSettings.primary_color || '#10b981');
  const [logoUrl, setLogoUrl] = useState(siteSettings.logo_url || '/logo.png');
  const [faviconUrl, setFaviconUrl] = useState(siteSettings.favicon_url || '/favicon.png');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const oldLogo = siteSettings.logo_url || logoUrl;
      const res = await uploadFileToStorage(file, 'photos', user?.id || 'admin');
      if (res.error) {
        setActionMsg({ type: 'error', text: 'Hiba a logó feltöltésekor: ' + res.error });
      } else {
        const url = res.signedUrl || res.path || '';
        if (url) {
          // Delete old stored logo file if different
          if (oldLogo && oldLogo !== url) {
            try {
              await deleteFileFromStorage(oldLogo);
            } catch (delErr) {
              console.warn('Nem sikerült törölni az előző logó fájlt:', delErr);
            }
          }
          setLogoUrl(url);
          const updatePayload: { logo_url: string; favicon_url?: string } = { logo_url: url };
          if (!siteSettings.favicon_url || siteSettings.favicon_url === '/favicon.png') {
            setFaviconUrl(url);
            updatePayload.favicon_url = url;
          }
          const updateRes = await updateSiteSettings(updatePayload);
          if (updateRes.success) {
            setActionMsg({ type: 'success', text: 'Új logó kép feltöltve, a régi törölve és sikeresen elmentve!' });
          } else {
            setActionMsg({ type: 'error', text: 'Logó feltöltve, de a beállítás mentése sikertelen: ' + (updateRes.error || '') });
          }
          setTimeout(() => setActionMsg(null), 3500);
        }
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Hiba a logó feltöltésekor: ' + (err.message || 'Ismeretlen hiba') });
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFavicon(true);
    try {
      const oldFavicon = siteSettings.favicon_url || faviconUrl;
      const res = await uploadFileToStorage(file, 'photos', user?.id || 'admin');
      if (res.error) {
        setActionMsg({ type: 'error', text: 'Hiba a favicon feltöltésekor: ' + res.error });
      } else {
        const url = res.signedUrl || res.path || '';
        if (url) {
          if (oldFavicon && oldFavicon !== url) {
            try {
              await deleteFileFromStorage(oldFavicon);
            } catch (delErr) {
              console.warn('Nem sikerült törölni az előző favicon fájlt:', delErr);
            }
          }
          setFaviconUrl(url);
          const updateRes = await updateSiteSettings({ favicon_url: url });
          if (updateRes.success) {
            setActionMsg({ type: 'success', text: 'Új favicon & PWA ikon feltöltve, a régi törölve és elmentve!' });
          } else {
            setActionMsg({ type: 'error', text: 'Favicon feltöltve, de a mentés sikertelen: ' + (updateRes.error || '') });
          }
          setTimeout(() => setActionMsg(null), 3500);
        }
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Hiba a favicon feltöltésekor: ' + (err.message || 'Ismeretlen hiba') });
    } finally {
      setIsUploadingFavicon(false);
      e.target.value = '';
    }
  };

  // Registration paused form state
  const [regPausedTitle, setRegPausedTitle] = useState(siteSettings.registration_paused_title || 'A regisztráció jelenleg szünetel');
  const [regPausedMsg, setRegPausedMsg] = useState(siteSettings.registration_paused_message || 'A regisztráció átmenetileg fel van függesztve.');

  // Legal document editing state
  const [legalDocTitle, setLegalDocTitle] = useState('');
  const [legalDocContent, setLegalDocContent] = useState('');

  // FAQ editing state
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchUsersList();
      fetchLandingBlocks();
      fetchFAQs();
      fetchLegalDocumentVersions(activeLegalSlug);
    }
  }, [isAdmin, activeLegalSlug]);

  const fetchPromoCodes = async () => {
    setIsLoadingPromoCodes(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPromoCodes(data || []);
    } catch (err: any) {
      console.error('Hiba a VIP kódok lekérésekor:', err);
      setActionMsg({ type: 'error', text: 'Nem sikerült betölteni a VIP kódokat: ' + (err?.message || '') });
    } finally {
      setIsLoadingPromoCodes(false);
    }
  };

  useEffect(() => {
    if (isAdmin && (activeTab === 'promo' || activeTab === 'overview')) {
      fetchPromoCodes();
    }
  }, [isAdmin, activeTab]);

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPromo(true);
    try {
      const durationDays = newPromoDurationPreset === 'perpetual'
        ? null
        : newPromoDurationPreset === 'custom'
        ? (newPromoDurationCustom ? Number(newPromoDurationCustom) : null)
        : Number(newPromoDurationPreset);

      const validUntilIso = newPromoValidUntil ? new Date(newPromoValidUntil).toISOString() : null;

      const { data, error } = await supabase.rpc('admin_generate_promo_code', {
        p_code: newPromoCode.trim() || null,
        p_type: newPromoType,
        p_target_plan_id: newPromoTargetPlan,
        p_duration_days: durationDays,
        p_valid_until: validUntilIso,
        p_max_uses: Number(newPromoMaxUses) || 1,
        p_campaign_name: newPromoCampaign.trim() || null,
        p_admin_notes: newPromoNotes.trim() || null
      });

      if (error) throw error;
      const createdCode = data?.code || newPromoCode.trim().toUpperCase();
      if (createdCode && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(createdCode);
      }
      setActionMsg({
        type: 'success',
        text: `VIP kód sikeresen létrehozva és a vágólapra másolva: ${createdCode}`
      });
      setTimeout(() => setActionMsg(null), 4000);
      await fetchPromoCodes();
      setShowCreatePromoModal(false);
      setNewPromoCode('');
      setNewPromoCampaign('');
      setNewPromoNotes('');
      setNewPromoValidUntil('');
      setNewPromoMaxUses(1);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Hiba a VIP kód létrehozásakor: ' + (err?.message || 'Ismeretlen hiba') });
    } finally {
      setIsCreatingPromo(false);
    }
  };

  const handleRevokePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCodeToRevoke) return;
    setIsRevokingPromo(true);
    try {
      const { data, error } = await supabase.rpc('admin_revoke_promo_code', {
        p_promo_code_id: targetCodeToRevoke.id,
        p_mode: revokeMode,
        p_reason: revokeReason.trim() || 'Adminisztrátori visszavonás',
        p_grace_period_days: Number(revokeGracePeriodDays) || 30
      });

      if (error) throw error;
      setActionMsg({
        type: 'success',
        text: `VIP kód (${targetCodeToRevoke.code}) sikeresen visszavonva (${revokeMode === 'immediate' ? 'azonnali' : 'türelmi idővel'}). Érintett beváltások: ${data?.affected_redemptions ?? 0}`
      });
      setTimeout(() => setActionMsg(null), 4000);
      setTargetCodeToRevoke(null);
      setRevokeReason('');
      await fetchPromoCodes();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Hiba a VIP kód visszavonásakor: ' + (err?.message || '') });
    } finally {
      setIsRevokingPromo(false);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  useEffect(() => {
    setSiteName(siteSettings.site_name);
    setSiteDescription(siteSettings.site_description || '');
    setHeroTitle(siteSettings.hero_title);
    setHeroSubtitle(siteSettings.hero_subtitle || '');
    setAnnouncement(siteSettings.announcement || '');
    setMaintenanceMessage(siteSettings.maintenance_message || '');
    setContactEmail(siteSettings.contact_email || 'info@thingor.com');
    setSupportEmail(siteSettings.support_email || 'support@thingor.com');
    setPrimaryColor(siteSettings.primary_color || '#10b981');
    setLogoUrl(siteSettings.logo_url || '/logo.png');
    setFaviconUrl(siteSettings.favicon_url || '/favicon.png');
    setRegPausedTitle(siteSettings.registration_paused_title || 'A regisztráció jelenleg szünetel');
    setRegPausedMsg(siteSettings.registration_paused_message || 'A regisztráció átmenetileg fel van függesztve.');
  }, [siteSettings]);

  // Access check
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4 bg-[var(--bg-main,#303943)] text-[var(--text-main,#E0E3E6)] py-16">
        <div className="p-4 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400 shadow-xl">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">
          {language === 'hu' ? 'Hozzáférés Megtagadva (ACCESS DENIED)' : 'Access Denied'}
        </h2>
        <p className="text-sm text-[var(--text-sub,#B5BDC6)] max-w-md">
          {language === 'hu'
            ? 'Ez a felület kizárólag a platform igazolt adminisztrátorai számára érhető el. Az Ön fiókja nem rendelkezik adminisztrátori jogosultsággal.'
            : 'This page is restricted exclusively to system administrators.'}
        </p>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] font-semibold text-sm border border-[var(--border-color,#56616D)] transition-colors"
        >
          {language === 'hu' ? 'Vissza a Vezérlőpultra' : 'Return to Dashboard'}
        </button>
      </div>
    );
  }

  const handleOpenUserDetail = async (userId: string) => {
    const stats = await fetchUserDetailStats(userId);
    setSelectedUserStats(stats);
  };

  const handleConfirmSuspend = async () => {
    if (!targetUserToSuspend) return;
    const nextStatus: UserStatus = targetUserToSuspend.currentStatus === 'suspended' ? 'active' : 'suspended';
    const success = await toggleUserSuspension(targetUserToSuspend.id, nextStatus);
    if (success) {
      setActionMsg({
        type: 'success',
        text: nextStatus === 'suspended' ? 'Felhasználó sikeresen felfüggesztve.' : 'Felhasználói fiók újra aktiválva.'
      });
      setTimeout(() => setActionMsg(null), 3000);
      if (selectedUserStats?.user_id === targetUserToSuspend.id) {
        setSelectedUserStats(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    }
    setShowSuspendConfirmModal(false);
    setTargetUserToSuspend(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!targetUserToDelete) return;
    const res = await deleteUserAccountByAdmin(targetUserToDelete.id);
    if (res.success) {
      setActionMsg({ type: 'success', text: `A(z) ${targetUserToDelete.email} felhasználói fiók és minden adata törlésre került.` });
      setTimeout(() => setActionMsg(null), 3000);
      setSelectedUserStats(null);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Hiba történt a törlés során.' });
    }
    setShowDeleteUserConfirmModal(false);
    setTargetUserToDelete(null);
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const oldLogo = siteSettings.logo_url;
    const oldFavicon = siteSettings.favicon_url;
    if (oldLogo && logoUrl && oldLogo !== logoUrl) {
      try {
        await deleteFileFromStorage(oldLogo);
      } catch (delErr) {
        console.warn('Nem sikerült törölni az előző logót:', delErr);
      }
    }
    if (oldFavicon && faviconUrl && oldFavicon !== faviconUrl) {
      try {
        await deleteFileFromStorage(oldFavicon);
      } catch (delErr) {
        console.warn('Nem sikerült törölni az előző favicont:', delErr);
      }
    }
    const res = await updateSiteSettings({
      site_name: siteName,
      site_description: siteDescription,
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      announcement: announcement || null,
      maintenance_message: maintenanceMessage,
      contact_email: contactEmail,
      support_email: supportEmail,
      primary_color: primaryColor,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      registration_paused_title: regPausedTitle,
      registration_paused_message: regPausedMsg,
    });
    if (res.success) {
      setActionMsg({ type: 'success', text: 'Platform beállítások sikeresen elmentve.' });
      setTimeout(() => setActionMsg(null), 3000);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Hiba történt a mentés során.' });
    }
  };

  const handleSaveLegalDoc = async (publish: boolean) => {
    if (!legalDocContent.trim()) return;
    const res = await saveLegalDocumentVersion(activeLegalSlug, legalDocTitle, legalDocContent, publish);
    if (res.success) {
      setActionMsg({
        type: 'success',
        text: publish ? `Új éles verzió publikálva (${activeLegalSlug.toUpperCase()})` : 'Piszkozat elmentve.'
      });
      setTimeout(() => setActionMsg(null), 3000);
      setLegalDocContent('');
      setLegalDocTitle('');
      fetchLegalDocumentVersions(activeLegalSlug);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Hiba a jogi dokumentum mentésekor.' });
    }
  };

  const handleSaveFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    const res = await saveFAQ({ question: faqQuestion, answer: faqAnswer, is_published: true });
    if (res.success) {
      setActionMsg({ type: 'success', text: 'Gyakori Kérdés (FAQ) elmentve.' });
      setTimeout(() => setActionMsg(null), 3000);
      setFaqQuestion('');
      setFaqAnswer('');
      setShowAddFaqModal(false);
    }
  };

  const filteredUsers = usersList.filter(u =>
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentLegalVersions = legalDocumentVersions.filter(v => v.document_slug === activeLegalSlug);

  return (
    <div className="bg-[var(--bg-main,#303943)] min-h-screen text-[var(--text-main,#E0E3E6)] flex flex-col font-sans -mx-4 -mt-6 sm:-mx-6 sm:-mt-8 lg:-mx-8">
      {/* TOP HEADER BAR */}
      <header className="h-16 border-b border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        {/* Left Mobile Menu Toggle + Logo */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-1 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white md:hidden border border-[var(--border-color,#56616D)] transition-colors"
            title="Navigációs menü"
            aria-label="Navigációs menü"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/30 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[var(--text-main,#E0E3E6)] text-base tracking-tight">ADMIN</span>
              <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">Panel</span>
            </div>
          </div>
        </div>

        {/* Center Universal Search Bar */}
        <div className="relative flex-1 max-w-xl mx-auto hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-sub,#B5BDC6)]" />
          <input
            type="text"
            placeholder="Keresés tárgyak, felhasználók, beállítások..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-all"
          />
        </div>

        {/* Right User & Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-[var(--text-main,#E0E3E6)] truncate max-w-[150px]">{user?.email || 'admin@thingor.com'}</p>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Adminisztrátor
            </span>
          </div>

          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)]/80 transition-colors"
            title="Vissza a főoldalra"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MOBILE HORIZONTAL SCROLLABLE TAB PILLS */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 bg-[var(--card-bg,#3A4551)] border-b border-[var(--border-color,#56616D)] no-scrollbar shrink-0">
        {[
          { id: 'overview', label: 'Áttekintés', icon: LayoutDashboard, color: 'text-indigo-400' },
          { id: 'promo', label: 'VIP Kódok', icon: Ticket, color: 'text-amber-400' },
          { id: 'users', label: 'Moderáció', icon: ShieldAlert, color: 'text-rose-400' },
          { id: 'content', label: 'Kezdőlap', icon: Layers, color: 'text-pink-400' },
          { id: 'faq', label: 'GYIK', icon: HelpCircle, color: 'text-purple-400' },
          { id: 'legal', label: 'Jogi', icon: FileText, color: 'text-teal-400' },
          { id: 'registration', label: 'Működés', icon: Sliders, color: 'text-amber-400' },
          { id: 'settings', label: 'Beállítások', icon: Palette, color: 'text-emerald-400' },
          { id: 'audit', label: 'Audit', icon: Activity, color: 'text-cyan-400' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MOBILE DRAWER NAVIGATION */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-72 max-w-[85vw] bg-[var(--card-bg,#3A4551)] border-r border-[var(--border-color,#56616D)] h-full flex flex-col justify-between p-4 shadow-2xl animate-fade-in overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color,#56616D)]">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="font-extrabold text-sm text-[var(--text-main,#E0E3E6)]">Admin Menü</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* GROUP 1: ADMIN */}
              <div>
                <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                  ADMIN
                </p>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'overview'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span>Áttekintés</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'users'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Moderáció & Jogok</span>
                  </button>
                </nav>
              </div>

              {/* GROUP 2: TARTALOM */}
              <div>
                <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                  TARTALOM
                </p>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('content'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'content'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-pink-400" />
                    <span>Kezdőlap & Blokkok</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('faq'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'faq'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>GYIK & Kérdések</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('legal'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'legal'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>Jogi Dokumentumok</span>
                  </button>
                </nav>
              </div>

              {/* GROUP 3: PLATFORM & BEÁLLÍTÁSOK */}
              <div>
                <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                  PLATFORM & BEÁLLÍTÁSOK
                </p>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('registration'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'registration'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Regisztráció & Működés</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('promo'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'promo'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-amber-500 shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <Ticket className="w-4 h-4 text-amber-400" />
                    <span>VIP & Promóciók</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'settings'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span>Rendszer Beállítások</span>
                  </button>
                </nav>
              </div>

              {/* GROUP 4: BIZTONSÁG & LOGOK */}
              <div>
                <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                  BIZTONSÁG & LOGOK
                </p>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('audit'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'audit'
                        ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Audit Napló</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* BOTTOM EXIT BUTTON */}
            <div className="pt-4 border-t border-[var(--border-color,#56616D)]">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  goBack();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Vissza az előző oldalra</span>
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* MAIN CONTAINER: SIDEBAR + CONTENT */}
      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
        {/* DESKTOP LEFT SIDEBAR NAVIGATION */}
        <aside className="hidden md:flex w-64 bg-[var(--card-bg,#3A4551)] border-r border-[var(--border-color,#56616D)] flex-col justify-between p-4 flex-shrink-0">
          <div className="space-y-6">
            {/* GROUP 1: ADMIN */}
            <div>
              <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                ADMIN
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>Áttekintés</span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'users'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Moderáció & Jogok</span>
                </button>
              </nav>
            </div>

            {/* GROUP 2: TARTALOM */}
            <div>
              <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                TARTALOM
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'content'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <Layers className="w-4 h-4 text-pink-400" />
                  <span>Kezdőlap & Blokkok</span>
                </button>

                <button
                  onClick={() => setActiveTab('faq')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'faq'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <span>GYIK & Kérdések</span>
                </button>

                <button
                  onClick={() => setActiveTab('legal')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'legal'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Jogi Dokumentumok</span>
                </button>
              </nav>
            </div>

            {/* GROUP 3: PLATFORM & BEÁLLÍTÁSOK */}
            <div>
              <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                PLATFORM & BEÁLLÍTÁSOK
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('registration')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'registration'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Regisztráció & Működés</span>
                </button>

                <button
                  onClick={() => setActiveTab('promo')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'promo'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-amber-500 shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>VIP & Promóciók</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'settings'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>Rendszer Beállítások</span>
                </button>
              </nav>
            </div>

            {/* GROUP 4: BIZTONSÁG & LOGOK */}
            <div>
              <p className="text-[10px] font-extrabold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider px-3 mb-2">
                BIZTONSÁG & LOGOK
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'audit'
                      ? 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border-l-4 border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Audit Napló</span>
                </button>
              </nav>
            </div>
          </div>

          {/* BOTTOM EXIT BUTTON */}
          <div className="pt-4 border-t border-[var(--border-color,#56616D)]">
            <button
              onClick={goBack}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vissza az előző oldalra</span>
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 bg-[var(--bg-main,#303943)] p-4 sm:p-6 md:p-8 overflow-y-auto">
          {/* Action Notification Toast */}
          {actionMsg && (
            <div
              className={`mb-6 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
                actionMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              <span>{actionMsg.text}</span>
              <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main,#E0E3E6)] tracking-tight">Áttekintés</h1>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-1">
                    Üdvözöljük, <span className="text-[var(--text-main,#E0E3E6)] font-semibold">{user?.email}</span>! Itt látja a tartalmak összesítését.
                  </p>
                </div>

                <button
                  onClick={() => { fetchUsersList(); fetchLandingBlocks(); fetchFAQs(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs font-medium text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]/80 transition-colors self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Frissítés</span>
                </button>
              </div>

              {/* 5 METRIC CARDS ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Metric 1 */}
                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-5 flex flex-col justify-between hover:border-pink-500/40 transition-all group shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Tárgyak</span>
                    <Boxes className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{items.length}</p>
                  </div>
                  <button onClick={() => setCurrentView('dashboard')} className="text-[11px] font-bold text-pink-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 2 */}
                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all group shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Kategóriák</span>
                    <FolderTree className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">8</p>
                  </div>
                  <button onClick={() => setActiveTab('settings')} className="text-[11px] font-bold text-purple-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 3 */}
                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-5 flex flex-col justify-between hover:border-[var(--color-primary-blue,#2563EB)]/50 transition-all group shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Megosztások</span>
                    <Share2 className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)] group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{itemShares.length || 494}</p>
                  </div>
                  <button onClick={() => setActiveTab('overview')} className="text-[11px] font-bold text-[var(--color-primary-blue,#2563EB)] flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 4 */}
                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-5 flex flex-col justify-between hover:border-teal-500/40 transition-all group shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Jogi Dokumentumok</span>
                    <BookOpen className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{legalDocumentVersions.length || 4}</p>
                  </div>
                  <button onClick={() => setActiveTab('legal')} className="text-[11px] font-bold text-teal-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 5 */}
                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all group shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Felhasználók</span>
                    <Users className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{usersList.length || 8}</p>
                  </div>
                  <button onClick={() => setActiveTab('users')} className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>
              </div>

              {/* TWO LARGE BOTTOM CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT BOX: Moderációs Várólista & Rendszerállapot */}
                <div className="lg:col-span-7 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Moderációs Várólista & Rendszerállapot</h3>
                      <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Jóváhagyásra váró tartalmak & beállítások</p>
                    </div>
                    <button onClick={() => setActiveTab('users')} className="text-xs font-bold text-pink-400 hover:underline">
                      Várólista megnyitása →
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Regisztráció Állapota</h4>
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mt-0.5">
                          {siteSettings.registration_enabled ? 'Új felhasználók regisztrációja nyitva' : 'Regisztráció jelenleg szüneteltetve'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        siteSettings.registration_enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {siteSettings.registration_enabled ? 'Nyitva' : 'Szünetel'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Cloudflare R2 Tárhely Engine</h4>
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mt-0.5">
                          {isR2Configured ? 'Médiafájlok közvetlenül R2 tárolóba töltődnek' : 'Helyi / Supabase tároló'}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        {isR2Configured ? 'R2 Aktív' : 'Supabase'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Karbantartási Üzemmód</h4>
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] mt-0.5">
                          {siteSettings.maintenance_mode ? 'A platform karbantartás alatt van' : 'Normál éles üzemmód'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        siteSettings.maintenance_mode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {siteSettings.maintenance_mode ? 'Karbantartás' : 'Online'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT BOX: Gyors Platform Műveletek */}
                <div className="lg:col-span-5 bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Gyors Platform Műveletek</h3>
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Modulok közvetlen elérése</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('content')}
                      className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] hover:border-pink-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider block mb-1">ÚTMUTATÓK</span>
                      <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-pink-300">Landing & Blokkok</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('users')}
                      className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)]/50 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-[var(--color-primary-blue,#2563EB)] uppercase tracking-wider block mb-1">RBAC</span>
                      <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-blue-300">Jogosultságok</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('faq')}
                      className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] hover:border-purple-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider block mb-1">GYIK</span>
                      <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-purple-300">Gyakori Kérdések</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('legal')}
                      className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] hover:border-teal-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider block mb-1">JOGI</span>
                      <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-teal-300">Verziózás & ÁSZF</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('settings')}
                      className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] hover:border-emerald-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">BEÁLLÍTÁSOK</span>
                      <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-emerald-300">Platform Testreszabás</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('audit')}
                      className="p-4 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] hover:border-cyan-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider block mb-1">BIZTONSÁG</span>
                      <h4 className="text-xs font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-cyan-300">Audit Napló</h4>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)]">Felhasználók & Jogosultságok</h2>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Regisztrált fiókok, státuszok és moderációs műveletek.</p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
                  <input
                    type="text"
                    placeholder="Keresés név, email vagy User ID alapján..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>

              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[var(--text-main,#E0E3E6)] min-w-[620px]">
                    <thead className="bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] font-bold uppercase tracking-wider border-b border-[var(--border-color,#56616D)]">
                      <tr>
                        <th className="px-6 py-4">Felhasználó</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Regisztráció</th>
                        <th className="px-6 py-4">Szerepkör</th>
                        <th className="px-6 py-4">Státusz</th>
                        <th className="px-6 py-4 text-right">Műveletek</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color,#56616D)]">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-sub,#B5BDC6)]">
                            Nem található a keresésnek megfelelő felhasználó.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => {
                          const isUserAdmin = checkIsAdmin(u);
                          const isUserSuspended = u.status === 'suspended';
                          return (
                            <tr key={u.id || u.user_id} className="hover:bg-[var(--surface-bg,#465362)]/60 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-bg,#465362)] flex items-center justify-center font-bold text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)]">
                                    {u.display_name?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[var(--text-main,#E0E3E6)] cursor-pointer hover:text-[var(--color-primary-blue,#2563EB)]" onClick={() => handleOpenUserDetail(u.user_id || u.id)}>
                                      {u.display_name}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] font-mono">{u.user_id || u.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-[var(--text-main,#E0E3E6)] font-medium">{u.email}</td>
                              <td className="px-6 py-4 text-[var(--text-sub,#B5BDC6)] font-mono">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  isUserAdmin
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {isUserAdmin ? 'Admin' : 'User'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isUserSuspended
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {isUserSuspended ? 'Felfüggesztve' : 'Aktív'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenUserDetail(u.user_id || u.id)}
                                    className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-sub,#B5BDC6)] hover:text-white border border-[var(--border-color,#56616D)]"
                                    title="Részletek"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {!isUserAdmin && (
                                    <button
                                      onClick={() => {
                                        setTargetUserToSuspend({ id: u.user_id || u.id, name: u.display_name, currentStatus: u.status || 'active' });
                                        setShowSuspendConfirmModal(true);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                        isUserSuspended
                                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      }`}
                                    >
                                      {isUserSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                      <span>{isUserSuspended ? 'Aktiválás' : 'Felfüggesztés'}</span>
                                    </button>
                                  )}

                                  {!isUserAdmin && (
                                    <button
                                      onClick={() => {
                                        setTargetUserToDelete({ id: u.user_id || u.id, email: u.email });
                                        setShowDeleteUserConfirmModal(true);
                                      }}
                                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 hover:text-white border border-rose-800/40"
                                      title="Fiók Törlése"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT & LANDING BUILDER */}
          {activeTab === 'content' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)]">Kezdőlap & Blokkok Kezelése</h2>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Testreszabható vizuális és szöveges elemek a publikus főoldalon.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {landingBlocks.map(block => (
                  <div key={block.id} className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">{block.section_key}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        block.is_enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)]'
                      }`}>
                        {block.is_enabled ? 'Megjelenítve' : 'Rejtve'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Cím</label>
                        <input
                          type="text"
                          defaultValue={block.title}
                          onBlur={e => saveLandingBlock({ ...block, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Alcím / Leírás</label>
                        <textarea
                          rows={2}
                          defaultValue={block.description || ''}
                          onBlur={e => saveLandingBlock({ ...block, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)]">Gyakori Kérdések (GYIK)</h2>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Publikus válaszok és tájékoztatók a kezdőlapon.</p>
                </div>

                <button
                  onClick={() => setShowAddFaqModal(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Új Kérdés Hozzáadása
                </button>
              </div>

              <div className="space-y-4">
                {faqsList.map(faq => (
                  <div key={faq.id} className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-5 flex items-start justify-between gap-4 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        {faq.question}
                      </h4>
                      <p className="text-xs text-[var(--text-sub,#B5BDC6)] pl-6 leading-relaxed">{faq.answer}</p>
                    </div>

                    <button
                      onClick={() => deleteFAQ(faq.id)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: LEGAL DOCUMENTS */}
          {activeTab === 'legal' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)]">Jogi Dokumentumok Verziózása</h2>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Adatvédelmi Tájékoztató, ÁSZF, Süti Tájékoztató és Impresszum élesítése.</p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['privacy', 'terms', 'cookies', 'imprint'] as LegalSlug[]).map(slug => (
                    <button
                      key={slug}
                      onClick={() => { setActiveLegalSlug(slug); fetchLegalDocumentVersions(slug); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                        activeLegalSlug === slug
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-[var(--surface-bg,#465362)]/60 text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-white border border-[var(--border-color,#56616D)]'
                      }`}
                    >
                      {slug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] uppercase tracking-wider">Új Verzió Létrehozása & Publikálása ({activeLegalSlug.toUpperCase()})</h3>
                
                <input
                  type="text"
                  placeholder="Verzió Címe (pl. Adatvédelmi Tájékoztató v2.0)"
                  value={legalDocTitle}
                  onChange={e => setLegalDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-teal-400"
                />

                <textarea
                  rows={8}
                  placeholder="Illeszd be a jogi dokumentum teljes szövegét..."
                  value={legalDocContent}
                  onChange={e => setLegalDocContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-teal-400 font-mono leading-relaxed"
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleSaveLegalDoc(false)}
                    className="px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] text-xs font-semibold border border-[var(--border-color,#56616D)] transition-colors"
                  >
                    Mentés Piszkozatként
                  </button>
                  <button
                    onClick={() => handleSaveLegalDoc(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-900/30 transition-colors"
                  >
                    Verzió Publikálása Élesbe
                  </button>
                </div>
              </div>

              {/* Version History Table */}
              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">Verziótörténet</h4>
                <div className="divide-y divide-[var(--border-color,#56616D)]">
                  {currentLegalVersions.map(ver => (
                    <div key={ver.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[var(--text-main,#E0E3E6)]">{ver.title}</span>
                        <span className="text-[var(--text-sub,#B5BDC6)] ml-2 font-mono">v{ver.version}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ver.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {ver.status === 'published' ? 'PUBLIKÁLVA' : 'PISZKOZAT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: REGISTRATION & MAINTENANCE & NOTIFICATIONS */}
          {activeTab === 'registration' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Új Regisztrációk Felfüggesztése</h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Ki- vagy bekapcsolhatod a regisztrációt a platformon.</p>

                <button
                  onClick={() => toggleRegistration(!siteSettings.registration_enabled)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    siteSettings.registration_enabled
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {siteSettings.registration_enabled ? 'Új Regisztrációk Szüneteltetése' : 'Regisztráció Megnyitása'}
                </button>
              </div>

              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Karbantartási Üzemmód</h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Az egész weboldalt karbantartási módba állíthatod.</p>

                <button
                  onClick={() => toggleMaintenance(!siteSettings.maintenance_mode)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    siteSettings.maintenance_mode
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {siteSettings.maintenance_mode ? 'Karbantartás Kikapcsolása' : 'Karbantartási Mód Aktiválása'}
                </button>
              </div>

              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Rendszer Értesítési Motor</h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Garancia, finanszírozás és javítási értesítések globális ki/bekapcsolása.</p>

                <button
                  onClick={() => updateSiteSettings({ notifications_enabled: !(siteSettings.notifications_enabled ?? true) })}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    (siteSettings.notifications_enabled ?? true)
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {(siteSettings.notifications_enabled ?? true) ? 'Értesítések Globálisan Aktívak (Kattints a kikapcsoláshoz)' : 'Értesítések Globálisan Kikapcsolva (Kattints az aktiváláshoz)'}
                </button>
              </div>

              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Email Értesítő Rendszer</h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Időzített szerveroldali email küldés engedélyezése a platformon.</p>

                <button
                  onClick={() => updateSiteSettings({ email_notifications_enabled: !(siteSettings.email_notifications_enabled ?? true) })}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    (siteSettings.email_notifications_enabled ?? true)
                      ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)]'
                  }`}
                >
                  {(siteSettings.email_notifications_enabled ?? true) ? 'Szerveroldali Email Küldés Aktív' : 'Szerveroldali Email Küldés Szünetel'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSavePlatformSettings} className="space-y-6 animate-fade-in max-w-3xl">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)]">Rendszer Beállítások</h2>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Platform név, színek, email címek és kapcsolattartás.</p>
              </div>

              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Oldal Neve (Site Name)</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Hero Címsor (Hero Title)</label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={e => setHeroTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Kapcsolattartó Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Support Email</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={e => setSupportEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>
                </div>
              </div>

              {/* BRAND ASSETS: LOGO & FAVICON VISUAL MANAGER */}
              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="border-b border-[var(--border-color,#56616D)] pb-4">
                  <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)]" /> Márka Vizuális Elemei & Ikonok (Logo & Favicon Manager)
                  </h3>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-1">
                    Állítsd be és töltsd fel, hogy a Logó és a Favicon hol, milyen URL-lel és mekkora méretben jelenjen meg a felületen.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LOGO MANAGEMENT */}
                  <div className="space-y-4 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] p-5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)] uppercase tracking-wider">1. Fő Logó (Brand Logo)</span>
                      <span className="text-[10px] text-[var(--text-sub,#B5BDC6)]">Navigáció & Lábjegyzet</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Logó Kép URL</label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          placeholder="/logo.png vagy R2 URL..."
                          className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] font-mono"
                        />
                        <label className="px-3 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-md transition-colors">
                          {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Feltöltés</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Live Header Logo Preview */}
                    <div className="p-4 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] space-y-2">
                      <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider block">Élő Előnézet – Fejléc (Header Bar)</span>
                      <div className="h-16 bg-slate-950 rounded-lg border border-slate-800 p-2 flex items-center px-4">
                        <img src={logoUrl || '/logo.png'} alt="Logo Preview" className="h-10 w-auto object-contain max-w-full" />
                      </div>
                    </div>
                  </div>

                  {/* FAVICON & PWA ICON MANAGEMENT */}
                  <div className="space-y-4 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] p-4 sm:p-5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)] uppercase tracking-wider">2. Favicon & PWA App Ikon</span>
                      <span className="text-[10px] text-[var(--text-sub,#B5BDC6)]">Böngésző fül & Mobil App</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">Favicon / Ikon URL</label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={faviconUrl}
                          onChange={e => setFaviconUrl(e.target.value)}
                          placeholder="/favicon.png vagy R2 URL..."
                          className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] font-mono"
                        />
                        <label className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-md transition-colors">
                          {isUploadingFavicon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Feltöltés</span>
                          <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Live Favicon & PWA Preview */}
                    <div className="p-4 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] space-y-3">
                      <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider block">Élő Előnézet – Böngésző fül & Mobil PWA</span>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                        {/* Browser tab simulation */}
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2 min-w-0">
                          <img src={faviconUrl || logoUrl || '/favicon.png'} alt="Favicon Preview" className="w-4 h-4 object-contain rounded shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-300 truncate">{siteSettings.site_name || 'Thingor'} – A tárgyaid...</span>
                        </div>

                        {/* Mobile App icon simulation */}
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 shrink-0">
                          <img src={logoUrl || faviconUrl || '/logo.png'} alt="PWA Icon Preview" className="w-8 h-8 object-cover rounded-xl shadow-md" />
                          <span className="text-[10px] font-extrabold text-white">{siteSettings.site_name || 'Thingor'} App</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-colors"
                >
                  Minden Beállítás Mentése
                </button>
              </div>
            </form>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-main,#E0E3E6)]">Admin Audit Napló</h2>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Rendszer-adminisztrátori műveletek időrendi naplója.</p>
              </div>

              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-[var(--border-color,#56616D)]">
                  {adminAuditLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-sub,#B5BDC6)]">Még nincs rögzített audit napló bejegyzés.</div>
                  ) : (
                    adminAuditLogs.map(log => (
                      <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white uppercase tracking-wider text-[11px] text-cyan-400">{log.action}</span>
                          <p className="text-[var(--text-main,#E0E3E6)]">{log.target || (log.details ? JSON.stringify(log.details) : 'Nincs részlet')}</p>
                        </div>
                        <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: VIP & PROMO CODES */}
          {activeTab === 'promo' && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main,#E0E3E6)] tracking-tight flex items-center gap-2.5">
                    <Ticket className="w-6 h-6 text-amber-400" />
                    <span>VIP & Promóciós Kódok Kezelése</span>
                  </h1>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-1">
                    Biztonságosan generálj VIP hozzáféréseket, promóciós kuponokat és felügyeld a beváltásokat.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={fetchPromoCodes}
                    disabled={isLoadingPromoCodes}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs font-semibold text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]/80 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPromoCodes ? 'animate-spin' : ''}`} />
                    <span>Frissítés</span>
                  </button>

                  <button
                    onClick={() => setShowCreatePromoModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                    <span>Új VIP Kód Generálása</span>
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Összes Kód</span>
                    <Ticket className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-[var(--text-main,#E0E3E6)] mt-2">
                    {promoCodes.length}
                  </p>
                </div>

                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Aktív Kódok</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
                    {promoCodes.filter(c => c.status === 'active').length}
                  </p>
                </div>

                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Összes Beváltás</span>
                    <Gift className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-2">
                    {promoCodes.reduce((acc, c) => acc + (c.used_count || 0), 0)}
                  </p>
                </div>

                <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-sub,#B5BDC6)]">Visszavont / Lejárt</span>
                    <Ban className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-2">
                    {promoCodes.filter(c => c.status === 'revoked' || c.status === 'expired').length}
                  </p>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-sub,#B5BDC6)]" />
                  <input
                    type="text"
                    placeholder="Keresés kód, kampány, admin megjegyzés vagy csomag alapján..."
                    value={promoSearchTerm}
                    onChange={e => setPromoSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  {(['all', 'active', 'exhausted', 'expired', 'revoked'] as const).map(statusKey => {
                    const label = statusKey === 'all' ? 'Mind'
                      : statusKey === 'active' ? 'Aktív'
                      : statusKey === 'exhausted' ? 'Kimerült'
                      : statusKey === 'expired' ? 'Lejárt'
                      : 'Visszavont';
                    const isSelected = promoStatusFilter === statusKey;
                    return (
                      <button
                        key={statusKey}
                        onClick={() => setPromoStatusFilter(statusKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Codes Listing */}
              <div className="space-y-3">
                {isLoadingPromoCodes ? (
                  <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-12 text-center">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)]">VIP kódok betöltése a szerverről...</p>
                  </div>
                ) : promoCodes.length === 0 ? (
                  <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-12 text-center">
                    <Ticket className="w-10 h-10 text-[var(--text-sub,#B5BDC6)] mx-auto mb-3 opacity-40" />
                    <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">Még nincs létrehozott VIP kód</h3>
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)] mt-1 max-w-sm mx-auto">
                      Kattints a fenti "Új VIP Kód Generálása" gombra egy új biztonságos kupon létrehozásához.
                    </p>
                  </div>
                ) : (
                  promoCodes
                    .filter(c => {
                      if (promoStatusFilter !== 'all' && c.status !== promoStatusFilter) return false;
                      if (!promoSearchTerm.trim()) return true;
                      const q = promoSearchTerm.toLowerCase();
                      return (
                        c.code.toLowerCase().includes(q) ||
                        (c.campaign_name && c.campaign_name.toLowerCase().includes(q)) ||
                        (c.admin_notes && c.admin_notes.toLowerCase().includes(q)) ||
                        c.target_plan_id.toLowerCase().includes(q)
                      );
                    })
                    .map(item => {
                      const isExpired = item.status === 'expired';
                      const isExhausted = item.status === 'exhausted' || item.used_count >= item.max_uses;
                      const isRevoked = item.status === 'revoked';

                      const planBadgeColor =
                        item.target_plan_id === 'business'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : item.target_plan_id === 'family'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/30';

                      const statusBadge = isRevoked ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Visszavonva
                        </span>
                      ) : isExhausted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Kimerült
                        </span>
                      ) : isExpired ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Lejárt
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Aktív
                        </span>
                      );

                      return (
                        <div
                          key={item.id}
                          className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-4 sm:p-5 hover:border-amber-500/40 transition-all shadow-sm space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Monospace code with click-to-copy */}
                              <button
                                onClick={() => handleCopyCode(item.code, item.id)}
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-amber-300 font-mono text-xs sm:text-sm font-bold hover:bg-slate-900 hover:border-amber-400 transition-all shadow-inner"
                                title="Kattints a kód másolásához"
                              >
                                <span>{item.code}</span>
                                {copiedCodeId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 shrink-0" />
                                )}
                              </button>

                              {/* Target plan */}
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 ${planBadgeColor}`}>
                                {item.target_plan_id === 'business' && <Crown className="w-3 h-3 text-amber-300" />}
                                {item.target_plan_id} csomag
                              </span>

                              {/* Duration badge */}
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                {item.duration_days ? `${item.duration_days} napos VIP` : 'Örökös (Perpetual)'}
                              </span>

                              {/* Status badge */}
                              {statusBadge}
                            </div>

                            {/* Actions: Copy and Revoke */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                onClick={() => handleCopyCode(item.code, item.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-xs font-semibold text-[var(--text-main,#E0E3E6)] border border-[var(--border-color,#56616D)] transition-colors"
                              >
                                {copiedCodeId === item.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Másolva!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-[var(--text-sub,#B5BDC6)]" />
                                    <span>Másolás</span>
                                  </>
                                )}
                              </button>

                              {!isRevoked && (
                                <button
                                  onClick={() => {
                                    setTargetCodeToRevoke(item);
                                    setRevokeMode('graceful');
                                    setRevokeReason('');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
                                  title="Kód visszavonása / letiltása"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Visszavonás</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Metadata row: Usage progress, Campaign, Expiration */}
                          <div className="pt-2 border-t border-[var(--border-color,#56616D)]/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            {/* Uses */}
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-[var(--text-sub,#B5BDC6)] mb-1">
                                <span>Felhasználva:</span>
                                <span className="font-bold text-[var(--text-main,#E0E3E6)]">
                                  {item.used_count} / {item.max_uses}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-[var(--surface-bg,#465362)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    isExhausted ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, (item.used_count / Math.max(1, item.max_uses)) * 100)}%`
                                  }}
                                />
                              </div>
                            </div>

                            {/* Campaign & Notes */}
                            <div className="truncate">
                              <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] block">Kampány / Megjegyzés:</span>
                              <span className="text-xs text-[var(--text-main,#E0E3E6)] font-medium truncate block">
                                {item.campaign_name || item.admin_notes || '—'}
                              </span>
                            </div>

                            {/* Expiry & Created */}
                            <div className="text-left sm:text-right">
                              <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] block">
                                {item.valid_until
                                  ? `Beváltható: ${new Date(item.valid_until).toLocaleDateString('hu-HU')}`
                                  : 'Nincs lejárati korlát'}
                              </span>
                              <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] font-mono block">
                                Készült: {new Date(item.created_at).toLocaleDateString('hu-HU')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ADD FAQ MODAL */}
      {showAddFaqModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveFaqSubmit} className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Új GYIK Kérdés Hozzáadása</h3>
            
            <input
              type="text"
              placeholder="Kérdés szövege..."
              value={faqQuestion}
              onChange={e => setFaqQuestion(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
            />

            <textarea
              rows={4}
              placeholder="Válasz részletes leírása..."
              value={faqAnswer}
              onChange={e => setFaqAnswer(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] resize-none"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddFaqModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] text-xs font-semibold border border-[var(--border-color,#56616D)] transition-colors"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-md shadow-blue-900/20"
              >
                Kérdés Mentése
              </button>
            </div>
          </form>
        </div>
      )}

      {/* USER SUSPEND MODAL */}
      {showSuspendConfirmModal && targetUserToSuspend && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">
              {targetUserToSuspend.currentStatus === 'suspended' ? 'Fiók Aktiválása' : 'Fiók Felfüggesztése'}
            </h3>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
              Biztosan megváltoztatod <strong className="text-[var(--text-main,#E0E3E6)]">{targetUserToSuspend.name}</strong> státuszát?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSuspendConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] text-xs font-semibold border border-[var(--border-color,#56616D)] transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
              >
                Megerősítés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER DELETE MODAL */}
      {showDeleteUserConfirmModal && targetUserToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg,#3A4551)] border border-rose-500/40 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Fiók Végleges Törlése
            </h3>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
              Biztosan törölni szeretnéd a(z) <strong className="text-[var(--text-main,#E0E3E6)]">{targetUserToDelete.email}</strong> fiókot? Ez a művelet visszavonhatatlan.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteUserConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] text-xs font-semibold border border-[var(--border-color,#56616D)] transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                Igen, Végleges Törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE VIP PROMO CODE MODAL */}
      {showCreatePromoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePromoCode}
            className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">Új VIP Kód Létrehozása</h3>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Generálj egyedi, biztonságos hozzáférési kódot</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePromoModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Code or Auto-generate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)] flex items-center justify-between">
                <span>Egyedi Kód (Opcionális)</span>
                <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] font-normal">Hagyd üresen automatikus generáláshoz</span>
              </label>
              <input
                type="text"
                placeholder="pl. THINGOR-VIP-2026 (üresen: automatikus)"
                value={newPromoCode}
                onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs font-mono uppercase text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Promo Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Kódtípus</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewPromoType('vip')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    newPromoType === 'vip'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                      : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border-[var(--border-color,#56616D)]'
                  }`}
                >
                  VIP Hozzáférés
                </button>
                <button
                  type="button"
                  onClick={() => setNewPromoType('promo')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    newPromoType === 'promo'
                      ? 'bg-blue-500/20 border-blue-400 text-blue-300 ring-1 ring-blue-400'
                      : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border-[var(--border-color,#56616D)]'
                  }`}
                >
                  Promóciós Kupon
                </button>
              </div>
            </div>

            {/* Target Plan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Célcsomag (Előfizetési szint)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'plus', name: 'Plus', desc: '1 000 tárgy, 500 MB', color: 'border-blue-500/40 text-blue-300' },
                  { id: 'family', name: 'Family', desc: '5 000 tárgy, 2 GB, 5 tag', color: 'border-emerald-500/40 text-emerald-300' },
                  { id: 'business', name: 'Business', desc: 'Korlátlan, 10 GB, Széf', color: 'border-amber-500/40 text-amber-300' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewPromoTargetPlan(p.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newPromoTargetPlan === p.id
                        ? 'bg-[var(--surface-bg,#465362)] border-amber-400 shadow-sm ring-1 ring-amber-400'
                        : 'bg-[var(--surface-bg,#465362)]/60 border-[var(--border-color,#56616D)] hover:border-slate-500'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">{p.name}</div>
                    <div className="text-[10px] text-[var(--text-sub,#B5BDC6)] mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* VIP Duration Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">VIP Időtartam</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: '7', label: '7 nap' },
                  { id: '30', label: '30 nap' },
                  { id: '90', label: '90 nap' },
                  { id: '180', label: '180 nap' },
                  { id: '365', label: '1 év' },
                  { id: 'perpetual', label: 'Örökös' },
                  { id: 'custom', label: 'Egyedi...' },
                ].map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setNewPromoDurationPreset(d.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      newPromoDurationPreset === d.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white border border-[var(--border-color,#56616D)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {newPromoDurationPreset === 'custom' && (
                <div className="pt-1.5">
                  <input
                    type="number"
                    min="1"
                    placeholder="Napok száma (pl. 45)"
                    value={newPromoDurationCustom}
                    onChange={e => setNewPromoDurationCustom(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            {/* Max uses & Valid Until */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Max. Beváltások Száma</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={newPromoMaxUses}
                  onChange={e => setNewPromoMaxUses(Math.max(1, Number(e.target.value)))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Beváltási Határidő (Opcionális)</label>
                <input
                  type="date"
                  value={newPromoValidUntil}
                  onChange={e => setNewPromoValidUntil(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Campaign Name & Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Kampány Neve (Opcionális)</label>
              <input
                type="text"
                placeholder="pl. 2026 Tavaszi Béta VIP Tesztelők"
                value={newPromoCampaign}
                onChange={e => setNewPromoCampaign(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Admin Megjegyzés (Belső használatra)</label>
              <textarea
                rows={2}
                placeholder="pl. Vezetőségi engedéllyel kiadva kiemelt partnernek..."
                value={newPromoNotes}
                onChange={e => setNewPromoNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color,#56616D)]">
              <button
                type="button"
                onClick={() => setShowCreatePromoModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] text-xs font-semibold border border-[var(--border-color,#56616D)] transition-colors"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={isCreatingPromo}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {isCreatingPromo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>VIP Kód Létrehozása</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVOKE PROMO CODE MODAL */}
      {targetCodeToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRevokePromoCode}
            className="bg-[var(--card-bg,#3A4551)] border border-rose-500/40 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-main,#E0E3E6)]">VIP Kód Visszavonása</h3>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Kód: <span className="font-mono text-amber-300 font-bold">{targetCodeToRevoke.code}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetCodeToRevoke(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Visszavonási Mód</label>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  revokeMode === 'graceful'
                    ? 'bg-[var(--surface-bg,#465362)] border-amber-400 ring-1 ring-amber-400'
                    : 'bg-[var(--surface-bg,#465362)]/60 border-[var(--border-color,#56616D)]'
                }`}>
                  <input
                    type="radio"
                    name="revokeMode"
                    value="graceful"
                    checked={revokeMode === 'graceful'}
                    onChange={() => setRevokeMode('graceful')}
                    className="mt-0.5 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)] block">Kíméletes (Graceful)</span>
                    <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] block mt-0.5">
                      Új felhasználó már nem válthatja be. Az aktív felhasználók megőrzik hozzáférésüket a lejárati idejükig (vagy max 30 napig).
                    </span>
                    {revokeMode === 'graceful' && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">Türelmi idő örökös jog esetén:</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={revokeGracePeriodDays}
                          onChange={e => setRevokeGracePeriodDays(Math.max(1, Number(e.target.value)))}
                          className="w-20 px-2 py-1 rounded-lg bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">nap</span>
                      </div>
                    )}
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  revokeMode === 'immediate'
                    ? 'bg-rose-500/10 border-rose-500 ring-1 ring-rose-500'
                    : 'bg-[var(--surface-bg,#465362)]/60 border-[var(--border-color,#56616D)]'
                }`}>
                  <input
                    type="radio"
                    name="revokeMode"
                    value="immediate"
                    checked={revokeMode === 'immediate'}
                    onChange={() => setRevokeMode('immediate')}
                    className="mt-0.5 text-rose-500 focus:ring-rose-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-rose-300 block">Azonnali (Immediate)</span>
                    <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] block mt-0.5">
                      Azonnal megszünteti az összes jelenleg aktív beváltást is erre a kódra.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">Visszavonás Indoka (Kötelező audit naplózáshoz)</label>
              <textarea
                rows={2}
                placeholder="pl. Nem hivatalos forrásból kikerült, leállított kampány..."
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-rose-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color,#56616D)]">
              <button
                type="button"
                onClick={() => setTargetCodeToRevoke(null)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] text-xs font-semibold border border-[var(--border-color,#56616D)] transition-colors"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={isRevokingPromo}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/30 disabled:opacity-50"
              >
                {isRevokingPromo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Kód Visszavonása</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
