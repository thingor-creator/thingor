import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
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
} from 'lucide-react';
import type { UserStatus, LegalSlug, UserDetailStats } from '../types';
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
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'registration' | 'content' | 'legal' | 'settings' | 'audit' | 'faq'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User details modal state
  const [selectedUserStats, setSelectedUserStats] = useState<UserDetailStats | null>(null);
  const [showSuspendConfirmModal, setShowSuspendConfirmModal] = useState(false);
  const [targetUserToSuspend, setTargetUserToSuspend] = useState<{ id: string; name: string; currentStatus: UserStatus } | null>(null);
  const [showDeleteUserConfirmModal, setShowDeleteUserConfirmModal] = useState(false);
  const [targetUserToDelete, setTargetUserToDelete] = useState<{ id: string; email: string } | null>(null);

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
          const updateRes = await updateSiteSettings({ logo_url: url });
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
                onClick={() => { setIsMobileMenuOpen(false); setCurrentView('dashboard'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Vissza a főoldalra</span>
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
              onClick={() => setCurrentView('dashboard')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)] hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vissza a főoldalra</span>
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
                          <img src={faviconUrl || '/favicon.png'} alt="Favicon Preview" className="w-4 h-4 object-contain rounded shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-300 truncate">Thingor – A tárgyaid...</span>
                        </div>

                        {/* Mobile App icon simulation */}
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 shrink-0">
                          <img src={faviconUrl || '/favicon.png'} alt="PWA Icon Preview" className="w-8 h-8 object-cover rounded-xl shadow-md" />
                          <span className="text-[10px] font-extrabold text-white">Thingor App</span>
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
    </div>
  );
};
