import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CreditCard, Calendar, CheckCircle2, Plus, Trash2, DollarSign, Package } from 'lucide-react';

export const FinancingView: React.FC = () => {
  const { items, financings, saveFinancing, recordInstallmentPayment, deleteFinancing, t, setSelectedItemId, language } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New financing form state
  const [selectedItemIdForm, setSelectedItemIdForm] = useState<string>('');
  const [provider, setProvider] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(0);
  const [totalInstallments, setTotalInstallments] = useState<number>(12);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextPaymentDate, setNextPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleSaveFinancing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemIdForm || !originalPrice || !monthlyInstallment) return;

    // Calculate end date based on totalInstallments
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + totalInstallments);
    const endDate = start.toISOString().split('T')[0];

    const financedAmount = originalPrice - downPayment;

    await saveFinancing({
      item_id: selectedItemIdForm,
      provider: provider || (language === 'hu' ? 'Áruhitel' : 'Consumer Loan'),
      original_price: originalPrice,
      down_payment: downPayment,
      financed_amount: financedAmount,
      monthly_installment: monthlyInstallment,
      total_installments: totalInstallments,
      paid_installments: 0,
      remaining_installments: totalInstallments,
      remaining_debt: financedAmount,
      start_date: startDate,
      next_payment_date: nextPaymentDate,
      end_date: endDate,
      notes: notes || undefined,
    });

    setIsModalOpen(false);
    // Reset form
    setSelectedItemIdForm('');
    setProvider('');
    setOriginalPrice(0);
    setDownPayment(0);
    setMonthlyInstallment(0);
    setTotalInstallments(12);
    setNotes('');
  };

  const totalMonthlyPayment = financings.reduce((sum, f) => f.remaining_installments > 0 ? sum + f.monthly_installment : sum, 0);
  const totalRemainingDebt = financings.reduce((sum, f) => sum + f.remaining_debt, 0);
  const activeFinancingCount = financings.filter(f => f.remaining_installments > 0).length;

  // Next upcoming payment
  const activeFinancingsWithDates = financings
    .filter(f => f.remaining_installments > 0 && f.next_payment_date)
    .sort((a, b) => new Date(a.next_payment_date!).getTime() - new Date(b.next_payment_date!).getTime());

  const upcomingFinancing = activeFinancingsWithDates[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-[var(--color-primary-blue,#2563EB)]" />
            {language === 'hu' ? 'Finanszírozásaim & Részletfizetés' : 'Financing & Installments'}
          </h1>
          <p className="text-[var(--text-sub,#B5BDC6)] text-sm mt-1">
            {language === 'hu'
              ? 'Áruhitelek, részletfizetések és lejárati határidők átlátható kezelése.'
              : 'Track consumer loans, installment payments, and maturity dates.'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold rounded-xl transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          {language === 'hu' ? 'Finanszírozás hozzáadása' : 'Add Financing'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Havi fizetendő' : 'Monthly Due'}</p>
            <p className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{formatCurrency(totalMonthlyPayment)}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-950/40 text-rose-400 border border-rose-500/30 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Fennálló tartozás' : 'Total Remaining Debt'}</p>
            <p className="text-xl font-bold text-rose-400">{formatCurrency(totalRemainingDebt)}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-950/40 text-[var(--color-success,#34D399)] border border-emerald-500/30 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Aktív hitelek' : 'Active Loans'}</p>
            <p className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{activeFinancingCount}</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg,#3A4551)] p-5 rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-950/40 text-[var(--color-warning,#F59E0B)] border border-amber-500/30 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">{language === 'hu' ? 'Következő fizetés' : 'Next Due'}</p>
            {upcomingFinancing ? (
              <div>
                <p className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">{upcomingFinancing.next_payment_date}</p>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)] font-medium">{formatCurrency(upcomingFinancing.monthly_installment)}</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Nincs esedékes' : 'None'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Financings List */}
      {financings.length === 0 ? (
        <div className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] p-12 text-center shadow-sm">
          <CreditCard className="w-12 h-12 text-[var(--text-sub,#B5BDC6)] opacity-60 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-main,#E0E3E6)] mb-1">
            {language === 'hu' ? 'Nincs rögzített finanszírozás' : 'No financing records'}
          </h3>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] max-w-md mx-auto mb-4">
            {language === 'hu'
              ? 'Még egyetlen tárgyadhoz sem állítottál be részletfizetést vagy áruhitelt.'
              : 'You have not added installment plans for any of your items yet.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-blue,#2563EB)] text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {language === 'hu' ? 'Részletfizetés beállítása' : 'Add Installment Plan'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {financings.map((fin) => {
            const item = items.find(i => i.id === fin.item_id);
            const progressPercent = Math.min(100, Math.round((fin.paid_installments / fin.total_installments) * 100));
            const isCompleted = fin.remaining_installments === 0;

            return (
              <div
                key={fin.id}
                className="bg-[var(--card-bg,#3A4551)] rounded-2xl border border-[var(--border-color,#56616D)] shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] rounded-xl">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <button
                          onClick={() => setSelectedItemId(fin.item_id)}
                          className="font-bold text-[var(--text-main,#E0E3E6)] hover:text-blue-400 transition text-left text-base"
                        >
                          {item ? item.name : (language === 'hu' ? 'Ismeretlen tárgy' : 'Unknown Item')}
                        </button>
                        <p className="text-xs text-[var(--text-sub,#B5BDC6)] font-medium">
                          {language === 'hu' ? 'Szolgáltató:' : 'Provider:'} <span className="text-[var(--text-main,#E0E3E6)] font-semibold">{fin.provider}</span>
                        </p>
                      </div>
                    </div>
                    {isCompleted ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/50 text-[var(--color-success,#34D399)] border border-emerald-500/40">
                        {language === 'hu' ? 'Kifizetve' : 'Fully Paid'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-950/50 text-blue-300 border border-[var(--color-primary-blue,#2563EB)]/40">
                        {language === 'hu' ? 'Aktív hitel' : 'Active Loan'}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
                      <span>{language === 'hu' ? 'Törlesztés előrehaladása' : 'Payment Progress'}</span>
                      <span className="text-[var(--color-primary-blue,#2563EB)] font-bold">{fin.paid_installments} / {fin.total_installments} {language === 'hu' ? 'részlet' : 'months'} ({progressPercent}%)</span>
                    </div>
                    <div className="w-full bg-[var(--surface-bg,#465362)] h-2.5 rounded-full overflow-hidden border border-[var(--border-color,#56616D)]">
                      <div
                        className="bg-[var(--color-primary-blue,#2563EB)] h-full transition-all duration-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Pricing grid */}
                  <div className="grid grid-cols-2 gap-3 bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] rounded-xl p-3 text-xs text-[var(--text-sub,#B5BDC6)] my-3">
                    <div>
                      <p className="text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Vételár:' : 'Original price:'}</p>
                      <p className="font-bold text-[var(--text-main,#E0E3E6)]">{formatCurrency(fin.original_price)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Önerő:' : 'Down payment:'}</p>
                      <p className="font-bold text-[var(--text-main,#E0E3E6)]">{formatCurrency(fin.down_payment)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Havi törlesztő:' : 'Monthly payment:'}</p>
                      <p className="font-bold text-blue-400 text-sm">{formatCurrency(fin.monthly_installment)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-sub,#B5BDC6)]">{language === 'hu' ? 'Fennálló tartozás:' : 'Remaining debt:'}</p>
                      <p className="font-bold text-rose-400 text-sm">{formatCurrency(fin.remaining_debt)}</p>
                    </div>
                  </div>

                  {/* Schedule details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-sub,#B5BDC6)]">
                    {fin.next_payment_date && !isCompleted && (
                      <div className="flex items-center gap-1 font-medium text-amber-300 bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-500/30 col-span-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{language === 'hu' ? 'Következő fizetés:' : 'Next due date:'} <strong>{fin.next_payment_date}</strong></span>
                      </div>
                    )}
                    <div>
                      <span className="text-[var(--text-sub,#B5BDC6)] opacity-80">{language === 'hu' ? 'Kezdés:' : 'Start:'}</span> {fin.start_date}
                    </div>
                    {fin.end_date && (
                      <div>
                        <span className="text-[var(--text-sub,#B5BDC6)] opacity-80">{language === 'hu' ? 'Lejárat:' : 'Maturity:'}</span> {fin.end_date}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-[var(--border-color,#56616D)] flex items-center justify-between gap-2">
                  {!isCompleted ? (
                    <button
                      onClick={() => recordInstallmentPayment(fin.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'hu' ? '1 részlet befizetése' : 'Record 1 Installment'}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-[var(--color-success,#34D399)] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {language === 'hu' ? 'Minden részlet kifizetve' : 'All installments paid'}
                    </span>
                  )}

                  <button
                    onClick={() => deleteFinancing(fin.id)}
                    className="p-1.5 text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
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

      {/* New Financing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
            <h2 className="text-xl font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[var(--color-primary-blue,#2563EB)]" />
              {language === 'hu' ? 'Részletfizetés / Finanszírozás beállítása' : 'Add Installment / Financing'}
            </h2>

            <form onSubmit={handleSaveFinancing} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Érintett tárgy *' : 'Target Item *'}
                </label>
                <select
                  required
                  value={selectedItemIdForm}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedItemIdForm(id);
                    const it = items.find(i => i.id === id);
                    if (it && it.purchase_price) {
                      setOriginalPrice(it.purchase_price);
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium transition-colors"
                >
                  <option value="" className="bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)]">{language === 'hu' ? '-- Válassz tárgyat --' : '-- Select Item --'}</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id} className="bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)]">{i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Finanszírozó / Áruhitel szolgáltató *' : 'Financing Provider *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'hu' ? 'Pl. OTP Bank, Cofidis, Cetelem, Apple Financial' : 'e.g. OTP Credit, Cofidis'}
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Eredeti vételár (Ft) *' : 'Original Price (HUF) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={originalPrice || ''}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Önerő (Ft)' : 'Down Payment (HUF)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={downPayment || ''}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Havi törlesztőrészlet (Ft) *' : 'Monthly Installment (HUF) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={monthlyInstallment || ''}
                    onChange={(e) => setMonthlyInstallment(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Futamidő (hónap) *' : 'Term (Months) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={totalInstallments || ''}
                    onChange={(e) => setTotalInstallments(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Első fizetés dátuma' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => { try { (e.currentTarget as any).showPicker(); } catch (err) {} }}
                    onFocus={(e) => { try { (e.currentTarget as any).showPicker(); } catch (err) {} }}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium cursor-pointer min-h-[42px] transition-colors scheme-dark"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                    {language === 'hu' ? 'Következő fizetés' : 'Next Due Date'}
                  </label>
                  <input
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                    onClick={(e) => { try { (e.currentTarget as any).showPicker(); } catch (err) {} }}
                    onFocus={(e) => { try { (e.currentTarget as any).showPicker(); } catch (err) {} }}
                    className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium cursor-pointer min-h-[42px] transition-colors scheme-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Megjegyzés' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'hu' ? 'Pl. Szerződésszám: 12345' : 'e.g. Contract ID'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] p-2.5 focus:border-[var(--color-primary-blue,#2563EB)] outline-none font-medium transition-colors"
                />
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
