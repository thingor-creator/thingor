import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
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
  HelpCircle as FaqIcon,
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

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'registration' | 'content' | 'legal' | 'settings' | 'audit'>('overview');
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
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
    <div className="space-y-8 animate-fade-in pb-16">

      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Platform Admin Control Center
            </span>
            <span className="text-xs text-slate-400 font-mono">v2.4.0</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">
            {language === 'hu' ? 'Thingor Rendszer-adminisztráció' : 'Admin Control Panel'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Központi vezérlőpult a felhasználók, hozzáférések, publikus tartalmak, jogi dokumentumok és beállítások kezeléséhez.
          </p>
        </div>

        <button
          onClick={() => { fetchUsersList(); fetchLandingBlocks(); fetchFAQs(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Adatok Frissítése
        </button>
      </div>

      {/* Action Notification Message */}
      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between animate-fade-in ${
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

      {/* Main Admin Tabbed Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Dashboard Áttekintés', icon: Activity },
          { id: 'users', label: 'Felhasználók Kezelése', icon: Users },
          { id: 'registration', label: 'Regisztráció & Karbantartás', icon: Lock },
          { id: 'content', label: 'Tartalom & Landing Builder', icon: Layers },
          { id: 'legal', label: 'Jogi Dokumentumok & Verziózás', icon: FileCheck },
          { id: 'settings', label: 'Megjelenés & Platform', icon: Sliders },
          { id: 'audit', label: 'Admin Audit Napló', icon: FileText },
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                active
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/60 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & DASHBOARD KPIS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Regisztrált Felhasználók</span>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">{usersList.length || 1}</p>
              <p className="text-[11px] text-slate-500">
                {usersList.filter(u => u.status === 'suspended').length} felfüggesztve • {usersList.filter(u => u.role === 'admin').length} admin
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Nyilvántartott Tárgyak</span>
                <Boxes className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">{items.length}</p>
              <p className="text-[11px] text-slate-500">Tárgy a PostgreSQL adatbázisban</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Aktív Megosztások</span>
                <Share2 className="w-5 h-5 text-teal-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">{itemShares.length}</p>
              <p className="text-[11px] text-slate-500">Vendég megosztási hivatkozás</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Csatolt Dokumentumok</span>
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">{documents.length}</p>
              <p className="text-[11px] text-slate-500">Számla, garancia és útmutató fájl</p>
            </div>
          </div>

          {/* System Health Statuses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regisztráció</span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  {siteSettings.registration_enabled ? 'NYITVA (OPEN)' : 'SZÜNETEL (PAUSED)'}
                </h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                siteSettings.registration_enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {siteSettings.registration_enabled ? 'Aktív' : 'Szünetel'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fájltároló Engine</span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  {isR2Configured ? 'Cloudflare R2' : 'Supabase Storage'}
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {isR2Configured ? 'R2 Aktív' : 'Supabase'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karbantartási Mód</span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  {siteSettings.maintenance_mode ? 'AKTÍV KARBANTARTÁS' : 'Normál Üzemmód'}
                </h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                siteSettings.maintenance_mode
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {siteSettings.maintenance_mode ? 'Karbantartás' : 'Online'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Keresés név, email vagy User ID alapján..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Megjelenítve {filteredUsers.length} / {usersList.length} felhasználó
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Felhasználó</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Regisztráció</th>
                    <th className="px-6 py-4">Szerepkör</th>
                    <th className="px-6 py-4">Státusz</th>
                    <th className="px-6 py-4 text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
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
                        <tr key={u.id || u.user_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-emerald-400 border border-slate-700">
                                {u.display_name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-white cursor-pointer hover:text-emerald-400" onClick={() => handleOpenUserDetail(u.user_id || u.id)}>
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
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
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

      {/* TAB 3: REGISTRATION & MAINTENANCE CONTROL */}
      {activeTab === 'registration' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Registration Toggle & Custom Message */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Új Regisztrációk Kezelése</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Engedélyezheted vagy szüneteltetheted az új regisztrációkat.
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                siteSettings.registration_enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {siteSettings.registration_enabled ? 'NYITVA' : 'SZÜNETEL'}
              </span>
            </div>

            <button
              onClick={() => toggleRegistration(!siteSettings.registration_enabled)}
              className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                siteSettings.registration_enabled
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {siteSettings.registration_enabled ? 'Új Regisztrációk Felfüggesztése (PAUSE)' : 'Regisztráció Megnyitása (OPEN)'}
            </button>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Szüneteltetési Tájékoztató Üzenet</h4>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cím</label>
                <input
                  type="text"
                  value={regPausedTitle}
                  onChange={e => setRegPausedTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Üzenet leírása</label>
                <textarea
                  rows={3}
                  value={regPausedMsg}
                  onChange={e => setRegPausedMsg(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <button
                onClick={handleSavePlatformSettings}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Üzenet Mentése
              </button>
            </div>
          </div>

          {/* Maintenance Mode Control */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Karbantartási Üzemmód (Maintenance Mode)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bekapcsolásakor a látogatók karbantartási üzenetet látnak. Az Adminisztrátorok továbbra is hozzáférnek.
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                siteSettings.maintenance_mode
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {siteSettings.maintenance_mode ? 'AKTÍV KARBANTARTÁS' : 'Kikapcsolva'}
              </span>
            </div>

            <button
              onClick={() => toggleMaintenance(!siteSettings.maintenance_mode)}
              className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                siteSettings.maintenance_mode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {siteSettings.maintenance_mode ? 'Karbantartási Mód Kikapcsolása' : 'Karbantartási Mód Aktiválása'}
            </button>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Karbantartási Tájékoztató Szöveg</h4>
              <textarea
                rows={4}
                value={maintenanceMessage}
                onChange={e => setMaintenanceMessage(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <button
                onClick={handleSavePlatformSettings}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Karbantartási Szöveg Mentése
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONTENT & LANDING BUILDER */}
      {activeTab === 'content' && (
        <div className="space-y-8">
          {/* Landing Page Section Blocks */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <h3 className="text-lg font-bold text-white">Landing Page Tartalmi Szekciók</h3>
            <div className="space-y-4">
              {landingBlocks.map(blk => (
                <div key={blk.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{blk.section_key} Szekció</span>
                    <button
                      onClick={() => saveLandingBlock({ ...blk, is_enabled: !blk.is_enabled })}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        blk.is_enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {blk.is_enabled ? 'Látható' : 'Rejtett'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Cím</label>
                      <input
                        type="text"
                        value={blk.title}
                        onChange={e => setLandingBlocks(prev => prev.map(b => b.id === blk.id ? { ...b, title: e.target.value } : b))}
                        className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Alcím</label>
                      <input
                        type="text"
                        value={blk.subtitle || ''}
                        onChange={e => setLandingBlocks(prev => prev.map(b => b.id === blk.id ? { ...b, subtitle: e.target.value } : b))}
                        className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Leírás</label>
                    <textarea
                      rows={2}
                      value={blk.description || ''}
                      onChange={e => setLandingBlocks(prev => prev.map(b => b.id === blk.id ? { ...b, description: e.target.value } : b))}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <button
                    onClick={() => saveLandingBlock(blk)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Szekció Frissítése
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ List Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FaqIcon className="w-5 h-5 text-emerald-400" /> Gyakori Kérdések (FAQ) Kezelése
              </h3>
              <button
                onClick={() => setShowAddFaqModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Új Kérdés Hozzáadása
              </button>
            </div>

            <div className="space-y-3">
              {faqsList.map(faq => (
                <div key={faq.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">{faq.question}</h4>
                    <p className="text-xs text-slate-400 mt-1">{faq.answer}</p>
                  </div>
                  <button
                    onClick={() => deleteFAQ(faq.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LEGAL DOCUMENTS & VERSIONING */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          {/* Sub-tabs for Legal Documents */}
          <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
            {[
              { slug: 'privacy', label: 'Adatvédelem (Privacy Policy)' },
              { slug: 'terms', label: 'Felhasználási Feltételek (Terms)' },
              { slug: 'cookies', label: 'Cookie Tájékoztató' },
              { slug: 'imprint', label: 'Impresszum' },
            ].map(doc => (
              <button
                key={doc.slug}
                onClick={() => setActiveLegalSlug(doc.slug as LegalSlug)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeLegalSlug === doc.slug
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {doc.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Version Editor (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white">Új Jogi Verzió Létrehozása</h3>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Verzió Címe</label>
                <input
                  type="text"
                  placeholder={`pl. ${activeLegalSlug.toUpperCase()} Hivatalos Verzió (v2.0)`}
                  value={legalDocTitle}
                  onChange={e => setLegalDocTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Jogi Dokumentum Szövege</label>
                <textarea
                  rows={10}
                  placeholder="Másold be a jogi dokumentum tartalmát..."
                  value={legalDocContent}
                  onChange={e => setLegalDocContent(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSaveLegalDoc(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                >
                  Mentés Piszkozatként (Save Draft)
                </button>
                <button
                  onClick={() => handleSaveLegalDoc(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  Publikálás Élesbe (Publish Version)
                </button>
              </div>
            </div>

            {/* Version History Table (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white">Verzió Történet</h3>
              <div className="space-y-3">
                {currentLegalVersions.map(ver => (
                  <div key={ver.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">v{ver.version}.0 - {ver.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ver.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {ver.status === 'published' ? 'Élesben (Published)' : 'Piszkozat (Draft)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{ver.content}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>{new Date(ver.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => setPreviewLegalDoc(ver)}
                        className="text-emerald-400 hover:underline font-semibold"
                      >
                        Előnézet Megtekintése
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PLATFORM & APPEARANCE SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSavePlatformSettings} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-400" /> Platform Megjelenés & Alapbeállítások
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Oldal Neve (Site Name)
              </label>
              <input
                type="text"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Kiemelt Szín (Primary Color)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Kapcsolat Email (Contact Email)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Támogatás Email (Support Email)
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Weboldal Logó URL (Cloudflare R2 Támogatással)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer">
                {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-emerald-400" />}
                <span>Kép Feltöltés</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user?.id) return;
                    setIsUploadingLogo(true);
                    const res = await uploadFileToStorage(file, 'photos', user.id);
                    setIsUploadingLogo(false);
                    if (res.signedUrl || res.path) setLogoUrl(res.signedUrl || res.path || '');
                  }}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            Minden Beállítás Mentése
          </button>
        </form>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Időpont</th>
                    <th className="px-6 py-4">Admin Email</th>
                    <th className="px-6 py-4">Művelet</th>
                    <th className="px-6 py-4">Cél / Paraméter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {adminAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        Nincsenek feljegyzett adminisztrátori műveletek.
                      </td>
                    </tr>
                  ) : (
                    adminAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {log.admin_email || user?.email}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">
                          {log.target || JSON.stringify(log.details || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUserStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-6 space-y-6">
            <button
              onClick={() => setSelectedUserStats(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-lg">
                {selectedUserStats.display_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedUserStats.display_name}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedUserStats.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Tárgyak száma</span>
                <p className="text-lg font-bold text-white">{selectedUserStats.item_count}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Helyszínek</span>
                <p className="text-lg font-bold text-white">{selectedUserStats.location_count}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Dokumentumok</span>
                <p className="text-lg font-bold text-white">{selectedUserStats.document_count}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Összérték</span>
                <p className="text-lg font-bold text-emerald-400">€{selectedUserStats.total_value.toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedUserStats(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND CONFIRMATION MODAL */}
      {showSuspendConfirmModal && targetUserToSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 text-slate-100">
            <h3 className="text-lg font-bold text-white">
              {targetUserToSuspend.currentStatus === 'suspended' ? 'Fiók Újra-aktiválása' : 'Felhasználó Felfüggesztése'}
            </h3>
            <p className="text-xs text-slate-400">
              Biztosan {targetUserToSuspend.currentStatus === 'suspended' ? 'aktiválni' : 'felfüggeszteni'} szeretnéd a(z) <strong className="text-white">{targetUserToSuspend.name}</strong> felhasználót?
            </p>

            {targetUserToSuspend.currentStatus !== 'suspended' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Felfüggesztés indoklása (Opcionális)</label>
                <input
                  type="text"
                  placeholder="pl. Szabályzat megsértése..."
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSuspendConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Mégse
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Megerősítés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {showDeleteUserConfirmModal && targetUserToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-900 bg-slate-900 p-6 space-y-4 text-slate-100">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold">Felhasználói Fiók Végleges Törlése</h3>
            </div>
            <p className="text-xs text-slate-300">
              Biztosan véglegesen törölni szeretnéd a(z) <strong className="text-white">{targetUserToDelete.email}</strong> fiókot és annak minden tárgyát, dokumentumát, helyszínét? Ez a művelet nem vonható vissza!
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteUserConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Mégse
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Végleges Törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ ADD MODAL */}
      {showAddFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveFaqSubmit} className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 text-slate-100">
            <h3 className="text-lg font-bold text-white">Új FAQ Kérdés Hozzáadása</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kérdés</label>
              <input
                type="text"
                required
                value={faqQuestion}
                onChange={e => setFaqQuestion(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Válasz</label>
              <textarea
                rows={4}
                required
                value={faqAnswer}
                onChange={e => setFaqAnswer(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddFaqModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Mentés
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PREVIEW LEGAL DOCUMENT MODAL */}
      {previewLegalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 text-slate-100 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setPreviewLegalDoc(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-white">{previewLegalDoc.title}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 border-b border-slate-800 pb-3">
              <span>Verzió: v{previewLegalDoc.version}.0</span>
              <span>•</span>
              <span>Státusz: {previewLegalDoc.status}</span>
            </div>
            <div className="overflow-y-auto flex-1 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
              {previewLegalDoc.content}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewLegalDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
