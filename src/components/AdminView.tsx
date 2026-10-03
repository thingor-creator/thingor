import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  Users,
  Boxes,
  Database,
  Download,
  Trash2,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  FileText,
  Search,
  Lock,
  Mail,
  User as UserIcon,
  X
} from 'lucide-react';
import type { UserProfile } from '../types';

export const AdminView: React.FC = () => {
  const {
    user,
    isAdmin,
    setCurrentView,
    items,
    categories,
    locations,
    documents,
    language,
    signup
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'global'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load offline registered users + admin
  const getRegisteredUsers = (): UserProfile[] => {
    const savedRegs = localStorage.getItem('thingor_registered_users');
    const localRegs: Array<{ email: string; pass: string; name: string; id: string }> = savedRegs ? JSON.parse(savedRegs) : [];
    
    const userList: UserProfile[] = [
      {
        id: 'admin-1',
        user_id: 'admin-1',
        display_name: 'Admin (Thingor)',
        email: 'mythingor@gmail.com',
        is_admin: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      ...localRegs.map(u => ({
        id: u.id,
        user_id: u.id,
        display_name: u.name,
        email: u.email,
        is_admin: u.email.toLowerCase() === 'mythingor@gmail.com',
        created_at: new Date().toISOString(),
      }))
    ];

    // Deduplicate by email
    const uniqueMap = new Map<string, UserProfile>();
    userList.forEach(u => uniqueMap.set(u.email.toLowerCase(), u));
    return Array.from(uniqueMap.values());
  };

  const [usersList, setUsersList] = useState<UserProfile[]>(getRegisteredUsers);

  // Access check
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="p-4 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-400">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {language === 'hu' ? 'Hozzáférés Megtagadva' : 'Access Denied'}
        </h2>
        <p className="text-sm text-slate-400 max-w-md">
          {language === 'hu'
            ? 'Ez az oldal kizárólag az áruház/rendszer adminisztrátorai számára érhető el (mythingor@gmail.com).'
            : 'This page is restricted exclusively to system administrators (mythingor@gmail.com).'}
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

  const handleExportBackup = () => {
    const backupData = {
      export_date: new Date().toISOString(),
      items,
      categories,
      locations,
      documents,
      users: usersList,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `thingor_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setActionMsg({
      type: 'success',
      text: language === 'hu' ? 'Adatbázis mentés sikeresen letöltve (JSON)!' : 'Database backup JSON exported successfully!'
    });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    const res = await signup(newEmail, newPassword, newName || newEmail.split('@')[0]);
    if (res.success) {
      setUsersList(getRegisteredUsers());
      setShowAddUserModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setActionMsg({
        type: 'success',
        text: language === 'hu' ? `Új felhasználó sikeresen létrehozva: ${newEmail}` : `New user created successfully: ${newEmail}`
      });
    } else {
      setActionMsg({
        type: 'error',
        text: res.error || 'Hiba a regisztrációnál'
      });
    }
  };

  const handleDeleteUser = (userEmail: string) => {
    if (userEmail.toLowerCase() === 'mythingor@gmail.com') {
      setActionMsg({
        type: 'error',
        text: language === 'hu' ? 'Az elsődleges adminisztrátori fiók nem törölhető!' : 'Primary admin account cannot be deleted!'
      });
      return;
    }

    if (confirm(language === 'hu' ? `Biztosan törölni szeretnéd a(z) ${userEmail} felhasználót?` : `Are you sure you want to delete user ${userEmail}?`)) {
      const savedRegs = localStorage.getItem('thingor_registered_users');
      let registeredUsers: Array<{ email: string; pass: string; name: string; id: string }> = savedRegs ? JSON.parse(savedRegs) : [];
      registeredUsers = registeredUsers.filter(u => u.email.toLowerCase() !== userEmail.toLowerCase());
      localStorage.setItem('thingor_registered_users', JSON.stringify(registeredUsers));
      
      setUsersList(getRegisteredUsers());
      setActionMsg({
        type: 'success',
        text: language === 'hu' ? `Felhasználó törölve: ${userEmail}` : `User deleted: ${userEmail}`
      });
    }
  };

  const filteredUsers = usersList.filter(u =>
    u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInventoryValue = items.reduce((acc, curr) => acc + (curr.current_value || curr.purchase_price || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-800/40 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {language === 'hu' ? 'Adminisztrációs Vezérlőpult' : 'Admin Control Center'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              mythingor@gmail.com
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {language === 'hu'
              ? 'Rendszer felügyelet, regisztrált felhasználók kezelése és adatbázis karbantartás.'
              : 'System overview, user management, and database maintenance.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors shadow-md"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>{language === 'hu' ? 'Adatbázis Exportálása (JSON)' : 'Export Database JSON'}</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between animate-in fade-in ${
          actionMsg.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{language === 'hu' ? 'Regisztrált Felhasználók' : 'Registered Users'}</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {usersList.length}
          </div>
          <p className="text-[11px] text-slate-500">
            {language === 'hu' ? 'Aktív fiókok a rendszerben' : 'Active accounts logged'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{language === 'hu' ? 'Rendszer Összes Tárgy' : 'Total System Items'}</span>
            <Boxes className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {items.length}
          </div>
          <p className="text-[11px] text-slate-500">
            €{totalInventoryValue.toLocaleString('hu-HU')} {language === 'hu' ? 'becsült összérték' : 'total value'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{language === 'hu' ? 'Helyszínek & Kategóriák' : 'Locations & Categories'}</span>
            <Database className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {locations.length + categories.length}
          </div>
          <p className="text-[11px] text-slate-500">
            {locations.length} {language === 'hu' ? 'helyszín' : 'locations'}, {categories.length} {language === 'hu' ? 'kategória' : 'categories'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{language === 'hu' ? 'Dokumentum Raktár' : 'Document Vault'}</span>
            <FileText className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {documents.length}
          </div>
          <p className="text-[11px] text-slate-500">
            {language === 'hu' ? 'Garancialevelek & számlák' : 'Warranties & invoices'}
          </p>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{language === 'hu' ? 'Felhasználók Kezelése' : 'User Management'}</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'system'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>{language === 'hu' ? 'Rendszer & Karbantartás' : 'System & Diagnostics'}</span>
        </button>
      </div>

      {/* TAB 1: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder={language === 'hu' ? 'Keresés név vagy e-mail alapján...' : 'Search by name or email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <UserPlus className="h-4 w-4 stroke-[2.5]" />
              <span>{language === 'hu' ? 'Új Felhasználó Hozzáadása' : 'Add New User'}</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">{language === 'hu' ? 'Felhasználó' : 'User'}</th>
                    <th className="px-5 py-3.5">{language === 'hu' ? 'E-mail Cím' : 'Email Address'}</th>
                    <th className="px-5 py-3.5">{language === 'hu' ? 'Szerepkör' : 'Role'}</th>
                    <th className="px-5 py-3.5 text-right">{language === 'hu' ? 'Műveletek' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-semibold text-white flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700">
                          {u.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.display_name}</p>
                          <p className="text-[10px] text-slate-500">ID: {u.id}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300 font-medium">
                        {u.email}
                      </td>
                      <td className="px-5 py-4">
                        {u.is_admin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 font-bold text-[10px] border border-emerald-800/60">
                            <ShieldCheck className="h-3 w-3" />
                            Adminisztrátor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium text-[10px]">
                            Felhasználó
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!u.is_admin && (
                          <button
                            onClick={() => handleDeleteUser(u.email)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition-colors"
                            title={language === 'hu' ? 'Felhasználó törlése' : 'Delete user'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: System Diagnostics & Data Maintenance */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              <span>{language === 'hu' ? 'Adatbázis Állapot & Mentés' : 'Database Status & Backup'}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'hu'
                ? 'Exportáld a teljes tárgy- és helyszínleltárt egyetlen JSON biztonsági mentésbe, vagy töltsd le az adatbázist.'
                : 'Export complete inventory records into a single JSON backup file.'}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                <Download className="h-4 w-4 stroke-[2.5]" />
                <span>{language === 'hu' ? 'Teljes JSON Mentés Letöltése' : 'Download Complete JSON Backup'}</span>
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-400" />
              <span>{language === 'hu' ? 'Mintaadatok Visszaállítása' : 'Reset Default Sample Data'}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'hu'
                ? 'Ha újrabetöltenéd a gyári mintaadatokat (kategóriák, alapértelmezett tárolási helyszínek), itt visszaállíthatod.'
                : 'Reset demo categories and default storage locations.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  if (confirm(language === 'hu' ? 'Biztosan visszaállítod az alapértelmezett kategóriákat és helyszíneket?' : 'Reset default categories and locations?')) {
                    localStorage.removeItem('thingor_categories');
                    localStorage.removeItem('thingor_locations');
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-emerald-400" />
                <span>{language === 'hu' ? 'Alapértelmezett Adatok Visszaállítása' : 'Reset Default Data'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                <span>{language === 'hu' ? 'Új Felhasználó Hozzáadása' : 'Add New User'}</span>
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {language === 'hu' ? 'Név' : 'Name'}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {language === 'hu' ? 'E-mail Cím' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {language === 'hu' ? 'Jelszó' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  {language === 'hu' ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  {language === 'hu' ? 'Létrehozás' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
