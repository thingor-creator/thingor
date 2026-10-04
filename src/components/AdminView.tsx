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
} from 'lucide-react';
import type { UserStatus } from '../types';
import { isAdmin as checkIsAdmin } from '../lib/permissions';
import { isR2Configured, r2BucketName } from '../lib/r2';

export const AdminView: React.FC = () => {
  const {
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
    toggleUserSuspension,
    adminAuditLogs,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'audit'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings form local state
  const [siteName, setSiteName] = useState(siteSettings.site_name);
  const [heroTitle, setHeroTitle] = useState(siteSettings.hero_title);
  const [heroSubtitle, setHeroSubtitle] = useState(siteSettings.hero_subtitle || '');
  const [announcement, setAnnouncement] = useState(siteSettings.announcement || '');
  const [maintenanceMessage, setMaintenanceMessage] = useState(siteSettings.maintenance_message || '');

  useEffect(() => {
    if (isAdmin) {
      fetchUsersList();
    }
  }, [isAdmin]);

  useEffect(() => {
    setSiteName(siteSettings.site_name);
    setHeroTitle(siteSettings.hero_title);
    setHeroSubtitle(siteSettings.hero_subtitle || '');
    setAnnouncement(siteSettings.announcement || '');
    setMaintenanceMessage(siteSettings.maintenance_message || '');
  }, [siteSettings]);

  // Access check
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="p-4 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-400 shadow-xl">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {language === 'hu' ? 'Hozzáférés Megtagadva' : 'Access Denied'}
        </h2>
        <p className="text-sm text-slate-400 max-w-md">
          {language === 'hu'
            ? 'Ez az oldal kizárólag a platform adminisztrátorai számára érhető el.'
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateSiteSettings({
      site_name: siteName,
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      announcement: announcement || null,
      maintenance_message: maintenanceMessage,
    });
    if (res.success) {
      setActionMsg({ type: 'success', text: 'Beállítások sikeresen mentve.' });
      setTimeout(() => setActionMsg(null), 3000);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Hiba történt a mentés során.' });
    }
  };

  const handleToggleUserStatus = async (targetUserId: string, currentStatus?: UserStatus) => {
    const nextStatus: UserStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const success = await toggleUserSuspension(targetUserId, nextStatus);
    if (success) {
      setActionMsg({
        type: 'success',
        text: nextStatus === 'suspended' ? 'Felhasználó felfüggesztve.' : 'Felhasználó fiókja aktiválva.'
      });
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const filteredUsers = usersList.filter(u =>
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Platform Admin
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">
            {language === 'hu' ? 'Adminisztrációs Vezérlőpult' : 'Admin Control Panel'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Rendszerbeállítások, regisztráció kezelése, karbantartási mód és felhasználók felügyelete.
          </p>
        </div>

        <button
          onClick={() => fetchUsersList()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Adatok frissítése
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

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Rendszer Áttekintés', icon: Activity },
          { id: 'users', label: 'Felhasználók Kezelése', icon: Users },
          { id: 'settings', label: 'Platform Beállítások', icon: Sliders },
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
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/50 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Regisztrált User</span>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{usersList.length || 1}</p>
              <p className="text-[11px] text-slate-500">Összes felhasználó a rendszerben</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Tárgyak Száma</span>
                <Boxes className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{items.length}</p>
              <p className="text-[11px] text-slate-500">Nyilvántartott tárgy az adatbázisban</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Aktív Megosztások</span>
                <Share2 className="w-5 h-5 text-teal-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{itemShares.length}</p>
              <p className="text-[11px] text-slate-500">Aktív tárgymegosztási hivatkozás</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Dokumentumok</span>
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{documents.length}</p>
              <p className="text-[11px] text-slate-500">Feltöltött privát dokumentum</p>
            </div>
          </div>

          {/* Storage Provider Status Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                isR2Configured
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {isR2Configured ? 'R2' : 'SUP'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Fájltároló (Object Storage Provider): {isR2Configured ? 'Cloudflare R2 Storage' : 'Supabase Storage'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isR2Configured
                    ? `Aktív Cloudflare R2 bucket: "${r2BucketName}". Egress díjmentes tárolás.`
                    : 'A Supabase Storage aktív. Cloudflare R2 beállításához add meg a VITE_R2_* környezeti változókat.'}
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isR2Configured
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {isR2Configured ? 'Cloudflare R2 Aktív' : 'Supabase Storage Aktív'}
            </span>
          </div>

          {/* Quick Platform Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Registration Control */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Új Regisztrációk Kezelése</h3>
                  <p className="text-xs text-slate-400">
                    Felfüggesztheted az új fiókregisztrációkat a platformon.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  siteSettings.registration_enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {siteSettings.registration_enabled ? 'Engedélyezve' : 'Felfüggesztve'}
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => toggleRegistration(!siteSettings.registration_enabled)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    siteSettings.registration_enabled
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {siteSettings.registration_enabled ? 'Új Regisztrációk Felfüggesztése' : 'Regisztráció Engedélyezése'}
                </button>
              </div>
            </div>

            {/* Maintenance Mode Control */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Karbantartási Üzemmód</h3>
                  <p className="text-xs text-slate-400">
                    A látogatók és felhasználók számára karbantartási tájékoztató jelenik meg.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  siteSettings.maintenance_mode
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {siteSettings.maintenance_mode ? 'AKTÍV KARBANTARTÁS' : 'Kikapcsolva'}
                </span>
              </div>

              <div className="pt-2">
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Keresés felhasználók között..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Összesen {filteredUsers.length} felhasználó
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Felhasználó</th>
                    <th className="px-6 py-4">Szerepkör</th>
                    <th className="px-6 py-4">Státusz</th>
                    <th className="px-6 py-4 text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
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
                                <p className="font-bold text-white">{u.display_name}</p>
                                <p className="text-[11px] text-slate-400">{u.email}</p>
                              </div>
                            </div>
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
                            {!isUserAdmin && (
                              <button
                                onClick={() => handleToggleUserStatus(u.user_id || u.id, u.status)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors ${
                                  isUserSuspended
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {isUserSuspended ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" /> Aktiválás
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" /> Felfüggesztés
                                  </>
                                )}
                              </button>
                            )}
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

      {/* TAB 3: PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-4">
            Weboldal Megjelenési & Platform Beállítások
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
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Hero Főcím (Landing Page Title)
              </label>
              <input
                type="text"
                value={heroTitle}
                onChange={e => setHeroTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Hero Alcím (Subtitle)
            </label>
            <input
              type="text"
              value={heroSubtitle}
              onChange={e => setHeroSubtitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Közlemény Banner (Announcement text)
            </label>
            <input
              type="text"
              placeholder="Opcionális fejléc üzenet a weboldalon..."
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Karbantartási Üzenet (Maintenance Message)
            </label>
            <textarea
              rows={3}
              value={maintenanceMessage}
              onChange={e => setMaintenanceMessage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            Beállítások Mentése
          </button>
        </form>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Időpont</th>
                    <th className="px-6 py-4">Művelet</th>
                    <th className="px-6 py-4">Cél / Paraméter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {adminAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                        Nincsenek feljegyzett adminisztrátori műveletek.
                      </td>
                    </tr>
                  ) : (
                    adminAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleString()}
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
    </div>
  );
};
