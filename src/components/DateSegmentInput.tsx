import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateSegmentInputProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (dateStr: string) => void;
  className?: string;
  isHu?: boolean;
  id?: string;
}

export const DateSegmentInput: React.FC<DateSegmentInputProps> = ({
  value,
  onChange,
  className = '',
  isHu = true,
  id,
}) => {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Sync internal segments from parent value
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
    } else if (!value) {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  const notifyChange = (newYear: string, newMonth: string, newDay: string) => {
    const cleanY = newYear.trim();
    const cleanM = newMonth.trim();
    const cleanD = newDay.trim();

    if (!cleanY && !cleanM && !cleanD) {
      onChange('');
      return;
    }

    if (cleanY.length === 4 && cleanM.length >= 1 && cleanD.length >= 1) {
      const numM = parseInt(cleanM, 10);
      const numD = parseInt(cleanD, 10);
      if (numM >= 1 && numM <= 12 && numD >= 1 && numD <= 31) {
        const formattedM = numM.toString().padStart(2, '0');
        const formattedD = numD.toString().padStart(2, '0');
        onChange(`${cleanY}-${formattedM}-${formattedD}`);
        return;
      }
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(val);
    notifyChange(val, month, day);

    // Auto-advance to Month when 4 digits are typed
    if (val.length === 4) {
      monthRef.current?.focus();
      monthRef.current?.select();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);

    const num = parseInt(val, 10);
    if (num > 12) {
      val = '12';
    }

    setMonth(val);
    notifyChange(year, val, day);

    // Auto-advance to Day
    // If user types '0' followed by digit, or '1' followed by digit (length === 2)
    // Or if user types a single digit 2-9 (since no month starts with 2..9)
    if (val.length === 2 || (val.length === 1 && num >= 2)) {
      if (val.length === 1 && num >= 2) {
        val = `0${val}`;
        setMonth(val);
        notifyChange(year, val, day);
      }
      dayRef.current?.focus();
      dayRef.current?.select();
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);

    const num = parseInt(val, 10);
    if (num > 31) {
      val = '31';
    }

    setDay(val);
    notifyChange(year, month, val);

    // If single digit 4-9 typed, could format as 0X
    if (val.length === 1 && num >= 4) {
      val = `0${val}`;
      setDay(val);
      notifyChange(year, month, val);
    }
  };

  // Keyboard navigation & Backspace jumping
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentSegment: 'year' | 'month' | 'day'
  ) => {
    if (e.key === 'Backspace') {
      if (currentSegment === 'day' && !day) {
        e.preventDefault();
        monthRef.current?.focus();
      } else if (currentSegment === 'month' && !month) {
        e.preventDefault();
        yearRef.current?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        if (currentSegment === 'year') {
          e.preventDefault();
          monthRef.current?.focus();
          monthRef.current?.select();
        } else if (currentSegment === 'month') {
          e.preventDefault();
          dayRef.current?.focus();
          dayRef.current?.select();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        if (currentSegment === 'day') {
          e.preventDefault();
          monthRef.current?.focus();
          monthRef.current?.select();
        } else if (currentSegment === 'month') {
          e.preventDefault();
          yearRef.current?.focus();
          yearRef.current?.select();
        }
      }
    }
  };

  // Intelligent paste handling (supports YYYY-MM-DD, YYYY.MM.DD, DD.MM.YYYY, YYYY/MM/DD)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    const isoMatch = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (isoMatch) {
      e.preventDefault();
      const [, y, m, d] = isoMatch;
      const formattedM = m.padStart(2, '0');
      const formattedD = d.padStart(2, '0');
      setYear(y);
      setMonth(formattedM);
      setDay(formattedD);
      notifyChange(y, formattedM, formattedD);
      return;
    }

    const euMatch = text.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
    if (euMatch) {
      e.preventDefault();
      const [, d, m, y] = euMatch;
      const formattedM = m.padStart(2, '0');
      const formattedD = d.padStart(2, '0');
      setYear(y);
      setMonth(formattedM);
      setDay(formattedD);
      notifyChange(y, formattedM, formattedD);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setYear('');
    setMonth('');
    setDay('');
    onChange('');
    yearRef.current?.focus();
  };

  const handleCalendarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.value;
    if (selected) {
      const [y, m, d] = selected.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
      onChange(selected);
    }
  };

  const openNativePicker = () => {
    if (hiddenDateInputRef.current) {
      if (typeof hiddenDateInputRef.current.showPicker === 'function') {
        hiddenDateInputRef.current.showPicker();
      } else {
        hiddenDateInputRef.current.focus();
        hiddenDateInputRef.current.click();
      }
    }
  };

  const hasAnyValue = Boolean(year || month || day);

  return (
    <div
      id={id}
      className={`relative flex items-center justify-between w-full min-w-0 px-2 py-1.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] focus-within:border-[var(--color-primary-blue,#2563EB)] focus-within:ring-1 focus-within:ring-[var(--color-primary-blue,#2563EB)] transition-all box-border overflow-hidden ${className}`}
    >
      {/* Segmented Inputs: Year . Month . Day */}
      <div className="flex items-center gap-0.5 sm:gap-1 text-xs text-[var(--text-main,#E0E3E6)] font-mono min-w-0 flex-1 overflow-hidden">
        {/* YEAR (ÉV) */}
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          placeholder={isHu ? 'ÉÉÉÉ' : 'YYYY'}
          value={year}
          onChange={handleYearChange}
          onKeyDown={e => handleKeyDown(e, 'year')}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className="w-10 sm:w-12 min-w-0 text-center bg-transparent text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/40 focus:outline-none focus:text-white font-bold tracking-tight shrink-0"
          title={isHu ? 'Év (4 számjegy)' : 'Year (4 digits)'}
          maxLength={4}
        />

        <span className="text-[var(--text-sub,#B5BDC6)]/50 select-none font-bold shrink-0">.</span>

        {/* MONTH (HÓNAP) */}
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          placeholder={isHu ? 'HH' : 'MM'}
          value={month}
          onChange={handleMonthChange}
          onKeyDown={e => handleKeyDown(e, 'month')}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className="w-6 sm:w-8 min-w-0 text-center bg-transparent text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/40 focus:outline-none focus:text-white font-bold tracking-tight shrink-0"
          title={isHu ? 'Hónap (1-12)' : 'Month (1-12)'}
          maxLength={2}
        />

        <span className="text-[var(--text-sub,#B5BDC6)]/50 select-none font-bold shrink-0">.</span>

        {/* DAY (NAP) */}
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          placeholder={isHu ? 'NN' : 'DD'}
          value={day}
          onChange={handleDayChange}
          onKeyDown={e => handleKeyDown(e, 'day')}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className="w-6 sm:w-8 min-w-0 text-center bg-transparent text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/40 focus:outline-none focus:text-white font-bold tracking-tight shrink-0"
          title={isHu ? 'Nap (1-31)' : 'Day (1-31)'}
          maxLength={2}
        />
      </div>

      {/* Right side controls: Clear (X) + Calendar Picker Icon */}
      <div className="flex items-center gap-0.5 shrink-0 ml-1">
        {hasAnyValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--border-color,#56616D)]/50 transition-colors"
            title={isHu ? 'Dátum törlése' : 'Clear date'}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Calendar Picker Icon Button */}
        <button
          type="button"
          onClick={openNativePicker}
          className="p-1 rounded-md text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--border-color,#56616D)]/50 transition-colors"
          title={isHu ? 'Dátumválasztó naptár megnyitása' : 'Open calendar picker'}
        >
          <Calendar className="h-3.5 w-3.5 text-emerald-400" />
        </button>

        {/* Hidden native date input for the calendar popup */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          value={value || ''}
          onChange={handleCalendarPick}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      </div>
    </div>
  );
};
