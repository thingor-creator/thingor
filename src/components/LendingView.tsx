import React, { useState, useMemo, useEffect } from 'react';
import { useApp, useModalBack } from '../context/AppContext';
import {
  Handshake,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  User,
  Phone,
  Mail,
  Search,
  Package,
  X,
  Edit2,
  Copy,
  Check,
  Users,
  Share2,
  ChevronRight
} from 'lucide-react';
import type { ItemLoan, LendingContact, Item } from '../types';

export const LendingView: React.FC = () => {
  const {
    items,
    updateItem,
    loans,
    addLoan,
    updateLoan,
    returnLoan,
    deleteLoan,
    lendingContacts,
    addLendingContact,
    updateLendingContact,
    deleteLendingContact,
    setSelectedItemId,
    language
  } = useApp();

  const isHu = language === 'hu';

  // Navigation tab
  const [mainTab, setMainTab] = useState<'loans' | 'lendable' | 'contacts'>('loans');

  // Loans sub-filter
  const [activeLoanTab, setActiveLoanTab] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loan Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  // Listen for FAB central "+" action
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ view?: string }>;
      if (!customEvent.detail || customEvent.detail.view === 'lending') {
        if (mainTab === 'contacts') {
          handleOpenAddContact();
        } else {
          handleOpenAddLoanModal();
        }
      }
    };
    window.addEventListener('thingor-open-add', handleTrigger);
    return () => window.removeEventListener('thingor-open-add', handleTrigger);
  }, [mainTab]);
  const [editingLoan, setEditingLoan] = useState<ItemLoan | null>(null);
  const [formItemId, setFormItemId] = useState('');
  const [formBorrowerName, setFormBorrowerName] = useState('');
  const [formBorrowerContact, setFormBorrowerContact] = useState('');
  const [formBorrowerEmail, setFormBorrowerEmail] = useState('');
  const [formLentDate, setFormLentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formExpectedReturnDate, setFormExpectedReturnDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saveToContacts, setSaveToContacts] = useState(false);

  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<LendingContact | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [contactRelationship, setContactRelationship] = useState(isHu ? 'Barát' : 'Friend');
  const [contactNotes, setContactNotes] = useState('');

  // Editing lendable terms modal/inline
  const [editingTermsItemId, setEditingTermsItemId] = useState<string | null>(null);
  const [termsInput, setTermsInput] = useState('');

  // Mobile back button traps: closing modals on back button without changing route
  useModalBack(isLoanModalOpen, () => setIsLoanModalOpen(false), 'lending-loan-modal');
  useModalBack(isContactModalOpen, () => setIsContactModalOpen(false), 'lending-contact-modal');
  useModalBack(editingTermsItemId !== null, () => setEditingTermsItemId(null), 'lending-terms-modal');

  // Feedback toast for clipboard
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const showCopiedToast = (msg: string) => {
    setCopiedNotice(msg);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  // Lendable items
  const lendableItems = useMemo(() => {
    return items.filter(i => Boolean(i.is_lendable));
  }, [items]);

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

    return { active, overdue, returned, totalLentValue, lendableCount: lendableItems.length };
  }, [loans, items, todayStr, lendableItems.length]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const isOverdue = loan.status === 'active' && loan.expected_return_date && loan.expected_return_date < todayStr;
      const actualStatus = isOverdue ? 'overdue' : loan.status;

      // Status filter
      if (activeLoanTab === 'active' && actualStatus === 'returned') return false;
      if (activeLoanTab === 'overdue' && actualStatus !== 'overdue') return false;
      if (activeLoanTab === 'returned' && actualStatus !== 'returned') return false;

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
  }, [loans, items, activeLoanTab, searchQuery, todayStr]);

  // Filtered lendable view items
  const filteredInventoryForLending = useMemo(() => {
    let list = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || (i.lending_terms || '').toLowerCase().includes(q));
    }
    return list;
  }, [items, searchQuery]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return lendingContacts;
    const q = searchQuery.toLowerCase();
    return lendingContacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.contact_info || '').toLowerCase().includes(q) ||
      (c.relationship || '').toLowerCase().includes(q)
    );
  }, [lendingContacts, searchQuery]);

  // Handle open loan modal
  const handleOpenAddLoanModal = (preselectedItemId?: string, preselectedContact?: LendingContact) => {
    setEditingLoan(null);
    setFormItemId(preselectedItemId || (items.length > 0 ? items[0].id : ''));
    if (preselectedContact) {
      setFormBorrowerName(preselectedContact.name);
      setFormBorrowerContact(preselectedContact.contact_info || '');
      setFormBorrowerEmail('');
    } else {
      setFormBorrowerName('');
      setFormBorrowerContact('');
      setFormBorrowerEmail('');
    }
    setFormLentDate(new Date().toISOString().split('T')[0]);
    setFormExpectedReturnDate('');
    setFormNotes('');
    setSaveToContacts(false);
    setIsLoanModalOpen(true);
  };

  const handleOpenEditLoanModal = (loan: ItemLoan) => {
    setEditingLoan(loan);
    setFormItemId(loan.item_id);
    setFormBorrowerName(loan.borrower_name);
    setFormBorrowerContact(loan.borrower_contact || '');
    setFormBorrowerEmail(loan.borrower_email || '');
    setFormLentDate(loan.lent_date || new Date().toISOString().split('T')[0]);
    setFormExpectedReturnDate(loan.expected_return_date || '');
    setFormNotes(loan.notes || '');
    setSaveToContacts(false);
    setIsLoanModalOpen(true);
  };

  // Submit loan
  const handleSubmitLoan = async (e: React.FormEvent) => {
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

      // Optionally save to contacts if checked and not already present
      if (saveToContacts && formBorrowerName.trim()) {
        const exists = lendingContacts.some(c => c.name.toLowerCase() === formBorrowerName.trim().toLowerCase());
        if (!exists) {
          await addLendingContact({
            user_id: '',
            name: formBorrowerName.trim(),
            contact_info: formBorrowerContact.trim() || formBorrowerEmail.trim() || undefined,
            relationship: isHu ? 'Ismerős' : 'Contact',
            notes: formNotes.trim() || undefined
          });
        }
      }
    }

    setIsLoanModalOpen(false);
  };

  // Contact modal handlers
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setContactName('');
    setContactInfo('');
    setContactRelationship(isHu ? 'Barát' : 'Friend');
    setContactNotes('');
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (c: LendingContact) => {
    setEditingContact(c);
    setContactName(c.name);
    setContactInfo(c.contact_info || '');
    setContactRelationship(c.relationship || (isHu ? 'Barát' : 'Friend'));
    setContactNotes(c.notes || '');
    setIsContactModalOpen(true);
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;

    if (editingContact) {
      await updateLendingContact(editingContact.id, {
        name: contactName.trim(),
        contact_info: contactInfo.trim() || undefined,
        relationship: contactRelationship.trim() || undefined,
        notes: contactNotes.trim() || undefined,
      });
    } else {
      await addLendingContact({
        user_id: '',
        name: contactName.trim(),
        contact_info: contactInfo.trim() || undefined,
        relationship: contactRelationship.trim() || undefined,
        notes: contactNotes.trim() || undefined,
      });
    }

    setIsContactModalOpen(false);
  };

  // Toggle item lendable status
  const handleToggleLendable = async (item: Item) => {
    const nextVal = !item.is_lendable;
    await updateItem(item.id, { is_lendable: nextVal });
  };

  // Save lending terms for item
  const handleSaveTerms = async (itemId: string) => {
    await updateItem(itemId, { lending_terms: termsInput.trim() || undefined });
    setEditingTermsItemId(null);
  };

  // Copy lendable list to clipboard
  const handleCopyLendableList = () => {
    if (lendableItems.length === 0) {
      showCopiedToast(isHu ? 'Nincs kölcsönadhatóként megjelölt eszköz!' : 'No items marked as lendable!');
      return;
    }

    const header = isHu
      ? '📦 Kölcsönkérhető eszközeim és felszereléseim (Thingor):\n\n'
      : '📦 My Lendable Tools & Equipment (Thingor):\n\n';

    const body = lendableItems.map((item, idx) => {
      let line = `${idx + 1}. ${item.name}`;
      if (item.lending_terms) {
        line += `\n   • ${isHu ? 'Feltételek' : 'Terms'}: ${item.lending_terms}`;
      }
      return line;
    }).join('\n\n');

    const footer = isHu
      ? '\n\n👉 Ha bármelyikre szükséged lenne, keress meg bátran!'
      : '\n\n👉 Let me know if you would like to borrow any of these!';

    navigator.clipboard.writeText(header + body + footer);
    showCopiedToast(isHu ? 'Kölcsönadható lista vágólapra másolva!' : 'Lendable items list copied to clipboard!');
  };

  // Copy single loan reminder
  const handleCopyLoanDetails = (loan: ItemLoan) => {
    const item = items.find(i => i.id === loan.item_id);
    const itemName = item?.name || (isHu ? 'Tárgy' : 'Item');

    const text = isHu
      ? `📋 Kölcsönzési emlékeztető:\n` +
        `• Tárgy: ${itemName}\n` +
        `• Kölcsönvevő: ${loan.borrower_name}${loan.borrower_contact ? ` (${loan.borrower_contact})` : ''}\n` +
        `• Átadás dátuma: ${loan.lent_date}\n` +
        `• Várható visszahozatal: ${loan.expected_return_date || 'Nincs megadva'}\n` +
        (loan.notes ? `• Megjegyzés: ${loan.notes}\n` : '')
      : `📋 Loan Reminder:\n` +
        `• Item: ${itemName}\n` +
        `• Borrower: ${loan.borrower_name}${loan.borrower_contact ? ` (${loan.borrower_contact})` : ''}\n` +
        `• Date lent: ${loan.lent_date}\n` +
        `• Return due: ${loan.expected_return_date || 'Not set'}\n` +
        (loan.notes ? `• Notes: ${loan.notes}\n` : '');

    navigator.clipboard.writeText(text);
    showCopiedToast(isHu ? 'Kölcsönzés részletei vágólapra másolva!' : 'Loan reminder copied to clipboard!');
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
      {/* Toast notification banner */}
      {copiedNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-2xl animate-fade-in">
          <Check className="h-4 w-4" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
              <Handshake className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
                {isHu ? 'Kölcsönadás & Tárgykölcsönzés' : 'Lending & Borrowing'}
              </h1>
              <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-0.5">
                {isHu
                  ? 'Kölcsönadható eszközök kezelése, határidők és baráti kapcsolatok nyilvántartása.'
                  : 'Track lent equipment, due dates, lendable inventory, and contact directory.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
          {mainTab === 'lendable' && (
            <button
              onClick={handleCopyLendableList}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] font-bold text-xs border border-[var(--border-color,#56616D)] transition-all shadow-sm"
            >
              <Copy className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
              <span>{isHu ? 'Lista másolása (Messenger/WhatsApp)' : 'Copy List'}</span>
            </button>
          )}

          {mainTab === 'contacts' ? (
            <button
              onClick={handleOpenAddContact}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>{isHu ? 'Új partner hozzáadása' : 'Add Contact'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenAddLoanModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>{isHu ? 'Kölcsönadás rögzítése' : 'New Loan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color,#56616D)]/50 pb-2 overflow-x-auto">
        <button
          onClick={() => { setMainTab('loans'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            mainTab === 'loans'
              ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
              : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>{isHu ? `Kiadott tárgyak naplója (${stats.active})` : `Active Loans (${stats.active})`}</span>
        </button>

        <button
          onClick={() => { setMainTab('lendable'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            mainTab === 'lendable'
              ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
              : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]'
          }`}
        >
          <Share2 className="h-4 w-4" />
          <span>{isHu ? `Kölcsönadható eszközeim (${stats.lendableCount})` : `Lendable Items (${stats.lendableCount})`}</span>
        </button>

        <button
          onClick={() => { setMainTab('contacts'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            mainTab === 'contacts'
              ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
              : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{isHu ? `Ismerősök & Névjegyzék (${lendingContacts.length})` : `Contacts (${lendingContacts.length})`}</span>
        </button>
      </div>

      {/* TAB 1: LOANS LOG */}
      {mainTab === 'loans' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Sub Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center p-1 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] overflow-x-auto">
              {(['all', 'active', 'overdue', 'returned'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveLoanTab(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeLoanTab === tab
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

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isHu ? 'Keresés partner vagy tárgy szerint...' : 'Search borrower or item...'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
            </div>
          </div>

          {/* Loans Grid */}
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
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          onClick={() => item && setSelectedItemId(item.id)}
                          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                        >
                          <div className="w-11 h-11 rounded-xl bg-[var(--surface-bg,#465362)] overflow-hidden shrink-0 flex items-center justify-center border border-[var(--border-color,#56616D)]">
                            {item?.photo_url ? (
                              <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
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
                          onClick={() => handleCopyLoanDetails(loan)}
                          className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)] transition-colors"
                          title={isHu ? 'Részletek másolása' : 'Copy details'}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditLoanModal(loan)}
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
        </div>
      )}

      {/* TAB 2: LENDABLE INVENTORY */}
      {mainTab === 'lendable' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
              {isHu
                ? 'Jelöld be azokat a tárgyaidat, amelyeket szívesen kölcsönadsz ismerősöknek vagy szomszédoknak. Állíts be egyedi feltételeket (pl. visszahozatali idő, tisztaság).'
                : 'Select items from your inventory that you are willing to lend to friends, and set custom lending conditions.'}
            </p>

            <div className="relative flex-1 max-w-xs shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isHu ? 'Keresés tárgyak között...' : 'Search items...'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventoryForLending.map(item => {
              const isLendable = Boolean(item.is_lendable);
              const isEditingThisItem = editingTermsItemId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-[16px] border bg-[var(--card-bg,#3A4551)] flex flex-col justify-between transition-all ${
                    isLendable
                      ? 'border-[var(--color-primary-blue,#2563EB)]/60 bg-[var(--color-primary-blue,#2563EB)]/5'
                      : 'border-[var(--border-color,#56616D)] opacity-75'
                  }`}
                >
                  <div>
                    {/* Item header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[var(--surface-bg,#465362)] overflow-hidden shrink-0 flex items-center justify-center border border-[var(--border-color,#56616D)]">
                          {item.photo_url ? (
                            <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-[var(--text-sub,#B5BDC6)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] truncate">
                            {item.name}
                          </h4>
                          <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                            {item.current_value ? formatCurrency(item.current_value) : item.purchase_price ? formatCurrency(item.purchase_price) : ''}
                          </span>
                        </div>
                      </div>

                      {/* Toggle button */}
                      <button
                        onClick={() => handleToggleLendable(item)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isLendable
                            ? 'bg-[var(--color-primary-blue,#2563EB)] text-white'
                            : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                        }`}
                      >
                        {isLendable ? (isHu ? 'Kölcsönadható ✓' : 'Lendable ✓') : (isHu ? 'Nem kölcsönözhető' : 'Off')}
                      </button>
                    </div>

                    {/* Lending terms */}
                    {isLendable && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/50 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] uppercase">
                            {isHu ? 'Kölcsönadási feltételek' : 'Lending terms'}
                          </span>
                          {!isEditingThisItem && (
                            <button
                              onClick={() => {
                                setEditingTermsItemId(item.id);
                                setTermsInput(item.lending_terms || '');
                              }}
                              className="text-[10px] font-semibold text-[var(--color-primary-blue,#2563EB)] hover:underline"
                            >
                              {item.lending_terms ? (isHu ? 'Módosítás' : 'Edit') : (isHu ? '+ Feltétel megadása' : '+ Add terms')}
                            </button>
                          )}
                        </div>

                        {isEditingThisItem ? (
                          <div className="space-y-2 mt-1">
                            <input
                              type="text"
                              value={termsInput}
                              onChange={e => setTermsInput(e.target.value)}
                              placeholder={isHu ? 'Pl. Max 3 napra, tisztán visszahozandó' : 'e.g. Max 3 days, clean return'}
                              autoFocus
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--card-bg,#3A4551)] border border-[var(--color-primary-blue,#2563EB)] text-[var(--text-main,#E0E3E6)] focus:outline-none"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingTermsItemId(null)}
                                className="px-2 py-1 rounded text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)] hover:bg-[var(--surface-bg,#465362)]"
                              >
                                {isHu ? 'Mégse' : 'Cancel'}
                              </button>
                              <button
                                onClick={() => handleSaveTerms(item.id)}
                                className="px-3 py-1 rounded text-[11px] font-bold bg-[var(--color-primary-blue,#2563EB)] text-white hover:bg-[var(--color-primary-blue,#2563EB)]/90"
                              >
                                {isHu ? 'Mentés' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--text-main,#E0E3E6)] italic">
                            {item.lending_terms || (isHu ? 'Nincsenek különleges feltételek megadva.' : 'No terms specified.')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {isLendable && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--border-color,#56616D)]/40 flex items-center justify-end">
                      <button
                        onClick={() => handleOpenAddLoanModal(item.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-blue,#2563EB)] hover:underline"
                      >
                        <span>{isHu ? 'Kölcsönadás rögzítése' : 'Lend this item'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CONTACTS & ADDRESS BOOK */}
      {mainTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
              {isHu
                ? 'Saját, biztonságosan védett partnerlistád. A kölcsönadások rögzítésekor egyetlen kattintással kiválaszthatod a kölcsönvevőt.'
                : 'Your private lending address book. Quickly select trusted borrowers when lending items.'}
            </p>

            <div className="relative flex-1 max-w-xs shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isHu ? 'Keresés partnerek között...' : 'Search contacts...'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
            </div>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-3">
              <Users className="h-8 w-8 text-[var(--text-sub,#B5BDC6)] mx-auto" />
              <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
                {isHu ? 'A partnerlista még üres' : 'No contacts yet'}
              </h3>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
                {isHu
                  ? 'Vegyél fel ismerősöket, családtagokat vagy szomszédokat a fenti "Új partner hozzáadása" gombbal.'
                  : 'Add friends or neighbors using the button above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map(c => {
                const activeLoansForContact = loans.filter(l => l.borrower_name.toLowerCase() === c.name.toLowerCase() && l.status === 'active');

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-[16px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)] flex items-center justify-center font-bold text-sm shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] truncate">
                              {c.name}
                            </h4>
                            {c.relationship && (
                              <span className="inline-block text-[10px] font-semibold text-[var(--text-sub,#B5BDC6)] px-2 py-0.5 rounded-full bg-[var(--surface-bg,#465362)] mt-0.5">
                                {c.relationship}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditContact(c)}
                            className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                            title={isHu ? 'Szerkesztés' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(isHu ? `Biztosan törlöd ${c.name} partnerét?` : `Delete contact ${c.name}?`)) {
                                deleteLendingContact(c.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[var(--status-danger,#EF4444)]/80 hover:text-[var(--status-danger,#EF4444)] hover:bg-[var(--status-danger,#EF4444)]/10"
                            title={isHu ? 'Törlés' : 'Delete'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3.5 space-y-1.5 text-xs text-[var(--text-sub,#B5BDC6)]">
                        {c.contact_info && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{c.contact_info}</span>
                          </div>
                        )}
                        {c.notes && (
                          <p className="text-[11px] italic text-[var(--text-sub,#B5BDC6)] line-clamp-2 mt-1">
                            „{c.notes}”
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-color,#56616D)]/50 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                        {activeLoansForContact.length > 0 ? (
                          <span className="text-amber-400 font-semibold">
                            {activeLoansForContact.length} {isHu ? 'aktív kölcsön' : 'active loans'}
                          </span>
                        ) : (
                          <span>{isHu ? 'Nincs nála tárgy' : 'No active loans'}</span>
                        )}
                      </span>

                      <button
                        onClick={() => handleOpenAddLoanModal(undefined, c)}
                        className="text-xs font-bold text-[var(--color-primary-blue,#2563EB)] hover:underline flex items-center gap-1"
                      >
                        <span>{isHu ? 'Új kölcsönadás' : 'Lend item'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT LOAN */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)] shrink-0">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {editingLoan ? (isHu ? 'Kölcsönzés adatainak szerkesztése' : 'Edit Loan Details') : (isHu ? 'Új kölcsönadás rögzítése' : 'Record New Loan')}
              </h3>
              <button
                onClick={() => setIsLoanModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoan} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Item selection */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Kölcsönadott tárgy *' : 'Item to Lend *'}
                </label>
                <select
                  value={formItemId}
                  onChange={e => setFormItemId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.is_lendable ? '★ (Kölcsönözhető)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Contact Picker */}
              {lendingContacts.length > 0 && !editingLoan && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Gyorsválasztás partnerlistából' : 'Quick select from contacts'}
                  </label>
                  <select
                    onChange={e => {
                      const c = lendingContacts.find(cont => cont.id === e.target.value);
                      if (c) {
                        setFormBorrowerName(c.name);
                        setFormBorrowerContact(c.contact_info || '');
                      }
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="">{isHu ? '-- Válassz meglévő partnert (opcionális) --' : '-- Choose a contact --'}</option>
                    {lendingContacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.relationship ? `(${c.relationship})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                    {isHu ? 'Telefonszám / Kapcsolat' : 'Phone / Contact'}
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
                  {isHu ? 'Megjegyzések, tartozékok, állapot' : 'Notes & Accessories'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder={isHu ? 'Pl. Kofferben, 2 akkumulátorral és töltővel átadva.' : 'e.g. Lent in original carrying case.'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {!editingLoan && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="save_to_contacts"
                    checked={saveToContacts}
                    onChange={e => setSaveToContacts(e.target.checked)}
                    className="rounded border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)]"
                  />
                  <label htmlFor="save_to_contacts" className="text-xs font-semibold text-[var(--text-main,#E0E3E6)] cursor-pointer">
                    {isHu ? 'Partner mentése a védett névjegyzékembe' : 'Save contact to private address book'}
                  </label>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[var(--border-color,#56616D)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
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

      {/* MODAL: ADD / EDIT CONTACT */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)]">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {editingContact ? (isHu ? 'Partner adatainak szerkesztése' : 'Edit Contact') : (isHu ? 'Új partner rögzítése' : 'Add New Contact')}
              </h3>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitContact} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Név *' : 'Name *'}
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder={isHu ? 'Pl. Nagy Zoltán' : 'e.g. John Smith'}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Kapcsolat / Minőség' : 'Relationship'}
                  </label>
                  <select
                    value={contactRelationship}
                    onChange={e => setContactRelationship(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="Barát">{isHu ? 'Barát' : 'Friend'}</option>
                    <option value="Család">{isHu ? 'Családtag' : 'Family'}</option>
                    <option value="Szomszéd">{isHu ? 'Szomszéd' : 'Neighbor'}</option>
                    <option value="Munkatárs">{isHu ? 'Munkatárs / Kolléga' : 'Coworker'}</option>
                    <option value="Ismerős">{isHu ? 'Ismerős' : 'Acquaintance'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Elérhetőség' : 'Phone / Contact'}
                  </label>
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={e => setContactInfo(e.target.value)}
                    placeholder={isHu ? '+36 30 123 4567' : '+1 555 123'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Megjegyzések' : 'Notes'}
                </label>
                <textarea
                  value={contactNotes}
                  onChange={e => setContactNotes(e.target.value)}
                  rows={2}
                  placeholder={isHu ? 'Pl. Megbízható szomszéd a 4. emeletről...' : 'Notes...'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)] transition-colors"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white shadow-md transition-all"
                >
                  {editingContact ? (isHu ? 'Mentés' : 'Save Changes') : (isHu ? 'Hozzáadás' : 'Add Contact')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
