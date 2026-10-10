import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, AlertTriangle, CheckCircle, Clock, Plus, Trash2, ShieldCheck, DollarSign, Package } from 'lucide-react';
import type { RepairStatus, RepairUrgency } from '../types';

export const RepairsView: React.FC = () => {
  const { items, repairs, addRepair, updateRepairStatus, deleteRepair, t, setSelectedItemId, language } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New repair form state
  const [selectedItemIdForm, setSelectedItemIdForm] = useState<string>('');
  const [faultTitle, setFaultTitle] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [urgency, setUrgency] = useState<RepairUrgency>('medium');
  const [stillUsable, setStillUsable] = useState(false);
  const [notes, setNotes] = useState('');
  const [repairerName, setRepairerName] = useState('');
  const [partsCost, setPartsCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [isWarranty, setIsWarranty] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleCreateRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemIdForm || !faultTitle) return;

    await addRepair({
      item_id: selectedItemIdForm,
      fault_title: faultTitle,
      fault_description: faultDescription,
      reported_date: new Date().toISOString().split('T')[0],
      urgency,
      still_usable: stillUsable,
      status: 'pending',
      repairer_name: repairerName || undefined,
      parts_cost: partsCost || 0,
      labor_cost: laborCost || 0,
      total_cost: (partsCost || 0) + (laborCost || 0),
      is_warranty: isWarranty,
      notes: notes || undefined,
    });

    setIsModalOpen(false);
    // Reset form
    setSelectedItemIdForm('');
    setFaultTitle('');
    setFaultDescription('');
    setUrgency('medium');
    setStillUsable(false);
    setNotes('');
    setRepairerName('');
    setPartsCost(0);
    setLaborCost(0);
    setIsWarranty(false);
  };

  const filteredRepairs = repairs.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const pendingCount = repairs.filter(r => r.status === 'pending').length;
  const inProgressCount = repairs.filter(r => r.status === 'in_progress').length;
  const completedCount = repairs.filter(r => r.status === 'completed').length;
  const totalRepairCost = repairs.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  const getUrgencyBadge = (urg: RepairUrgency) => {
    switch (urg) {
      case 'urgent':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">{language === 'hu' ? 'Sürgős' : 'Urgent'}</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">{language === 'hu' ? 'Magas' : 'High'}</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-primary-blue,#2563EB)]/10 text-[var(--color-primary-blue,#2563EB)] border border-[var(--color-primary-blue,#2563EB)]/30">{language === 'hu' ? 'Normál' : 'Medium'}</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)]">{language === 'hu' ? 'Alacsony' : 'Low'}</span>;
    }
  };

  const getStatusBadge = (st: RepairStatus) => {
    switch (st) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> {language === 'hu' ? 'Javításra vár' : 'Pending'}</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-medium rounded-md bg-[var(--color-primary-blue,#2563EB)]/10 text-[var(--color-primary-blue,#2563EB)] border border-[var(--color-primary-blue,#2563EB)]/30 flex items-center gap-1"><Wrench className="w-3 h-3 animate-spin" /> {language === 'hu' ? 'Javítás alatt' : 'In Progress'}</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'hu' ? 'Javítva' : 'Repaired'}</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-medium rounded-md bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)]">{language === 'hu' ? 'Törölve' : 'Cancelled'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
            <Wrench className="w-7 h-7 text-[var(--color-primary-blue,#2563EB)]" />
            {language === 'hu' ? 'Hibák & Javításkezelés' : 'Repairs & Maintenance'}
          </h1>
          <p className="text-[var(--text-sub,#B5BDC6)] text-sm mt-1">
            {language === 'hu'
              ? 'Kövesd nyomon a hibás tárgyakat, szervizfolyamatokat és javítási költségeket.'
              : 'Track faulty items, service workflows, and maintenance costs.'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          {language === 'hu' ? 'Hiba bejelentése' : 'Report Issue'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-[14px] border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Javításra vár' : 'Awaiting Repair'}</p>
            <p className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-[14px] border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--color-primary-blue,#2563EB)]/10 text-[var(--color-primary-blue,#2563EB)] border border-[var(--color-primary-blue,#2563EB)]/20 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Javítás alatt' : 'In Progress'}</p>
            <p className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{inProgressCount}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-[14px] border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Elvégezve' : 'Completed'}</p>
            <p className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{completedCount}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-[14px] border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Összes ráfordítás' : 'Total Expenses'}</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalRepairCost)}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color,#56616D)] pb-2 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm font-bold'
              : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)]'
          }`}
        >
          {language === 'hu' ? 'Összes' : 'All'} ({repairs.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
            filterStatus === 'pending'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)]'
          }`}
        >
          {language === 'hu' ? 'Javításra vár' : 'Pending'} ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('in_progress')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
            filterStatus === 'in_progress'
              ? 'bg-[var(--color-primary-blue,#2563EB)] text-white font-bold shadow-sm'
              : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)]'
          }`}
        >
          {language === 'hu' ? 'Javítás alatt' : 'In Progress'} ({inProgressCount})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
            filterStatus === 'completed'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
              : 'text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)]'
          }`}
        >
          {language === 'hu' ? 'Javítva' : 'Repaired'} ({completedCount})
        </button>
      </div>

      {/* Repairs List */}
      {filteredRepairs.length === 0 ? (
        <div className="bg-[var(--card-bg,#3A4551)]/40 rounded-[14px] border border-[var(--border-color,#56616D)] p-12 text-center">
          <Wrench className="w-12 h-12 text-[var(--text-sub,#B5BDC6)]/40 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-main,#E0E3E6)] mb-1">
            {language === 'hu' ? 'Nincs megjeleníthető javítás' : 'No repairs found'}
          </h3>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] max-w-md mx-auto mb-4">
            {language === 'hu'
              ? 'Jelenleg nincs a szűrőnek megfelelő bejelentett hiba vagy javítási rekord.'
              : 'No repair records currently match your selected status.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-blue,#2563EB)] text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            {language === 'hu' ? 'Új hiba bejelentése' : 'Report New Issue'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepairs.map((repair) => {
            const item = items.find(i => i.id === repair.item_id);

            return (
              <div
                key={repair.id}
                className="bg-[var(--card-bg,#3A4551)] rounded-[14px] border border-[var(--border-color,#56616D)] shadow-sm hover:border-[var(--color-primary-blue,#2563EB)]/60 transition p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-lg">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <button
                          onClick={() => setSelectedItemId(repair.item_id)}
                          className="font-bold text-[var(--text-main,#E0E3E6)] hover:text-[var(--color-primary-blue,#2563EB)] transition text-left"
                        >
                          {item ? item.name : (language === 'hu' ? 'Ismeretlen tárgy' : 'Unknown Item')}
                        </button>
                        <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                          {language === 'hu' ? 'Bejelentve:' : 'Reported:'} {repair.reported_date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getUrgencyBadge(repair.urgency)}
                      {getStatusBadge(repair.status)}
                    </div>
                  </div>

                  <div className="bg-[var(--surface-bg,#465362)]/40 rounded-xl p-3 my-3 space-y-1.5 text-sm border border-[var(--border-color,#56616D)]/50">
                    <p className="font-semibold text-[var(--text-main,#E0E3E6)]">{repair.fault_title}</p>
                    {repair.fault_description && (
                      <p className="text-[var(--text-sub,#B5BDC6)] text-xs leading-relaxed">{repair.fault_description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-sub,#B5BDC6)] mb-2">
                    {repair.repairer_name && (
                      <div>
                        <span className="text-[var(--text-sub,#B5BDC6)]/70">{language === 'hu' ? 'Szerelő / Szerviz:' : 'Service provider:'}</span>{' '}
                        <span className="font-medium text-[var(--text-main,#E0E3E6)]">{repair.repairer_name}</span>
                      </div>
                    )}
                    {repair.expected_completion && (
                      <div>
                        <span className="text-[var(--text-sub,#B5BDC6)]/70">{language === 'hu' ? 'Várható kész:' : 'Expected by:'}</span>{' '}
                        <span className="font-medium text-[var(--text-main,#E0E3E6)]">{repair.expected_completion}</span>
                      </div>
                    )}
                    {repair.is_warranty && (
                      <div className="col-span-2 flex items-center gap-1 text-emerald-400 font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        {language === 'hu' ? 'Garanciális javítás' : 'Warranty Repair'}
                      </div>
                    )}
                  </div>

                  {repair.total_cost > 0 && (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-400 mt-2">
                      <span>{language === 'hu' ? 'Javítási költség:' : 'Repair Cost:'}</span>
                      <span className="font-bold text-sm text-emerald-400">{formatCurrency(repair.total_cost)}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {repair.status === 'pending' && (
                      <button
                        onClick={() => updateRepairStatus(repair.id, 'in_progress')}
                        className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-primary-blue,#2563EB)]/20 text-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)] hover:text-white rounded-lg transition"
                      >
                        {language === 'hu' ? 'Javítás indítása' : 'Start Repair'}
                      </button>
                    )}
                    {repair.status === 'in_progress' && (
                      <button
                        onClick={() => updateRepairStatus(repair.id, 'completed')}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg transition"
                      >
                        {language === 'hu' ? 'Javítás lezárása' : 'Complete Repair'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRepair(repair.id)}
                    className="p-1.5 text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-[var(--surface-bg,#465362)] rounded-lg transition"
                    title={language === 'hu' ? 'Törlés' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Repair Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-[var(--card-bg,#3A4551)] rounded-[14px] border border-[var(--border-color,#56616D)] max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <h2 className="text-xl font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              {language === 'hu' ? 'Hiba bejelentése / Új javítás' : 'Report Issue / New Repair'}
            </h2>

            <form onSubmit={handleCreateRepair} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Érintett tárgy *' : 'Affected Item *'}
                </label>
                <select
                  required
                  value={selectedItemIdForm}
                  onChange={(e) => setSelectedItemIdForm(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                >
                  <option value="">{language === 'hu' ? '-- Válassz tárgyat --' : '-- Select Item --'}</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Mi hibásodott meg? *' : 'Fault Title / Issue *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'hu' ? 'Pl. Tokmány nem szorít, akku nem tölt' : 'e.g. Chuck slipping, battery not charging'}
                  value={faultTitle}
                  onChange={(e) => setFaultTitle(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Hiba részletes leírása' : 'Detailed Description'}
                </label>
                <textarea
                  rows={3}
                  placeholder={language === 'hu' ? 'Milyen körülmények között jelentkezett?' : 'Describe what happened...'}
                  value={faultDescription}
                  onChange={(e) => setFaultDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Prioritás' : 'Priority'}
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as RepairUrgency)}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                  >
                    <option value="low">{language === 'hu' ? 'Alacsony' : 'Low'}</option>
                    <option value="medium">{language === 'hu' ? 'Normál' : 'Medium'}</option>
                    <option value="high">{language === 'hu' ? 'Magas' : 'High'}</option>
                    <option value="urgent">{language === 'hu' ? 'Sürgős' : 'Urgent'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Szerelő / Szerviz' : 'Repairer / Service'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'hu' ? 'Pl. Szaki Kft.' : 'e.g. Local Tech'}
                    value={repairerName}
                    onChange={(e) => setRepairerName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Alkatrész költség (Ft)' : 'Parts Cost (HUF)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={partsCost || ''}
                    onChange={(e) => setPartsCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Munkadíj (Ft)' : 'Labor Cost (HUF)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={laborCost || ''}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main,#E0E3E6)] font-medium">
                  <input
                    type="checkbox"
                    checked={isWarranty}
                    onChange={(e) => setIsWarranty(e.target.checked)}
                    className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] rounded accent-[var(--color-primary-blue,#2563EB)]"
                  />
                  {language === 'hu' ? 'Garanciális javítás' : 'Warranty Repair'}
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main,#E0E3E6)] font-medium">
                  <input
                    type="checkbox"
                    checked={stillUsable}
                    onChange={(e) => setStillUsable(e.target.checked)}
                    className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] rounded accent-[var(--color-primary-blue,#2563EB)]"
                  />
                  {language === 'hu' ? 'Még használható' : 'Still usable'}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color,#56616D)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)] font-medium transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold shadow-md transition"
                >
                  {language === 'hu' ? 'Mentés' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
