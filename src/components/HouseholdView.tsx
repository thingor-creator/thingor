import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserPlus, Shield, Crown, Eye, Trash2, Mail, CheckCircle, Package, LogOut } from 'lucide-react';
import type { HouseholdRole } from '../types';

export const HouseholdView: React.FC = () => {
  const {
    household,
    householdMembers,
    householdInvites,
    createHousehold,
    inviteHouseholdMember,
    removeHouseholdMember,
    updateMemberRole,
    leaveHousehold,
    items,
    user,
    setSelectedItemId,
    language
  } = useApp();

  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<HouseholdRole>('member');
  const [inviteMessage, setInviteMessage] = useState<{ text: string; success: boolean } | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    await createHousehold(newHouseholdName.trim());
    setNewHouseholdName('');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteMessage(null);
    const res = await inviteHouseholdMember(inviteEmail.trim(), inviteRole);

    if (res.success) {
      setInviteMessage({
        text: language === 'hu' ? `Meghívó elküldve a következő címre: ${inviteEmail}` : `Invite sent to ${inviteEmail}`,
        success: true
      });
      setInviteEmail('');
    } else {
      setInviteMessage({
        text: res.error || (language === 'hu' ? 'Hiba a meghívó küldésekor' : 'Error sending invite'),
        success: false
      });
    }
  };

  const getRoleBadge = (role: HouseholdRole) => {
    switch (role) {
      case 'owner':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-600" /> {language === 'hu' ? 'Családfő (Tulajdonos)' : 'Owner'}</span>;
      case 'admin':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-indigo-600" /> {language === 'hu' ? 'Adminisztrátor' : 'Admin'}</span>;
      case 'member':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-600" /> {language === 'hu' ? 'Családtag' : 'Member'}</span>;
      case 'viewer':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-slate-500" /> {language === 'hu' ? 'Megtekintő' : 'Viewer'}</span>;
    }
  };

  // Shared household items
  const sharedItems = items.filter(i => i.ownership_scope === 'household');
  const sharedTotalValue = sharedItems.reduce((sum, i) => sum + (i.current_value || i.purchase_price || 0), 0);

  const currentUserMember = householdMembers.find(m => m.user_id === user?.id || m.user_email === user?.email);
  const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  if (!household) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">
            {language === 'hu' ? 'Családi / Háztartási Hozzáférés' : 'Family / Household Access'}
          </h1>
          <p className="text-slate-600 text-sm max-w-lg mx-auto">
            {language === 'hu'
              ? 'Hozz létre egy közös háztartást, hívd meg családtagjaidat és kezeljétek közösen az otthoni vagyontárgyakat pontos jogosultságokkal.'
              : 'Create a shared household, invite family members, and manage home assets together with granular RBAC permissions.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {language === 'hu' ? 'Új Háztartás Létrehozása' : 'Create New Household'}
          </h2>
          <form onSubmit={handleCreateHousehold} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === 'hu' ? 'Háztartás / Család neve *' : 'Household Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'hu' ? 'Pl. Kovács Család Háztartása' : 'e.g. Smith Household'}
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition shadow-sm"
            >
              {language === 'hu' ? 'Háztartás Létrehozása' : 'Create Household'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-7 h-7 text-emerald-600" />
              {household.name}
            </h1>
            {getRoleBadge(currentUserMember?.role || 'member')}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {language === 'hu'
              ? 'Közös háztartás leltárja, tagok és jogosultságok kezelése.'
              : 'Shared household inventory, member roles, and permission settings.'}
          </p>
        </div>

        <button
          onClick={leaveHousehold}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl transition text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          {language === 'hu' ? 'Kilépés a háztartásból' : 'Leave Household'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{language === 'hu' ? 'Családtagok' : 'Members'}</p>
            <p className="text-2xl font-bold text-slate-800">{householdMembers.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{language === 'hu' ? 'Közös Tárgyak' : 'Shared Items'}</p>
            <p className="text-2xl font-bold text-slate-800">{sharedItems.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{language === 'hu' ? 'Közös Vagyoni Érték' : 'Total Shared Value'}</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(sharedTotalValue)}</p>
          </div>
        </div>
      </div>

      {/* Invite Section (Owners / Admins only) */}
      {isOwnerOrAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            {language === 'hu' ? 'Új Családtag Meghívása' : 'Invite Family Member'}
          </h2>

          <form onSubmit={handleSendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <input
                type="email"
                required
                placeholder={language === 'hu' ? 'Családtag e-mail címe' : 'Member email address'}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as HouseholdRole)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="member">{language === 'hu' ? 'Családtag (Member)' : 'Family Member'}</option>
                <option value="admin">{language === 'hu' ? 'Adminisztrátor (Admin)' : 'Family Admin'}</option>
                <option value="viewer">{language === 'hu' ? 'Megtekintő (Viewer)' : 'Viewer Only'}</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {language === 'hu' ? 'Meghívó Küldése' : 'Send Invitation'}
              </button>
            </div>
          </form>

          {inviteMessage && (
            <div className={`p-3 rounded-xl text-sm font-medium ${inviteMessage.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {inviteMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800">
          {language === 'hu' ? 'Háztartás Tagjai' : 'Household Members'} ({householdMembers.length})
        </h2>

        <div className="divide-y divide-slate-100">
          {householdMembers.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200">
                  {(member.user_name || member.user_email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{member.user_name || member.user_email}</p>
                  <p className="text-xs text-slate-500">{member.user_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getRoleBadge(member.role)}

                {isOwnerOrAdmin && member.role !== 'owner' && member.user_id !== user?.id && (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value as HouseholdRole)}
                      className="text-xs rounded-lg border border-slate-300 p-1.5 focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button
                      onClick={() => removeHouseholdMember(member.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title={language === 'hu' ? 'Tag eltávolítása' : 'Remove Member'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {householdInvites.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            {language === 'hu' ? 'Függőben Lévő Meghívók' : 'Pending Invitations'}
          </h2>
          <div className="divide-y divide-slate-100 text-sm">
            {householdInvites.map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{inv.invited_email}</span>
                  <span className="ml-2 text-xs text-slate-500">({inv.role})</span>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Household Items Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {language === 'hu' ? 'Családi Közös Leltár' : 'Household Shared Inventory'} ({sharedItems.length})
          </h2>
        </div>

        {sharedItems.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4 text-center">
            {language === 'hu'
              ? 'Még egyetlen tárgynál sem állítottad be a "Családi" láthatóságot.'
              : 'No items have been assigned to household visibility yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sharedItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 transition text-left flex items-center gap-3 bg-slate-50/50"
              >
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(item.current_value || item.purchase_price || 0)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
