import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Handshake,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  User,
  Phone,
  Mail,
  Search,
  Package,
  X,
  Edit2,
  ArrowRight
} from 'lucide-react';
import type { ItemLoan, LoanStatus } from '../types';

export const LendingView: React.FC = () => {
  const { items, loans, addLoan, updateLoan, returnLoan, deleteLoan, setSelectedItemId, language } = useApp();
  const isHu = language === 'hu';

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<ItemLoan | null>(null);

  // Form states
  const [formItemId, setFormItemId] = useState('');
  const [formBorrowerName, setFormBorrowerName] = useState('');
  const [formBorrowerContact, setFormBorrowerContact] = useState('');
  const [formBorrowerEmail, setFormBorrowerEmail] = useState('');
  const [formLentDate, setFormLentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formExpectedReturnDate, setFormExpectedReturnDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute stats
  const stats = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let returned = 0;
    let totalLentValue = 0;

    loans.forEach(loan => {
      const isOverdue = loan.status === 'active' && loan.expected_return_date && loan.expected_return_date < todayStr;
      if (loan.status === 'returned') {
        returned++;
      } else if (isOverdue || loan.status === 'overdue') {
        overdue++;
        active++;
      } else {
        active++;
      }

      const item = items.find(i => i.id === loan.item_id);
      if (loan.status === 'active') {
        totalLentValue += (item?.current_value ?? item?.purchase_price ?? 0);
      }
    });

    return { active, overdue, returned, totalLentValue };
  }, [loans, items, todayStr]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const isOverdue = loan.status === 'active' && loan.expected_return_date && loan.expected_return_date < todayStr;
      const actualStatus = isOverdue ? 'overdue' : loan.status;

      // Status filter
      if (activeTab === 'active' && actualStatus === 'returned') return false;
      if (activeTab === 'overdue' && actualStatus !== 'overdue') return false;
      if (activeTab === 'returned' && actualStatus !== 'returned') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const item = items.find(i => i.id === loan.item_id);
        const itemName = (item?.name || '').toLowerCase();
        const borrower = loan.borrower_name.toLowerCase();
        const contact = (loan.borrower_contact || '').toLowerCase();
        const notes = (loan.notes || '').toLowerCase();

        return itemName.includes(query) || borrower.includes(query) || contact.includes(query) || notes.includes(query);
      }

      return true;
    });
  }, [loans, items, activeTab, searchQuery, todayStr]);

  const handleOpenAddModal = () => {
    setEditingLoan(null);
    setFormItemId(items.length > 0 ? items[0].id : '');
    setFormBorrowerName('');
    setFormBorrowerContact('');
    setFormBorrowerEmail('');
    setFormLentDate(new Date().toISOString().split('T')[0]);
    setFormExpectedReturnDate('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loan: ItemLoan) => {
    setEditingLoan(loan);
    setFormItemId(loan.item_id);
    setFormBorrowerName(loan.borrower_name);
    setFormBorrowerContact(loan.borrower_contact || '');
    setFormBorrowerEmail(loan.borrower_email || '');
    setFormLentDate(loan.lent_date || new Date().toISOString().split('T')[0]);
    setFormExpectedReturnDate(loan.expected_return_date || '');
    setFormNotes(loan.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemId || !formBorrowerName.trim()) return;

    if (editingLoan) {
      await updateLoan(editingLoan.id, {
        item_id: formItemId,
        borrower_name: formBorrowerName.trim(),
        borrower_contact: formBorrowerContact.trim() || undefined,
        borrower_email: formBorrowerEmail.trim() || undefined,
        lent_date: formLentDate,
        expected_return_date: formExpectedReturnDate || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      await addLoan({
        user_id: '',
        item_id: formItemId,
        borrower_name: formBorrowerName.trim(),
        borrower_contact: formBorrowerContact.trim() || undefined,
        borrower_email: formBorrowerEmail.trim() || undefined,
        lent_date: formLentDate,
        expected_return_date: formExpectedReturnDate || undefined,
        status: 'active',
        notes: formNotes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: isHu ? 'HUF' : 'EUR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
              <Handshake className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
              {isHu ? 'Kölcsönadott tárgyak' : 'Lending Tracker'}
            </h1>
          </div>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-1">
            {isHu
              ? 'Tartsd számon, hogy melyik tárgyadat kinek adtad kölcsön, és mikorra várod vissza.'
              : 'Track who borrowed your items, return deadlines, and overdue alerts.'}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-sm shadow-md transition-all self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{isHu ? 'Új kölcsönadás' : 'New Loan'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active loans */}
        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Kölcsönben lévő' : 'Currently Lent'}
            </span>
            <div className="p-2 rounded-lg bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{stats.active}</span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'tárgy' : 'items'}</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Késedelmes' : 'Overdue'}
            </span>
            <div className="p-2 rounded-lg bg-[var(--status-danger,#EF4444)]/15 text-[var(--status-danger,#EF4444)]">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-black ${stats.overdue > 0 ? 'text-[var(--status-danger,#EF4444)]' : 'text-[var(--text-main,#E0E3E6)]'}`}>
              {stats.overdue}
            </span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'határidőn túli' : 'past deadline'}</span>
          </div>
        </div>

        {/* Returned */}
        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Visszahozva' : 'Returned'}
            </span>
            <div className="p-2 rounded-lg bg-[var(--status-success,#10B981)]/15 text-[var(--status-success,#10B981)]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[var(--status-success,#10B981)]">{stats.returned}</span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'lezárt kölcsönzés' : 'completed'}</span>
          </div>
        </div>

        {/* Total Lent Value */}
        <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
              {isHu ? 'Kölcsönadott érték' : 'Lent Inventory Value'}
            </span>
            <div className="p-2 rounded-lg bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-[var(--text-main,#E0E3E6)]">{formatCurrency(stats.totalLentValue)}</span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] overflow-x-auto">
          {(['all', 'active', 'overdue', 'returned'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                  : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
              }`}
            >
              {tab === 'all' && (isHu ? 'Összes' : 'All')}
              {tab === 'active' && (isHu ? 'Aktív' : 'Active')}
              {tab === 'overdue' && (isHu ? `Késedelmes (${stats.overdue})` : `Overdue (${stats.overdue})`)}
              {tab === 'returned' && (isHu ? 'Visszahozva' : 'Returned')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isHu ? 'Keresés partner, tárgy szerint...' : 'Search borrower or item...'}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
          />
        </div>
      </div>

      {/* Loan Cards List */}
      {filteredLoans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--surface-bg,#465362)] flex items-center justify-center text-[var(--text-sub,#B5BDC6)]">
            <Handshake className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
            {isHu ? 'Nincs megjeleníthető kölcsönadás' : 'No loans found'}
          </h3>
          <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
            {isHu
              ? 'Rögzítsd az első kölcsönadást a fenti gombra kattintva, és sosem felejted el, kinél van a felszerelésed.'
              : 'Add your first loan using the button above to easily track lent items.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map(loan => {
            const item = items.find(i => i.id === loan.item_id);
            const isOverdue = loan.status === 'active' && loan.expected_return_date && loan.expected_return_date < todayStr;
            const isReturned = loan.status === 'returned';

            return (
              <div
                key={loan.id}
                className={`p-5 rounded-[16px] border bg-[var(--card-bg,#3A4551)] flex flex-col justify-between transition-all shadow-sm ${
                  isOverdue
                    ? 'border-[var(--status-danger,#EF4444)]/60 bg-[var(--status-danger,#EF4444)]/5'
                    : isReturned
                    ? 'border-[var(--border-color,#56616D)]/50 opacity-80'
                    : 'border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)]/50'
                }`}
              >
                <div>
                  {/* Card Header: Item info & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => item && setSelectedItemId(item.id)}
                      className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[var(--surface-bg,#465362)] overflow-hidden shrink-0 flex items-center justify-center border border-[var(--border-color,#56616D)]">
                        {item?.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-[var(--text-sub,#B5BDC6)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] truncate group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors">
                          {item?.name || (isHu ? 'Ismeretlen tárgy' : 'Unknown item')}
                        </h4>
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] truncate">
                          {item?.current_value ? formatCurrency(item.current_value) : item?.purchase_price ? formatCurrency(item.purchase_price) : ''}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {isReturned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--status-success,#10B981)]/15 text-[var(--status-success,#10B981)] border border-[var(--status-success,#10B981)]/30">
                          <CheckCircle2 className="h-3 w-3" />
                          {isHu ? 'Visszahozva' : 'Returned'}
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--status-danger,#EF4444)]/15 text-[var(--status-danger,#EF4444)] border border-[var(--status-danger,#EF4444)]/30 animate-pulse">
                          <AlertCircle className="h-3 w-3" />
                          {isHu ? 'Késedelmes' : 'Overdue'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)] border border-[var(--color-primary-blue,#2563EB)]/30">
                          <Clock className="h-3 w-3" />
                          {isHu ? 'Kölcsönben' : 'Active'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Borrower Details */}
                  <div className="mt-4 p-3 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main,#E0E3E6)]">
                      <User className="h-3.5 w-3.5 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      <span className="truncate">{loan.borrower_name}</span>
                    </div>

                    {loan.borrower_contact && (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-sub,#B5BDC6)]">
                        <Phone className="h-3.5 w-3.5 text-[var(--text-sub,#B5BDC6)] shrink-0" />
                        <a href={`tel:${loan.borrower_contact}`} className="hover:underline truncate">
                          {loan.borrower_contact}
                        </a>
                      </div>
                    )}

                    {loan.borrower_email && (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-sub,#B5BDC6)]">
                        <Mail className="h-3.5 w-3.5 text-[var(--text-sub,#B5BDC6)] shrink-0" />
                        <a href={`mailto:${loan.borrower_email}`} className="hover:underline truncate">
                          {loan.borrower_email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-[var(--surface-bg,#465362)]/40">
                      <span className="text-[var(--text-sub,#B5BDC6)] block text-[10px] uppercase font-semibold">
                        {isHu ? 'Kölcsönadva' : 'Lent date'}
                      </span>
                      <span className="font-bold text-[var(--text-main,#E0E3E6)] mt-0.5 block">
                        {loan.lent_date}
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg ${isOverdue ? 'bg-[var(--status-danger,#EF4444)]/10 text-[var(--status-danger,#EF4444)]' : 'bg-[var(--surface-bg,#465362)]/40'}`}>
                      <span className="text-[var(--text-sub,#B5BDC6)] block text-[10px] uppercase font-semibold">
                        {isHu ? 'Várható visszahozás' : 'Expected return'}
                      </span>
                      <span className={`font-bold mt-0.5 block ${isOverdue ? 'text-[var(--status-danger,#EF4444)]' : 'text-[var(--text-main,#E0E3E6)]'}`}>
                        {loan.expected_return_date || (isHu ? 'Nincs megadva' : 'Not set')}
                      </span>
                    </div>
                  </div>

                  {loan.notes && (
                    <p className="mt-3 text-xs text-[var(--text-sub,#B5BDC6)] italic line-clamp-2">
                      „{loan.notes}”
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-between gap-2">
                  {!isReturned ? (
                    <button
                      onClick={() => returnLoan(loan.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[var(--status-success,#10B981)]/20 hover:bg-[var(--status-success,#10B981)] text-[var(--status-success,#10B981)] hover:text-white font-bold text-xs transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{isHu ? 'Visszahozva' : 'Mark Returned'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-[var(--status-success,#10B981)] font-medium">
                      {isHu ? `Visszahozva: ${loan.actual_return_date || 'Igen'}` : `Returned: ${loan.actual_return_date || 'Yes'}`}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(loan)}
                      className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)] transition-colors"
                      title={isHu ? 'Szerkesztés' : 'Edit'}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(isHu ? 'Biztosan törölni szeretnéd ezt a kölcsönzési rekordot?' : 'Are you sure you want to delete this loan record?')) {
                          deleteLoan(loan.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[var(--status-danger,#EF4444)]/80 hover:text-[var(--status-danger,#EF4444)] hover:bg-[var(--status-danger,#EF4444)]/10 transition-colors"
                      title={isHu ? 'Törlés' : 'Delete'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New / Edit Loan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)]">
              <div className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
                <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                  {editingLoan
                    ? (isHu ? 'Kölcsönadás szerkesztése' : 'Edit Loan')
                    : (isHu ? 'Új kölcsönadás rögzítése' : 'Log New Loan')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Item Select */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Kölcsönadott tárgy *' : 'Lent Item *'}
                </label>
                <select
                  value={formItemId}
                  onChange={e => setFormItemId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                >
                  <option value="" disabled>{isHu ? 'Válassz tárgyat...' : 'Select an item...'}</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Borrower Name */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Kölcsönvevő neve *' : 'Borrower Name *'}
                </label>
                <input
                  type="text"
                  value={formBorrowerName}
                  onChange={e => setFormBorrowerName(e.target.value)}
                  placeholder={isHu ? 'Pl. Kovács Péter' : 'e.g. John Doe'}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {/* Contact info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Telefonszám' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formBorrowerContact}
                    onChange={e => setFormBorrowerContact(e.target.value)}
                    placeholder={isHu ? '+36 30 123 4567' : '+1 555 123 4567'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'E-mail cím' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={formBorrowerEmail}
                    onChange={e => setFormBorrowerEmail(e.target.value)}
                    placeholder="pelda@email.hu"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>

              {/* Dates grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Kölcsönadás dátuma *' : 'Lent Date *'}
                  </label>
                  <input
                    type="date"
                    value={formLentDate}
                    onChange={e => setFormLentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Várható visszahozás' : 'Expected Return'}
                  </label>
                  <input
                    type="date"
                    value={formExpectedReturnDate}
                    onChange={e => setFormExpectedReturnDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Megjegyzések, állapot' : 'Notes & Condition'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder={isHu ? 'Pl. Kofferben, 2 akkumulátorral és töltővel átadva.' : 'e.g. Lent in original carrying case.'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)] transition-colors"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white shadow-md transition-all"
                >
                  {editingLoan ? (isHu ? 'Mentés' : 'Save Changes') : (isHu ? 'Kölcsönadás rögzítése' : 'Confirm Loan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
