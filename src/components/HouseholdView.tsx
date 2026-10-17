import React, { useState } from 'react';
import { useApp, useModalBack } from '../context/AppContext';
import { Users, UserPlus, Shield, Crown, Eye, Trash2, Mail, Package, LogOut, MapPin, FolderCheck, Check, X, Clock, Edit2, SlidersHorizontal, Lock, Tag, FileText, Archive, HandCoins, Ban, Search } from 'lucide-react';
import type { HouseholdRole, HouseholdMember } from '../types';

export const HouseholdView: React.FC = () => {
  const {
    household,
    householdMembers,
    householdInvites,
    receivedInvites,
    createHousehold,
    inviteHouseholdMember,
    acceptHouseholdInvite,
    declineHouseholdInvite,
    cancelHouseholdInvite,
    removeHouseholdMember,
    updateHouseholdMember,
    updateMemberAllowedLocations,
    updateMemberAllowedCategories,
    leaveHousehold,
    updateHouseholdName,
    updateHouseholdSharedLocations,
    updateHouseholdSharedCategories,
    locations,
    categories,
    items,
    user,
    setSelectedItemId,
    setIsAuthModalOpen,
    setAuthModalMode,
    language
  } = useApp();

  const PRESET_TITLES = ['Apa', 'Anya', 'Tesó', 'Nagyszülő', 'Gyerek', 'Unoka', 'Dédszülő', 'Dédunoka', 'Egyéb'];

  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [householdNameInput, setHouseholdNameInput] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteMessage, setInviteMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Member editing modal state
  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editTitleInput, setEditTitleInput] = useState('');

  // Per-member sharing modal state
  const [sharingMember, setSharingMember] = useState<HouseholdMember | null>(null);
  const [sharingMode, setSharingMode] = useState<'all' | 'custom'>('all');
  const [sharingTab, setSharingTab] = useState<'modules' | 'locations' | 'categories' | 'excluded_items'>('modules');
  const [inheritLocations, setInheritLocations] = useState(true);
  const [memberAllowedLocs, setMemberAllowedLocs] = useState<string[]>([]);
  const [inheritCategories, setInheritCategories] = useState(true);
  const [memberAllowedCats, setMemberAllowedCats] = useState<string[]>([]);
  const [allowedModules, setAllowedModules] = useState<{ inventory: boolean; documents: boolean; pantry: boolean; lending: boolean }>({
    inventory: true,
    documents: true,
    pantry: true,
    lending: true
  });
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
  const [itemSearchFilter, setItemSearchFilter] = useState('');

  // Mobile back button traps: closing modals on back button without changing route
  useModalBack(editingMember !== null, () => setEditingMember(null), 'household-edit-member');
  useModalBack(sharingMember !== null, () => setSharingMember(null), 'household-share-member');

  const handleOpenEditMember = (m: HouseholdMember) => {
    setEditingMember(m);
    setEditNameInput(m.user_name || m.user_email || '');
    setEditTitleInput(m.title || '');
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    await updateHouseholdMember(editingMember.id, {
      user_name: editNameInput.trim() || editingMember.user_email,
      title: editTitleInput.trim() || undefined
    });
    setEditingMember(null);
  };

  const handleOpenSharingMember = (m: HouseholdMember) => {
    setSharingMember(m);
    setSharingMode(m.sharing_mode || 'all');
    setSharingTab('modules');
    setItemSearchFilter('');

    if (m.allowed_location_ids === null || m.allowed_location_ids === undefined) {
      setInheritLocations(true);
      setMemberAllowedLocs(household?.shared_location_ids || []);
    } else {
      setInheritLocations(false);
      setMemberAllowedLocs(m.allowed_location_ids);
    }

    if (m.allowed_category_ids === null || m.allowed_category_ids === undefined) {
      setInheritCategories(true);
      setMemberAllowedCats(household?.shared_category_ids || []);
    } else {
      setInheritCategories(false);
      setMemberAllowedCats(m.allowed_category_ids);
    }

    setAllowedModules({
      inventory: m.allowed_modules?.inventory !== false,
      documents: m.allowed_modules?.documents !== false,
      pantry: m.allowed_modules?.pantry !== false,
      lending: m.allowed_modules?.lending !== false
    });

    setExcludedItemIds(m.excluded_item_ids || []);
  };

  const handleSaveMemberSharing = async () => {
    if (!sharingMember) return;
    const locPayload = inheritLocations ? null : memberAllowedLocs;
    const catPayload = inheritCategories ? null : memberAllowedCats;
    await updateMemberAllowedLocations(sharingMember.id, locPayload);
    await updateMemberAllowedCategories(sharingMember.id, catPayload);
    await updateHouseholdMember(sharingMember.id, {
      sharing_mode: sharingMode,
      allowed_modules: allowedModules,
      excluded_item_ids: excludedItemIds
    });
    setSharingMember(null);
  };

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
    const res = await inviteHouseholdMember(inviteEmail.trim(), inviteTitle.trim() || undefined);

    if (res.success) {
      setInviteMessage({
        text: res.message || (language === 'hu' ? `Meghívó elküldve a következő címre: ${inviteEmail}` : `Invite sent to ${inviteEmail}`),
        success: true
      });
      setInviteEmail('');
      setInviteTitle('');
    } else {
      setInviteMessage({
        text: res.error || (language === 'hu' ? 'Hiba a meghívó küldésekor' : 'Error sending invite'),
        success: false
      });
    }
  };

  const handleStartEditHouseholdName = () => {
    if (!household) return;
    setHouseholdNameInput(household.name);
    setIsEditingHouseholdName(true);
  };

  const handleSaveHouseholdName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !householdNameInput.trim()) return;
    await updateHouseholdName(householdNameInput.trim());
    setIsEditingHouseholdName(false);
  };

  const handleLeaveHousehold = async () => {
    if (currentUserMember?.role === 'owner' && householdMembers.length > 1) {
      alert(
        language === 'hu'
          ? 'Családfőként (tulajdonosként) nem léphetsz ki, amíg más családtagok is vannak a háztartásban. Kérjük, először távolítsd el a tagokat, vagy add át a tulajdonjogot!'
          : 'As the household owner, you cannot leave while other members exist. Please remove members first or transfer ownership!'
      );
      return;
    }

    const confirmed = window.confirm(
      language === 'hu'
        ? 'Biztosan ki szeretnél lépni ebből a háztartásból? Ezzel elveszíted a hozzáférést a közös tárgyakhoz és leltárhoz.'
        : 'Are you sure you want to leave this household? You will lose access to shared items and inventory.'
    );

    if (confirmed) {
      await leaveHousehold();
    }
  };

  const handleRemoveMember = async (memberId: string, memberLabel: string) => {
    const confirmed = window.confirm(
      language === 'hu'
        ? `Biztosan el szeretnéd távolítani "${memberLabel}" tagot a háztartásból?`
        : `Are you sure you want to remove "${memberLabel}" from the household?`
    );

    if (confirmed) {
      await removeHouseholdMember(memberId);
    }
  };

  const getRoleBadge = (role: HouseholdRole) => {
    switch (role) {
      case 'owner':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950/50 text-[var(--color-warning,#F59E0B)] border border-amber-500/40 flex items-center gap-1 whitespace-nowrap shrink-0"><Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {language === 'hu' ? 'Családfő (Tulajdonos)' : 'Owner'}</span>;
      case 'admin':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-950/50 text-blue-300 border border-[var(--color-primary-blue,#2563EB)]/40 flex items-center gap-1 whitespace-nowrap shrink-0"><Shield className="w-3.5 h-3.5 text-[var(--color-primary-blue,#2563EB)] shrink-0" /> {language === 'hu' ? 'Adminisztrátor' : 'Admin'}</span>;
      case 'member':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/50 text-[var(--color-status-success,#34D399)] border border-emerald-500/40 flex items-center gap-1 whitespace-nowrap shrink-0"><Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {language === 'hu' ? 'Családtag' : 'Member'}</span>;
      case 'viewer':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] flex items-center gap-1 whitespace-nowrap shrink-0"><Eye className="w-3.5 h-3.5 text-[var(--text-sub,#B5BDC6)] shrink-0" /> {language === 'hu' ? 'Megtekintő' : 'Viewer'}</span>;
    }
  };

  // Shared household items
  const sharedItems = items.filter(i => i.ownership_scope === 'household');
  const sharedTotalValue = sharedItems.reduce((sum, i) => sum + (i.current_value || i.purchase_price || 0), 0);

  // Current user member and permissions
  const currentUserMember = householdMembers.find(m => m.user_id === user?.id);
  const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[var(--card-bg,#3A4551)] rounded-3xl border border-[var(--border-color,#56616D)] text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-main,#E0E3E6)]">
          {language === 'hu' ? 'Bejelentkezés Szükséges' : 'Login Required'}
        </h2>
        <p className="text-sm text-[var(--text-sub,#B5BDC6)]">
          {language === 'hu'
            ? 'A családi és háztartási adatok megtekintéséhez kérjük, jelentkezz be a fiókodba!'
            : 'Please log in to your account to view family and household access.'}
        </p>
        <button
          onClick={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          className="w-full py-3 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl shadow-md transition"
        >
          {language === 'hu' ? 'Bejelentkezés' : 'Log In'}
        </button>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Received Pending Invitations */}
        {receivedInvites.length > 0 && (
          <div className="bg-[var(--card-bg,#3A4551)] text-white rounded-2xl border border-[var(--color-primary-blue,#2563EB)]/50 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] rounded-xl border border-[var(--border-color,#56616D)]">
                <Mail className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[var(--text-main,#E0E3E6)]">
                  {language === 'hu' ? 'Családi Meghívás Érkezett!' : 'Family Invitation Received!'}
                </h2>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                  {language === 'hu'
                    ? 'Meghívót kaptál egy közös családi háztartáshoz. A fiókok és tárgyak csak a visszaigazolás után kapcsolódnak össze!'
                    : 'You received an invitation to join a family household. Accounts will link only after confirmation!'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-[var(--border-color,#56616D)]">
              {receivedInvites.map((inv) => (
                <div key={inv.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {inv.household_name || (language === 'hu' ? 'Családi Háztartás' : 'Family Household')}
                    </p>
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {language === 'hu' ? 'Kijelölt szerepkör:' : 'Assigned Role:'} <strong className="text-[var(--color-primary-blue,#2563EB)] font-semibold">{inv.role}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const res = await acceptHouseholdInvite(inv.id);
                        if (!res.success) alert(res.error);
                      }}
                      className="px-4 py-2 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Check className="w-4 h-4" />
                      {language === 'hu' ? 'Elfogadom (Visszaigazolás)' : 'Confirm & Accept'}
                    </button>

                    <button
                      onClick={() => declineHouseholdInvite(inv.id)}
                      className="px-3.5 py-2 bg-[var(--surface-bg,#465362)] hover:bg-rose-950/60 hover:text-rose-300 text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] rounded-xl text-xs flex items-center gap-1 transition-all"
                    >
                      <X className="w-4 h-4" />
                      {language === 'hu' ? 'Elutasítom' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main,#E0E3E6)]">
            {language === 'hu' ? 'Családi / Háztartási Hozzáférés' : 'Family / Household Access'}
          </h1>
          <p className="text-[var(--text-sub,#B5BDC6)] text-sm max-w-lg mx-auto">
            {language === 'hu'
              ? 'Hozz létre egy közös háztartást, hívd meg családtagjaidat és kezeljétek közösen az otthoni vagyontárgyakat pontos jogosultságokkal.'
              : 'Create a shared household, invite family members, and manage home assets together with granular RBAC permissions.'}
          </p>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)]">
            {language === 'hu' ? 'Új Háztartás Létrehozása' : 'Create New Household'}
          </h2>
          <form onSubmit={handleCreateHousehold} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">
                {language === 'hu' ? 'Háztartás / Család neve *' : 'Household Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'hu' ? 'Pl. Kovács Család Háztartása' : 'e.g. Smith Household'}
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color,#56616D)] p-3 text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] placeholder-[var(--text-sub,#B5BDC6)] focus:border-[var(--color-primary-blue,#2563EB)] outline-none text-sm transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl transition shadow-md"
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
            {isEditingHouseholdName ? (
              <form onSubmit={handleSaveHouseholdName} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={householdNameInput}
                  onChange={(e) => setHouseholdNameInput(e.target.value)}
                  className="rounded-xl border border-[var(--color-primary-blue,#2563EB)] p-2 text-lg font-bold text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  {language === 'hu' ? 'Mentés' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingHouseholdName(false)}
                  className="px-3 py-1.5 bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white rounded-lg text-xs font-semibold"
                >
                  {language === 'hu' ? 'Mégse' : 'Cancel'}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                  <Users className="w-7 h-7 text-[var(--color-primary-blue,#2563EB)]" />
                  {household.name}
                </h1>
                {isOwnerOrAdmin && (
                  <button
                    onClick={handleStartEditHouseholdName}
                    className="p-1.5 text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] rounded-lg transition"
                    title={language === 'hu' ? 'Háztartás nevének módosítása' : 'Edit household name'}
                  >
                    <Edit2 className="w-4 h-4 text-emerald-400" />
                  </button>
                )}
              </div>
            )}
            {getRoleBadge(currentUserMember?.role || 'member')}
          </div>
          <p className="text-[var(--text-sub,#B5BDC6)] text-sm mt-1">
            {language === 'hu'
              ? 'Közös háztartás leltárja, tagok és jogosultságok kezelése.'
              : 'Shared household inventory, member roles, and permission settings.'}
          </p>
        </div>

        <button
          onClick={handleLeaveHousehold}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40 rounded-xl transition text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          {language === 'hu' ? 'Kilépés a háztartásból' : 'Leave Household'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Családtagok' : 'Members'}</p>
            <p className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{householdMembers.length}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Közös Tárgyak' : 'Shared Items'}</p>
            <p className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{sharedItems.length}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-950/40 text-[var(--color-warning,#F59E0B)] border border-amber-500/30 rounded-xl">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Közös Vagyoni Érték' : 'Total Shared Value'}</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(sharedTotalValue)}</p>
          </div>
        </div>
      </div>

      {/* Invite Section (Owners / Admins only) */}
      {isOwnerOrAdmin && (
        <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)]" />
            {language === 'hu' ? 'Új Családtag Meghívása' : 'Invite Family Member'}
          </h2>

          <form onSubmit={handleSendInvite} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <input
                  type="email"
                  required
                  placeholder={language === 'hu' ? 'Családtag e-mail címe *' : 'Member email address *'}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] p-2.5 text-sm text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] placeholder-[var(--text-sub,#B5BDC6)] focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder={language === 'hu' ? 'Nevet / Titulus (pl. Apa, Anya, Tesó)' : 'Title / Role (e.g. Mom, Dad, Brother)'}
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] p-2.5 text-sm text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] placeholder-[var(--text-sub,#B5BDC6)] focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {language === 'hu' ? 'Meghívó Küldése' : 'Send Invitation'}
                </button>
              </div>
            </div>

            {/* Quick Title Selection Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mr-1">
                {language === 'hu' ? 'Gyors választás:' : 'Quick select:'}
              </span>
              {PRESET_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInviteTitle(t)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
                    inviteTitle === t
                      ? 'bg-[var(--color-primary-blue,#2563EB)] text-white border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                      : 'bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] border-[var(--border-color,#56616D)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </form>

          {inviteMessage && (
            <div className={`p-3 rounded-xl text-sm font-medium ${inviteMessage.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/40 text-rose-300 border border-rose-500/40'}`}>
              {inviteMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)]">
          {language === 'hu' ? 'Háztartás Tagjai' : 'Household Members'} ({householdMembers.length})
        </h2>

        <div className="divide-y divide-[var(--border-color,#56616D)]">
          {householdMembers.map((member) => (
            <div key={member.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] font-bold flex items-center justify-center text-sm border border-[var(--border-color,#56616D)] shrink-0">
                  {(member.user_name || member.user_email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      onClick={() => isOwnerOrAdmin && handleOpenSharingMember(member)}
                      className={`font-semibold text-[var(--text-main,#E0E3E6)] text-sm ${
                        isOwnerOrAdmin ? 'cursor-pointer hover:text-[var(--color-primary-blue,#2563EB)] transition-colors' : ''
                      }`}
                      title={isOwnerOrAdmin ? (language === 'hu' ? 'Kattints a megosztási beállítások megnyitásához' : 'Click to open sharing settings') : undefined}
                    >
                      {member.user_name || member.user_email}
                    </p>
                    {member.title && (
                      <span className="px-2 py-0.5 text-xs rounded-md bg-emerald-950/50 text-[var(--color-status-success,#34D399)] font-semibold border border-emerald-500/40">
                        {member.title}
                      </span>
                    )}
                    {member.sharing_mode === 'custom' && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                        {language === 'hu' ? 'Egyedi' : 'Custom'}
                      </span>
                    )}
                    {/* Location status badge */}
                    {member.allowed_location_ids === null || member.allowed_location_ids === undefined ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] flex items-center gap-1">
                        <FolderCheck className="w-3 h-3 text-[var(--text-sub,#B5BDC6)]" />
                        {language === 'hu' ? 'Mappák: Örökölt' : 'Folders: Inherited'}
                      </span>
                    ) : member.allowed_location_ids.length === 0 ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-rose-950/40 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <FolderCheck className="w-3 h-3 text-rose-400" />
                        {language === 'hu' ? 'Mappák: Letiltva (0)' : 'Folders: Blocked (0)'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-950/50 text-blue-300 border border-[var(--color-primary-blue,#2563EB)]/40 flex items-center gap-1">
                        <FolderCheck className="w-3 h-3 text-[var(--color-primary-blue,#2563EB)]" />
                        {language === 'hu' ? 'Egyedi mappák' : 'Custom folders'} ({member.allowed_location_ids.length})
                      </span>
                    )}

                    {/* Category status badge */}
                    {member.allowed_category_ids === null || member.allowed_category_ids === undefined ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[var(--text-sub,#B5BDC6)]" />
                        {language === 'hu' ? 'Kategóriák: Örökölt' : 'Categories: Inherited'}
                      </span>
                    ) : member.allowed_category_ids.length === 0 ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-rose-950/40 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-rose-400" />
                        {language === 'hu' ? 'Kategóriák: Letiltva (0)' : 'Categories: Blocked (0)'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-950/50 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-400" />
                        {language === 'hu' ? 'Egyedi kategóriák' : 'Custom categories'} ({member.allowed_category_ids.length})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">{member.user_email}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-1 sm:pt-0">
                <div className="self-start sm:self-auto shrink-0">
                  {getRoleBadge(member.role)}
                </div>

                {isOwnerOrAdmin && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleOpenEditMember(member)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-lg transition flex items-center gap-1 whitespace-nowrap"
                      title={language === 'hu' ? 'Családtag szerkesztése' : 'Edit Member'}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{language === 'hu' ? 'Szerkesztés' : 'Edit'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenSharingMember(member)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-lg transition flex items-center gap-1 whitespace-nowrap"
                      title={language === 'hu' ? 'Megosztási helyszínek beállítása' : 'Configure Sharing'}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span>{language === 'hu' ? 'Megosztás' : 'Sharing'}</span>
                    </button>

                    {member.role !== 'owner' && member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user_name || member.user_email || 'Tag')}
                        className="p-1.5 text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition shrink-0"
                        title={language === 'hu' ? 'Tag eltávolítása' : 'Remove Member'}
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Received Pending Invitations */}
      {receivedInvites.length > 0 && (
        <div className="bg-[var(--card-bg,#3A4551)] text-white rounded-2xl border border-[var(--color-primary-blue,#2563EB)]/50 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] rounded-xl border border-[var(--border-color,#56616D)]">
              <Mail className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-main,#E0E3E6)]">
                {language === 'hu' ? 'Családi Meghívás Érkezett!' : 'Family Invitation Received!'}
              </h2>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                {language === 'hu'
                  ? 'Meghívót kaptál egy közös családi háztartáshoz. A fiókok és tárgyak csak a visszaigazolás után kapcsolódnak össze!'
                  : 'You received an invitation to join a family household. Accounts will link only after confirmation!'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-[var(--border-color,#56616D)]">
            {receivedInvites.map((inv) => (
              <div key={inv.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    {inv.household_name || (language === 'hu' ? 'Családi Háztartás' : 'Family Household')}
                  </p>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                    {inv.title ? (
                      <>{language === 'hu' ? 'Megnevezés / Titulus:' : 'Title:'} <strong className="text-[var(--color-primary-blue,#2563EB)] font-semibold">{inv.title}</strong></>
                    ) : (
                      <>{language === 'hu' ? 'Kijelölt szerepkör:' : 'Assigned Role:'} <strong className="text-[var(--color-primary-blue,#2563EB)] font-semibold">{inv.role}</strong></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const res = await acceptHouseholdInvite(inv.id);
                      if (!res.success) alert(res.error);
                    }}
                    className="px-4 py-2 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Check className="w-4 h-4" />
                    {language === 'hu' ? 'Elfogadom (Visszaigazolás)' : 'Confirm & Accept'}
                  </button>

                  <button
                    onClick={() => declineHouseholdInvite(inv.id)}
                    className="px-3.5 py-2 bg-[var(--surface-bg,#465362)] hover:bg-rose-950/60 hover:text-rose-300 text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] rounded-xl text-xs flex items-center gap-1 transition-all"
                  >
                    <X className="w-4 h-4" />
                    {language === 'hu' ? 'Elutasítom' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Pending Invites */}
      {householdInvites.filter(i => i.status === 'pending').length > 0 && (
        <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--color-warning,#F59E0B)]" />
            {language === 'hu' ? 'Kiküldött Függőben Lévő Meghívók' : 'Sent Pending Invitations'}
          </h2>
          <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
            {language === 'hu'
              ? 'A meghívott fiókja csak akkor kapcsolódik össze a családdal, ha visszaigazolja a meghívást.'
              : 'The invited account will link with the family only after they confirm the invitation.'}
          </p>
          <div className="divide-y divide-[var(--border-color,#56616D)] text-sm">
            {householdInvites.filter(i => i.status === 'pending').map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-main,#E0E3E6)]">{inv.invited_email || inv.email}</span>
                  {inv.title ? (
                    <span className="px-2 py-0.5 text-xs rounded-md bg-emerald-950/50 text-[var(--color-status-success,#34D399)] font-semibold border border-emerald-500/40">
                      {inv.title}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-sub,#B5BDC6)]">({inv.role})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {language === 'hu' ? 'Várakozás a visszaigazolásra...' : 'Pending confirmation...'}
                  </span>
                  <button
                    onClick={() => cancelHouseholdInvite(inv.id)}
                    className="p-1.5 text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                    title={language === 'hu' ? 'Meghívó visszavonása' : 'Cancel invitation'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Folders / Locations Management */}
      <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
            <FolderCheck className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)]" />
            {language === 'hu' ? 'Megosztott Mappák & Helyszínek' : 'Shared Folders & Locations'}
          </h2>
          {!isOwnerOrAdmin && (
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {language === 'hu' ? 'Csak adminok módosíthatják' : 'Admin only'}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
          {language === 'hu'
            ? 'Válaszd ki, mely tárolási helyszíneket és mappákat osztod meg a családtagokkal.'
            : 'Select which storage locations and folders are shared with household members.'}
        </p>

        {locations.length === 0 ? (
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] italic">{language === 'hu' ? 'Még nincs rögzített helyszín.' : 'No locations created yet.'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {locations.map(loc => {
              const sharedLocs = household?.shared_location_ids || [];
              const isLocShared = sharedLocs.includes(loc.id);

              const toggleLoc = () => {
                if (!isOwnerOrAdmin) return;
                let updated = isLocShared
                  ? sharedLocs.filter(id => id !== loc.id)
                  : [...sharedLocs, loc.id];
                updateHouseholdSharedLocations(updated);
              };

              return (
                <label
                  key={loc.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    !isOwnerOrAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    isLocShared ? 'bg-blue-950/40 border-[var(--color-primary-blue,#2563EB)] text-white font-semibold' : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                    <span className="text-sm truncate">{loc.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isOwnerOrAdmin}
                    checked={isLocShared}
                    onChange={toggleLoc}
                    className="w-4 h-4 accent-[var(--color-primary-blue,#2563EB)] rounded disabled:cursor-not-allowed"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Categories Management */}
      <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-400" />
            {language === 'hu' ? 'Megosztott Kategóriák' : 'Shared Categories'}
          </h2>
          {!isOwnerOrAdmin && (
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {language === 'hu' ? 'Csak adminok módosíthatják' : 'Admin only'}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
          {language === 'hu'
            ? 'Válaszd ki, mely tárgykategóriákat osztod meg a háztartással. A kijelölt kategóriák tárgyai alapértelmezetten láthatók a családtagok számára.'
            : 'Select which item categories are shared with household members by default.'}
        </p>

        {categories.length === 0 ? (
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] italic">{language === 'hu' ? 'Még nincs elérhető kategória.' : 'No categories available.'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(cat => {
              const sharedCats = household?.shared_category_ids || [];
              const isCatShared = sharedCats.includes(cat.id);

              const toggleCat = () => {
                if (!isOwnerOrAdmin) return;
                let updated = isCatShared
                  ? sharedCats.filter(id => id !== cat.id)
                  : [...sharedCats, cat.id];
                updateHouseholdSharedCategories(updated);
              };

              return (
                <label
                  key={cat.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    !isOwnerOrAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    isCatShared ? 'bg-purple-950/40 border-purple-500 text-white font-semibold' : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-sm truncate">{cat.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isOwnerOrAdmin}
                    checked={isCatShared}
                    onChange={toggleCat}
                    className="w-4 h-4 accent-purple-500 rounded disabled:cursor-not-allowed"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Household Items Overview */}
      <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)]">
            {language === 'hu' ? 'Családi Közös Leltár' : 'Household Shared Inventory'} ({sharedItems.length})
          </h2>
        </div>

        {sharedItems.length === 0 ? (
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] italic py-4 text-center">
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
                className="p-3 rounded-xl border border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)] transition text-left flex items-center gap-3 bg-[var(--surface-bg,#465362)]"
              >
                <div className="p-2 bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-semibold text-[var(--text-main,#E0E3E6)] text-sm truncate">{item.name}</p>
                  <p className="text-xs text-emerald-400 font-medium">{formatCurrency(item.current_value || item.purchase_price || 0)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. MEMBER EDIT MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main,#E0E3E6)]">
                  {language === 'hu' ? 'Családtag Szerkesztése' : 'Edit Family Member'}
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1.5 text-[var(--text-sub,#B5BDC6)] hover:text-white rounded-lg hover:bg-[var(--surface-bg,#465362)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Megjelenítendő név' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] p-2.5 text-sm text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] placeholder-[var(--text-sub,#B5BDC6)] focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Titulus / Megnevezés (pl. Apa, Anya, Tesó)' : 'Title / Role'}
                </label>
                <input
                  type="text"
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  placeholder={language === 'hu' ? 'pl. Nagyszülő, Gyerek' : 'e.g. Grandparent'}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] p-2.5 text-sm text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] placeholder-[var(--text-sub,#B5BDC6)] focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                />
              </div>

              {/* Quick Title Selection Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                  {language === 'hu' ? 'Gyors választás:' : 'Quick select:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TITLES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditTitleInput(t)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
                        editTitleInput === t
                          ? 'bg-[var(--color-primary-blue,#2563EB)] text-white border-[var(--color-primary-blue,#2563EB)] shadow-sm'
                          : 'bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] border-[var(--border-color,#56616D)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border-color,#56616D)]">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] rounded-xl transition"
                >
                  {language === 'hu' ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition shadow-md"
                >
                  {language === 'hu' ? 'Mentés' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MEMBER SHARING MODAL (LOCATIONS & CATEGORIES) */}
      {sharingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main,#E0E3E6)]">
                    {language === 'hu' ? 'Családtagonkénti Megosztás' : 'Member Sharing Settings'}
                  </h3>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                    {sharingMember.user_name || sharingMember.user_email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSharingMember(null)}
                className="p-1.5 text-[var(--text-sub,#B5BDC6)] hover:text-white rounded-lg hover:bg-[var(--surface-bg,#465362)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Global Member Sharing Mode Selector */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[var(--surface-bg,#465362)] rounded-xl border border-[var(--border-color,#56616D)]">
              <button
                type="button"
                onClick={() => setSharingMode('all')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  sharingMode === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'hu' ? 'Teljes Megosztás' : 'Full Access'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSharingMode('custom')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  sharingMode === 'custom'
                    ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                    : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === 'hu' ? 'Egyéni Testreszabás' : 'Custom Permissions'}</span>
              </button>
            </div>

            {sharingMode === 'all' ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2 text-emerald-300">
                  <Check className="w-4 h-4" />
                  {language === 'hu' ? 'Minden háztartási adat elérhető' : 'All household inventory is accessible'}
                </p>
                <p className="text-[var(--text-sub,#B5BDC6)] leading-relaxed">
                  {language === 'hu'
                    ? 'Ez a családtag alapértelmezetten hozzáfér minden közös mappához, kategóriához és modulhoz. A privát és trezorban védett tárgyak a széf-barrier védelme alatt maradnak.'
                    : 'This member has access to all shared folders, categories, and modules. Private and vault-protected items remain strictly isolated.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 2. Custom Tabs */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--surface-bg,#465362)] rounded-xl border border-[var(--border-color,#56616D)] text-xs">
                  <button
                    type="button"
                    onClick={() => setSharingTab('modules')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                      sharingTab === 'modules' ? 'bg-[var(--color-primary-blue,#2563EB)] text-white' : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                    }`}
                  >
                    <FolderCheck className="w-3.5 h-3.5" />
                    <span className="truncate">{language === 'hu' ? 'Modulok' : 'Modules'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSharingTab('locations')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                      sharingTab === 'locations' ? 'bg-[var(--color-primary-blue,#2563EB)] text-white' : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{language === 'hu' ? 'Mappák' : 'Folders'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSharingTab('categories')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                      sharingTab === 'categories' ? 'bg-purple-600 text-white' : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span className="truncate">{language === 'hu' ? 'Kategóriák' : 'Categories'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSharingTab('excluded_items')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                      sharingTab === 'excluded_items' ? 'bg-rose-600 text-white' : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span className="truncate">{language === 'hu' ? 'Kizárás' : 'Excluded'}</span>
                  </button>
                </div>

                {/* TAB: MODULES */}
                {sharingTab === 'modules' && (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {language === 'hu'
                        ? 'Válaszd ki, mely modulokhoz és adatokhoz férhet hozzá a családtag:'
                        : 'Select which functional modules this member is allowed to access:'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className="p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                          <div>
                            <p className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">{language === 'hu' ? 'Közös Leltár' : 'Inventory'}</p>
                            <p className="text-[10px] text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Tárgyak megtekintése' : 'View shared items'}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowedModules.inventory}
                          onChange={(e) => setAllowedModules(prev => ({ ...prev, inventory: e.target.checked }))}
                          className="w-4 h-4 accent-[var(--color-primary-blue,#2563EB)] rounded"
                        />
                      </label>

                      <label className="p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">{language === 'hu' ? 'Csatolt Fájlok' : 'Documents'}</p>
                            <p className="text-[10px] text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Dokumentumok letöltése' : 'Download documents'}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowedModules.documents}
                          onChange={(e) => setAllowedModules(prev => ({ ...prev, documents: e.target.checked }))}
                          className="w-4 h-4 accent-emerald-500 rounded"
                        />
                      </label>

                      <label className="p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-amber-400" />
                          <div>
                            <p className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">{language === 'hu' ? 'Spájz / Éléskamra' : 'Pantry'}</p>
                            <p className="text-[10px] text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Élelmiszer készlet' : 'Pantry inventory'}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowedModules.pantry}
                          onChange={(e) => setAllowedModules(prev => ({ ...prev, pantry: e.target.checked }))}
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                      </label>

                      <label className="p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <HandCoins className="w-4 h-4 text-purple-400" />
                          <div>
                            <p className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">{language === 'hu' ? 'Kölcsönzések' : 'Lending'}</p>
                            <p className="text-[10px] text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Kölcsönadott tárgyak' : 'Lending tracker'}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowedModules.lending}
                          onChange={(e) => setAllowedModules(prev => ({ ...prev, lending: e.target.checked }))}
                          className="w-4 h-4 accent-purple-500 rounded"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB: LOCATIONS */}
                {sharingTab === 'locations' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                        <input
                          type="radio"
                          name="loc_mode"
                          checked={inheritLocations}
                          onChange={() => setInheritLocations(true)}
                          className="accent-[var(--color-primary-blue,#2563EB)]"
                        />
                        <span>{language === 'hu' ? 'Háztartási alapértelmezések követése (Öröklés)' : 'Follow household defaults (Inherit)'}</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                        <input
                          type="radio"
                          name="loc_mode"
                          checked={!inheritLocations}
                          onChange={() => setInheritLocations(false)}
                          className="accent-[var(--color-primary-blue,#2563EB)]"
                        />
                        <span>{language === 'hu' ? 'Egyedi hozzáférés beállítása erre a családtagra' : 'Custom access for this member'}</span>
                      </label>
                    </div>

                    {inheritLocations ? (
                      <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200">
                        <p className="font-medium">
                          {language === 'hu'
                            ? `Ez a családtag automatikusan a háztartásban megosztott helyszíneket látja (${household?.shared_location_ids?.length || 0} db).`
                            : `This member automatically inherits household shared locations (${household?.shared_location_ids?.length || 0} items).`}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1">
                          <button
                            type="button"
                            onClick={() => setMemberAllowedLocs(locations.map(l => l.id))}
                            className="text-xs font-semibold text-[var(--color-primary-blue,#2563EB)] hover:text-blue-400"
                          >
                            {language === 'hu' ? 'Összes kijelölése' : 'Select All'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMemberAllowedLocs([])}
                            className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                          >
                            {language === 'hu' ? 'Kijelölés törlése (Teljes tiltás)' : 'Clear All (Block)'}
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {locations.length === 0 ? (
                            <p className="text-xs text-[var(--text-sub,#B5BDC6)] italic py-2">{language === 'hu' ? 'Nincsenek létrehozott helyszínek.' : 'No locations created.'}</p>
                          ) : (
                            locations.map((loc) => {
                              const isChecked = memberAllowedLocs.includes(loc.id);
                              const toggle = () => {
                                setMemberAllowedLocs(prev =>
                                  isChecked ? prev.filter(id => id !== loc.id) : [...prev, loc.id]
                                );
                              };
                              return (
                                <label
                                  key={loc.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-sm ${
                                    isChecked
                                      ? 'bg-blue-950/40 border-[var(--color-primary-blue,#2563EB)] text-white font-semibold'
                                      : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <MapPin className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                                    <span className="truncate">{loc.name}</span>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={toggle}
                                    className="w-4 h-4 accent-[var(--color-primary-blue,#2563EB)] rounded"
                                  />
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: CATEGORIES */}
                {sharingTab === 'categories' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                        <input
                          type="radio"
                          name="cat_mode"
                          checked={inheritCategories}
                          onChange={() => setInheritCategories(true)}
                          className="accent-purple-500"
                        />
                        <span>{language === 'hu' ? 'Háztartási alapértelmezések követése (Öröklés)' : 'Follow household defaults (Inherit)'}</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-[var(--text-main,#E0E3E6)]">
                        <input
                          type="radio"
                          name="cat_mode"
                          checked={!inheritCategories}
                          onChange={() => setInheritCategories(false)}
                          className="accent-purple-500"
                        />
                        <span>{language === 'hu' ? 'Egyedi hozzáférés beállítása erre a családtagra' : 'Custom access for this member'}</span>
                      </label>
                    </div>

                    {inheritCategories ? (
                      <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                        <p className="font-medium">
                          {language === 'hu'
                            ? `Ez a családtag automatikusan a háztartásban megosztott kategóriákat látja (${household?.shared_category_ids?.length || 0} db).`
                            : `This member automatically inherits household shared categories (${household?.shared_category_ids?.length || 0} items).`}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1">
                          <button
                            type="button"
                            onClick={() => setMemberAllowedCats(categories.map(c => c.id))}
                            className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                          >
                            {language === 'hu' ? 'Összes kijelölése' : 'Select All'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMemberAllowedCats([])}
                            className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                          >
                            {language === 'hu' ? 'Kijelölés törlése (Teljes tiltás)' : 'Clear All (Block)'}
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {categories.length === 0 ? (
                            <p className="text-xs text-[var(--text-sub,#B5BDC6)] italic py-2">{language === 'hu' ? 'Nincsenek kategóriák.' : 'No categories available.'}</p>
                          ) : (
                            categories.map((cat) => {
                              const isChecked = memberAllowedCats.includes(cat.id);
                              const toggle = () => {
                                setMemberAllowedCats(prev =>
                                  isChecked ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                );
                              };
                              return (
                                <label
                                  key={cat.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-sm ${
                                    isChecked
                                      ? 'bg-purple-950/40 border-purple-500 text-white font-semibold'
                                      : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                                    <span className="truncate">{cat.name}</span>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={toggle}
                                    className="w-4 h-4 accent-purple-500 rounded"
                                  />
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: EXCLUDED ITEMS */}
                {sharingTab === 'excluded_items' && (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {language === 'hu'
                        ? 'Jelöld be azokat a konkrét tárgyakat, amelyeket el szeretnél rejteni ez elől a családtag elől:'
                        : 'Select specific items to exclude and hide from this family member:'}
                    </p>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[var(--text-sub,#B5BDC6)] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder={language === 'hu' ? 'Keresés a közös tárgyak között...' : 'Search items...'}
                        value={itemSearchFilter}
                        onChange={(e) => setItemSearchFilter(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-color,#56616D)] pl-9 pr-3 py-2 text-xs text-[var(--text-main,#E0E3E6)] bg-[var(--surface-bg,#465362)] outline-none"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                      {sharedItems
                        .filter(i => !itemSearchFilter || i.name.toLowerCase().includes(itemSearchFilter.toLowerCase()))
                        .map(item => {
                          const isExcluded = excludedItemIds.includes(item.id);
                          const toggle = () => {
                            setExcludedItemIds(prev =>
                              isExcluded ? prev.filter(id => id !== item.id) : [...prev, item.id]
                            );
                          };
                          return (
                            <label
                              key={item.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                                isExcluded
                                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                                  : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)]'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Package className="w-3.5 h-3.5 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                                <span className="font-semibold truncate text-[var(--text-main,#E0E3E6)]">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isExcluded && (
                                  <span className="text-[10px] font-bold text-rose-400">
                                    {language === 'hu' ? 'Kizárva' : 'Excluded'}
                                  </span>
                                )}
                                <input
                                  type="checkbox"
                                  checked={isExcluded}
                                  onChange={toggle}
                                  className="w-4 h-4 accent-rose-500 rounded"
                                />
                              </div>
                            </label>
                          );
                        })}
                      {sharedItems.length === 0 && (
                        <p className="text-xs text-[var(--text-sub,#B5BDC6)] italic py-2 text-center">
                          {language === 'hu' ? 'Nincsenek közös tárgyak a háztartásban.' : 'No shared items in household.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border-color,#56616D)]">
              <button
                type="button"
                onClick={() => setSharingMember(null)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] rounded-xl transition"
              >
                {language === 'hu' ? 'Mégse' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveMemberSharing}
                className="px-5 py-2 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {language === 'hu' ? 'Beállítások Mentése' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
