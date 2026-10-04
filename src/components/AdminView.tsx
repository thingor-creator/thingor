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
  Upload,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  FileCheck,
  Palette,
  Globe,
  Mail,
  Lock,
  Calendar,
  Layers,
  HelpCircle,
  FolderTree,
  BookOpen,
  ArrowLeft,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Check,
  Wrench,
  Key,
  Users2,
  Shield,
  Megaphone,
} from 'lucide-react';
import type { UserStatus, LegalSlug, LegalDocumentVersion, LandingBlock, FAQItem, UserDetailStats } from '../types';
import { isAdmin as checkIsAdmin } from '../lib/permissions';
import { isR2Configured, r2BucketName } from '../lib/r2';
import { uploadFileToStorage } from '../lib/storage';

export const AdminView: React.FC = () => {
  const {
    user,
    isAdmin,
    setCurrentView,
    items,
    itemShares,
    documents,
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

  // User details modal state
  const [selectedUserStats, setSelectedUserStats] = useState<UserDetailStats | null>(null);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
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
  const [faviconUrl, setFaviconUrl] = useState(siteSettings.favicon_url || '/logo.png');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Registration paused form state
  const [regPausedTitle, setRegPausedTitle] = useState(siteSettings.registration_paused_title || 'A regisztráció jelenleg szünetel');
  const [regPausedMsg, setRegPausedMsg] = useState(siteSettings.registration_paused_message || 'A regisztráció átmenetileg fel van függesztve.');

  // Legal document editing state
  const [legalDocTitle, setLegalDocTitle] = useState('');
  const [legalDocContent, setLegalDocContent] = useState('');
  const [previewLegalDoc, setPreviewLegalDoc] = useState<LegalDocumentVersion | null>(null);

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
    setFaviconUrl(siteSettings.favicon_url || '/logo.png');
    setRegPausedTitle(siteSettings.registration_paused_title || 'A regisztráció jelenleg szünetel');
    setRegPausedMsg(siteSettings.registration_paused_message || 'A regisztráció átmenetileg fel van függesztve.');
  }, [siteSettings]);

  // Access check
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4 bg-[#141418] text-white py-16">
        <div className="p-4 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-400 shadow-xl">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {language === 'hu' ? 'Hozzáférés Megtagadva (ACCESS DENIED)' : 'Access Denied'}
        </h2>
        <p className="text-sm text-slate-400 max-w-md">
          {language === 'hu'
            ? 'Ez a felület kizárólag a platform igazolt adminisztrátorai számára érhető el. Az Ön fiókja nem rendelkezik adminisztrátori jogosultsággal.'
            : 'This page is restricted exclusively to system administrators.'}
        </p>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="mt-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
        >
          {language === 'hu' ? 'Vissza a Vezérlőpultra' : 'Return to Dashboard'}
        </button>
      </div>
    );
  }

  const handleOpenUserDetail = async (userId: string) => {
    setIsLoadingUserStats(true);
    const stats = await fetchUserDetailStats(userId);
    setSelectedUserStats(stats);
    setIsLoadingUserStats(false);
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
    setSuspendReason('');
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
    <div className="bg-[#18181c] min-h-screen text-slate-100 flex flex-col font-sans -mx-4 -mt-6 sm:-mx-6 sm:-mt-8">
      {/* TOP HEADER BAR */}
      <header className="h-16 border-b border-[#282832] bg-[#1d1d23] px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        {/* Left Logo / Admin Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-base tracking-tight">ADMIN</span>
              <span className="text-xs font-semibold text-slate-400">Panel</span>
            </div>
          </div>
        </div>

        {/* Center Universal Search Bar */}
        <div className="relative flex-1 max-w-xl mx-auto hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Keresés tárgyak, könyvek, felhasználók, beállítások..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#25252e] border border-[#363644] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Right User & Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{user?.email || 'admin@thingor.com'}</p>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Adminisztrátor
            </span>
          </div>

          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 rounded-xl bg-[#262630] border border-[#383848] text-slate-300 hover:text-white hover:bg-[#30303d] transition-colors"
            title="Vissza a főoldalra"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT */}
      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-[#191920] border-r border-[#262632] flex flex-col justify-between p-4 flex-shrink-0">
          <div className="space-y-6">
            {/* GROUP 1: ADMIN */}
            <div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-2">
                ADMIN
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>Áttekintés</span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'users'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Moderáció & Jogok</span>
                </button>
              </nav>
            </div>

            {/* GROUP 2: TARTALOM */}
            <div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-2">
                TARTALOM
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'content'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4 text-pink-400" />
                  <span>Kezdőlap & Blokkok</span>
                </button>

                <button
                  onClick={() => setActiveTab('faq')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'faq'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <span>GYIK & Kérdések</span>
                </button>

                <button
                  onClick={() => setActiveTab('legal')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'legal'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Jogi Dokumentumok</span>
                </button>
              </nav>
            </div>

            {/* GROUP 3: PLATFORM & BEÁLLÍTÁSOK */}
            <div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-2">
                PLATFORM & BEÁLLÍTÁSOK
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('registration')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'registration'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Regisztráció & Működés</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'settings'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>Rendszer Beállítások</span>
                </button>
              </nav>
            </div>

            {/* GROUP 4: BIZTONSÁG & LOGOK */}
            <div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-2">
                BIZTONSÁG & LOGOK
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'audit'
                      ? 'bg-[#292936] text-white border-l-4 border-indigo-500 shadow-sm'
                      : 'text-slate-400 hover:bg-[#22222c] hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Audit Napló</span>
                </button>
              </nav>
            </div>
          </div>

          {/* BOTTOM EXIT BUTTON */}
          <div className="pt-4 border-t border-[#262632]">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-[#22222c] hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vissza a főoldalra</span>
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 bg-[#141418] p-6 md:p-8 overflow-y-auto">
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
            <div className="space-y-8 animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">Áttekintés</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Üdvözöljük, <span className="text-white font-semibold">{user?.email}</span>! Itt látja a tartalmak összesítését.
                  </p>
                </div>

                <button
                  onClick={() => { fetchUsersList(); fetchLandingBlocks(); fetchFAQs(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs font-medium text-slate-200 hover:bg-[#2a2a36] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Frissítés</span>
                </button>
              </div>

              {/* 5 METRIC CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Metric 1 */}
                <div className="bg-[#1f1f28] border border-[#2b2b38] rounded-2xl p-5 flex flex-col justify-between hover:border-pink-500/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Tárgyak</span>
                    <Boxes className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-white">{items.length}</p>
                  </div>
                  <button onClick={() => setCurrentView('dashboard')} className="text-[11px] font-bold text-pink-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 2 */}
                <div className="bg-[#1f1f28] border border-[#2b2b38] rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Kategóriák</span>
                    <FolderTree className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-white">8</p>
                  </div>
                  <button onClick={() => setActiveTab('settings')} className="text-[11px] font-bold text-purple-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 3 */}
                <div className="bg-[#1f1f28] border border-[#2b2b38] rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Megosztások</span>
                    <Share2 className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-white">{itemShares.length || 494}</p>
                  </div>
                  <button onClick={() => setActiveTab('overview')} className="text-[11px] font-bold text-indigo-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 4 */}
                <div className="bg-[#1f1f28] border border-[#2b2b38] rounded-2xl p-5 flex flex-col justify-between hover:border-teal-500/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Jogi Dokumentumok</span>
                    <BookOpen className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-white">{legalDocumentVersions.length || 4}</p>
                  </div>
                  <button onClick={() => setActiveTab('legal')} className="text-[11px] font-bold text-teal-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>

                {/* Metric 5 */}
                <div className="bg-[#1f1f28] border border-[#2b2b38] rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Felhasználók</span>
                    <Users className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="my-3">
                    <p className="text-3xl font-black text-white">{usersList.length || 8}</p>
                  </div>
                  <button onClick={() => setActiveTab('users')} className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 hover:underline">
                    Megnyitás →
                  </button>
                </div>
              </div>

              {/* TWO LARGE BOTTOM CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT BOX: Moderációs Várólista & Rendszerállapot */}
                <div className="lg:col-span-7 bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#292936] pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-white">Moderációs Várólista & Rendszerállapot</h3>
                      <p className="text-xs text-slate-400">Jóváhagyásra váró tartalmak & beállítások</p>
                    </div>
                    <button onClick={() => setActiveTab('users')} className="text-xs font-bold text-pink-400 hover:underline">
                      Várólista megnyitása →
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-[#23232e] border border-[#303040] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">Regisztráció Állapota</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {siteSettings.registration_enabled ? 'Új felhasználók regisztrációja nyitva' : 'Regisztráció jelenleg szüneteltetve'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        siteSettings.registration_enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {siteSettings.registration_enabled ? 'Nyitva' : 'Szünetel'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#23232e] border border-[#303040] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">Cloudflare R2 Tárhely Engine</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isR2Configured ? 'Médiafájlok közvetlenül R2 tárolóba töltődnek' : 'Helyi / Supabase tároló'}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        {isR2Configured ? 'R2 Aktív' : 'Supabase'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#23232e] border border-[#303040] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">Karbantartási Üzemmód</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
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
                <div className="lg:col-span-5 bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Gyors Platform Műveletek</h3>
                    <p className="text-xs text-slate-400">Modulok közvetlen elérése</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('content')}
                      className="p-4 rounded-xl bg-[#23232e] border border-[#303040] hover:border-pink-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider block mb-1">ÚTMUTATÓK</span>
                      <h4 className="text-xs font-bold text-white group-hover:text-pink-300">Landing & Blokkok</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('users')}
                      className="p-4 rounded-xl bg-[#23232e] border border-[#303040] hover:border-indigo-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block mb-1">RBAC</span>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300">Jogosultságok</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('faq')}
                      className="p-4 rounded-xl bg-[#23232e] border border-[#303040] hover:border-purple-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider block mb-1">GYIK</span>
                      <h4 className="text-xs font-bold text-white group-hover:text-purple-300">Gyakori Kérdések</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('legal')}
                      className="p-4 rounded-xl bg-[#23232e] border border-[#303040] hover:border-teal-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider block mb-1">JOGI</span>
                      <h4 className="text-xs font-bold text-white group-hover:text-teal-300">Verziózás & ÁSZF</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('settings')}
                      className="p-4 rounded-xl bg-[#23232e] border border-[#303040] hover:border-emerald-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">BEÁLLÍTÁSOK</span>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300">Platform Testreszabás</h4>
                    </button>

                    <button
                      onClick={() => setActiveTab('audit')}
                      className="p-4 rounded-xl bg-[#23232e] border border-[#303040] hover:border-cyan-500/40 text-left transition-all group"
                    >
                      <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider block mb-1">BIZTONSÁG</span>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">Audit Napló</h4>
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
                  <h2 className="text-xl font-extrabold text-white">Felhasználók & Jogosultságok</h2>
                  <p className="text-xs text-slate-400">Regisztrált fiókok, státuszok és moderációs műveletek.</p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Keresés név, email vagy User ID alapján..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#242430] text-slate-400 font-bold uppercase tracking-wider border-b border-[#2d2d3a]">
                      <tr>
                        <th className="px-6 py-4">Felhasználó</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Regisztráció</th>
                        <th className="px-6 py-4">Szerepkör</th>
                        <th className="px-6 py-4">Státusz</th>
                        <th className="px-6 py-4 text-right">Műveletek</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#282834]">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                            Nem található a keresésnek megfelelő felhasználó.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => {
                          const isUserAdmin = checkIsAdmin(u);
                          const isUserSuspended = u.status === 'suspended';
                          return (
                            <tr key={u.id || u.user_id} className="hover:bg-[#23232e] transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-[#292936] flex items-center justify-center font-bold text-indigo-400 border border-[#353546]">
                                    {u.display_name?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white cursor-pointer hover:text-indigo-400" onClick={() => handleOpenUserDetail(u.user_id || u.id)}>
                                      {u.display_name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">{u.user_id || u.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-300 font-medium">{u.email}</td>
                              <td className="px-6 py-4 text-slate-400 font-mono">
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
                                    className="p-1.5 rounded-lg bg-[#282834] hover:bg-[#323242] text-slate-300 hover:text-white"
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
                <h2 className="text-xl font-extrabold text-white">Kezdőlap & Blokkok Kezelése</h2>
                <p className="text-xs text-slate-400">Testreszabható vizuális és szöveges elemek a publikus főoldalon.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {landingBlocks.map(block => (
                  <div key={block.id} className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">{block.section_key}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        block.is_enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {block.is_enabled ? 'Megjelenítve' : 'Rejtve'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Cím</label>
                        <input
                          type="text"
                          defaultValue={block.title}
                          onBlur={e => saveLandingBlock({ ...block, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Alcím / Leírás</label>
                        <textarea
                          rows={2}
                          defaultValue={block.description || ''}
                          onBlur={e => saveLandingBlock({ ...block, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
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
                  <h2 className="text-xl font-extrabold text-white">Gyakori Kérdések (GYIK)</h2>
                  <p className="text-xs text-slate-400">Publikus válaszok és tájékoztatók a kezdőlapon.</p>
                </div>

                <button
                  onClick={() => setShowAddFaqModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-900/30"
                >
                  <Plus className="w-4 h-4" /> Új Kérdés Hozzáadása
                </button>
              </div>

              <div className="space-y-4">
                {faqsList.map(faq => (
                  <div key={faq.id} className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        {faq.question}
                      </h4>
                      <p className="text-xs text-slate-300 pl-6 leading-relaxed">{faq.answer}</p>
                    </div>

                    <button
                      onClick={() => deleteFAQ(faq.id)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800/40"
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
                  <h2 className="text-xl font-extrabold text-white">Jogi Dokumentumok Verziózása</h2>
                  <p className="text-xs text-slate-400">Adatvédelmi Tájékoztató, ÁSZF, Süti Tájékoztató és Impresszum élesítése.</p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['privacy', 'terms', 'cookies', 'imprint'] as LegalSlug[]).map(slug => (
                    <button
                      key={slug}
                      onClick={() => { setActiveLegalSlug(slug); fetchLegalDocumentVersions(slug); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                        activeLegalSlug === slug
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-[#22222b] text-slate-400 hover:bg-[#2a2a36]'
                      }`}
                    >
                      {slug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Új Verzió Létrehozása & Publikálása ({activeLegalSlug.toUpperCase()})</h3>
                
                <input
                  type="text"
                  placeholder="Verzió Címe (pl. Adatvédelmi Tájékoztató v2.0)"
                  value={legalDocTitle}
                  onChange={e => setLegalDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-teal-500"
                />

                <textarea
                  rows={8}
                  placeholder="Illeszd be a jogi dokumentum teljes szövegét..."
                  value={legalDocContent}
                  onChange={e => setLegalDocContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-teal-500 font-mono leading-relaxed"
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleSaveLegalDoc(false)}
                    className="px-4 py-2 rounded-xl bg-[#292936] hover:bg-[#343444] text-slate-300 text-xs font-semibold"
                  >
                    Mentés Piszkozatként
                  </button>
                  <button
                    onClick={() => handleSaveLegalDoc(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-900/30"
                  >
                    Verzió Publikálása Élesbe
                  </button>
                </div>
              </div>

              {/* Version History Table */}
              <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verziótörténet</h4>
                <div className="divide-y divide-[#292936]">
                  {currentLegalVersions.map(ver => (
                    <div key={ver.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{ver.title}</span>
                        <span className="text-slate-500 ml-2 font-mono">v{ver.version}</span>
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

          {/* TAB 6: REGISTRATION & MAINTENANCE */}
          {activeTab === 'registration' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-extrabold text-white">Új Regisztrációk Felfüggesztése</h3>
                <p className="text-xs text-slate-400">Ki- vagy bekapcsolhatod a regisztrációt a platformon.</p>

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

              <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-extrabold text-white">Karbantartási Üzemmód</h3>
                <p className="text-xs text-slate-400">Az egész weboldalt karbantartási módba állíthatod.</p>

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
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSavePlatformSettings} className="space-y-6 animate-fade-in max-w-3xl">
              <div>
                <h2 className="text-xl font-extrabold text-white">Rendszer Beállítások</h2>
                <p className="text-xs text-slate-400">Platform név, színek, email címek és kapcsolattartás.</p>
              </div>

              <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Oldal Neve (Site Name)</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hero Címsor (Hero Title)</label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={e => setHeroTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Kapcsolattartó Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Support Email</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={e => setSupportEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30"
                >
                  Beállítások Mentése
                </button>
              </div>
            </form>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-white">Admin Audit Napló</h2>
                <p className="text-xs text-slate-400">Rendszer-adminisztrátori műveletek időrendi naplója.</p>
              </div>

              <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl overflow-hidden">
                <div className="divide-y divide-[#282834]">
                  {adminAuditLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">Még nincs rögzített audit napló bejegyzés.</div>
                  ) : (
                    adminAuditLogs.map(log => (
                      <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white uppercase tracking-wider text-[11px] text-cyan-400">{log.action_type}</span>
                          <p className="text-slate-300">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleSaveFaqSubmit} className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-base font-extrabold text-white">Új GYIK Kérdés Hozzáadása</h3>
            
            <input
              type="text"
              placeholder="Kérdés szövege..."
              value={faqQuestion}
              onChange={e => setFaqQuestion(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-indigo-500"
            />

            <textarea
              rows={4}
              placeholder="Válasz részletes leírása..."
              value={faqAnswer}
              onChange={e => setFaqAnswer(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-[#22222b] border border-[#323240] text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddFaqModal(false)}
                className="px-4 py-2 rounded-xl bg-[#282834] text-slate-300 text-xs font-semibold"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Kérdés Mentése
              </button>
            </div>
          </form>
        </div>
      )}

      {/* USER SUSPEND MODAL */}
      {showSuspendConfirmModal && targetUserToSuspend && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1c1c24] border border-[#2b2b38] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-extrabold text-white">
              {targetUserToSuspend.currentStatus === 'suspended' ? 'Fiók Aktiválása' : 'Fiók Felfüggesztése'}
            </h3>
            <p className="text-xs text-slate-400">
              Biztosan megváltoztatod <strong className="text-white">{targetUserToSuspend.name}</strong> státuszát?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSuspendConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[#282834] text-slate-300 text-xs font-semibold"
              >
                Mégse
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
              >
                Megerősítés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER DELETE MODAL */}
      {showDeleteUserConfirmModal && targetUserToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1c1c24] border border-rose-900/50 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-extrabold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Fiók Végleges Törlése
            </h3>
            <p className="text-xs text-slate-300">
              Biztosan törölni szeretnéd a(z) <strong className="text-white">{targetUserToDelete.email}</strong> fiókot? Ez a művelet visszavonhatatlan.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteUserConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[#282834] text-slate-300 text-xs font-semibold"
              >
                Mégse
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
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
