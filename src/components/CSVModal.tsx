import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isSupabaseConfigured } from '../lib/supabase';
import type { ItemCondition } from '../types';

interface CSVModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedCSVRow {
  rowNum: number;
  raw: Record<string, string>;
  name: string;
  categoryId: string;
  categoryName: string;
  locationId: string;
  locationName: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  condition: ItemCondition;
  storeSeller: string | null;
  warrantyEnd: string | null;
  notes: string | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const CSVModal: React.FC<CSVModalProps> = ({ isOpen, onClose }) => {
  const {
    items,
    categories,
    locations,
    getLocationPath,
    getCategoryName,
    addItem,
    language
  } = useApp();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCSVRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; failCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHu = language === 'hu';

  if (!isOpen) return null;

  // CSV EXPORT LOGIC
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = [
      'Tárgy Neve',
      'Kategória',
      'Helyszín',
      'Vásárlás Dátuma',
      'Vételár',
      'Aktuális Érték',
      'Állapot',
      'Üzlet/Eladó',
      'Garancia Lejárata',
      'Megjegyzések'
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [
      headers.map(escapeCSV).join(',')
    ];

    items.forEach(item => {
      const categoryName = getCategoryName(item.category_id);
      const locationPath = getLocationPath(item.location_id);
      const row = [
        item.name,
        categoryName,
        locationPath,
        item.purchase_date || '',
        item.purchase_price !== undefined && item.purchase_price !== null ? item.purchase_price : '',
        item.current_value !== undefined && item.current_value !== null ? item.current_value : '',
        item.condition,
        item.store_seller || '',
        item.warranty_end || '',
        item.notes || ''
      ];
      csvRows.push(row.map(escapeCSV).join(','));
    });

    const csvString = BOM + csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `Thingor_Targyaink_Export_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV SAMPLE DOWNLOAD LOGIC
  const handleDownloadSample = () => {
    const BOM = '\uFEFF';
    const sampleContent =
      BOM +
      `Tárgy Neve,Kategória,Helyszín,Vásárlás Dátuma,Vételár,Aktuális Érték,Állapot,Üzlet/Eladó,Garancia Lejárata,Megjegyzések\r\n` +
      `"Sony Smart TV 55""",Elektronika,Nappali,2024-03-15,249900,220000,Kiváló,MediaMarkt,2026-03-15,"Nappali tévé"\r\n` +
      `"Bosch Fúrókalapács",Szerszámok,Garázs,2023-08-10,45000,38000,Jó,Praktiker,2025-08-10,"Tartalék fúrószárral"\r\n`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Thingor_CSV_Minta.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV PARSER HELPER
  const parseCSVText = (text: string): string[][] => {
    const cleanText = text.replace(/^\uFEFF/, ''); // Strip BOM
    const lines: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(current.trim());
        if (row.some(cell => cell.length > 0)) {
          lines.push(row);
        }
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
    if (current.length > 0 || row.length > 0) {
      row.push(current.trim());
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
    }
    return lines;
  };

  // FILE SELECTION & VALIDATION
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsParsing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setIsParsing(false);
        return;
      }

      const rows = parseCSVText(text);
      if (rows.length < 2) {
        setParsedRows([]);
        setIsParsing(false);
        return;
      }

      const headerRow = rows[0].map(h => h.toLowerCase());
      const dataRows = rows.slice(1);

      const findColIndex = (names: string[]) => {
        return headerRow.findIndex(h => names.some(n => h.includes(n)));
      };

      const nameIdx = findColIndex(['tárgy neve', 'tárgynév', 'name', 'tárgy']);
      const catIdx = findColIndex(['kategória', 'category']);
      const locIdx = findColIndex(['helyszín', 'location']);
      const pDateIdx = findColIndex(['vásárlás dátuma', 'purchasedate', 'dátum']);
      const pPriceIdx = findColIndex(['vételár', 'purchaseprice', 'ár']);
      const cValIdx = findColIndex(['aktuális érték', 'currentvalue', 'érték']);
      const condIdx = findColIndex(['állapot', 'condition']);
      const sellerIdx = findColIndex(['üzlet', 'eladó', 'seller', 'store']);
      const wEndIdx = findColIndex(['garancia', 'warranty']);
      const notesIdx = findColIndex(['megjegyzés', 'notes']);

      const defaultCategory = categories[0]?.id || '';
      const defaultLocation = locations[0]?.id || '';

      const validated: ParsedCSVRow[] = dataRows.map((r, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        const nameVal = nameIdx >= 0 ? r[nameIdx] || '' : r[0] || '';
        const catVal = catIdx >= 0 ? r[catIdx] || '' : '';
        const locVal = locIdx >= 0 ? r[locIdx] || '' : '';
        const pDateVal = pDateIdx >= 0 ? r[pDateIdx] || '' : '';
        const pPriceVal = pPriceIdx >= 0 ? r[pPriceIdx] || '' : '';
        const cValVal = cValIdx >= 0 ? r[cValIdx] || '' : '';
        const condVal = condIdx >= 0 ? r[condIdx] || '' : '';
        const sellerVal = sellerIdx >= 0 ? r[sellerIdx] || '' : '';
        const wEndVal = wEndIdx >= 0 ? r[wEndIdx] || '' : '';
        const notesVal = notesIdx >= 0 ? r[notesIdx] || '' : '';

        // 1. Required Name Check
        if (!nameVal.trim()) {
          errors.push(isHu ? 'Hiányzó tárgynév (kötelező mező)' : 'Missing item name (required)');
        }

        // 2. Category Match
        let matchedCatId = defaultCategory;
        if (catVal.trim()) {
          const foundCat = categories.find(c =>
            c.name.toLowerCase() === catVal.trim().toLowerCase()
          );
          if (foundCat) {
            matchedCatId = foundCat.id;
          } else {
            errors.push(
              isHu
                ? `Ismeretlen kategória: "${catVal}". Hozz létre ilyen kategóriát a rendszerben.`
                : `Unknown category: "${catVal}".`
            );
          }
        }

        // 3. Location Match
        let matchedLocId = defaultLocation;
        if (locVal.trim()) {
          const foundLoc = locations.find(l => {
            const path = getLocationPath(l.id).toLowerCase();
            return l.name.toLowerCase() === locVal.trim().toLowerCase() || path.includes(locVal.trim().toLowerCase());
          });
          if (foundLoc) {
            matchedLocId = foundLoc.id;
          } else {
            errors.push(
              isHu
                ? `Ismeretlen helyszín: "${locVal}". Hozz létre ilyen helyszínt a rendszerben.`
                : `Unknown location: "${locVal}".`
            );
          }
        }

        // 4. Number Validations
        let parsedPPrice: number | null = null;
        if (pPriceVal.trim()) {
          const num = parseFloat(pPriceVal.replace(/\s/g, '').replace(',', '.'));
          if (isNaN(num) || num < 0) {
            errors.push(isHu ? 'Érvénytelen vételár (szám legyen)' : 'Invalid purchase price');
          } else {
            parsedPPrice = num;
          }
        }

        let parsedCValue: number | null = null;
        if (cValVal.trim()) {
          const num = parseFloat(cValVal.replace(/\s/g, '').replace(',', '.'));
          if (isNaN(num) || num < 0) {
            errors.push(isHu ? 'Érvénytelen aktuális érték (szám legyen)' : 'Invalid current value');
          } else {
            parsedCValue = num;
          }
        }

        // 5. Date Validations (YYYY-MM-DD)
        const validateDate = (dStr: string, fieldName: string) => {
          if (!dStr.trim()) return null;
          const trimmed = dStr.trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            errors.push(isHu ? `Érvénytelen ${fieldName} dátum (YYYY-MM-DD elvárt, kapott: ${trimmed})` : `Invalid date format for ${fieldName}`);
            return null;
          }
          return trimmed;
        };

        const parsedPDate = validateDate(pDateVal, isHu ? 'vásárlási' : 'purchase');
        const parsedWEnd = validateDate(wEndVal, isHu ? 'garancia' : 'warranty');

        // 6. Condition Mapping
        let matchedCondition: ItemCondition = 'Good';
        const condLower = condVal.trim().toLowerCase();
        if (condLower.includes('új') || condLower.includes('new')) matchedCondition = 'New';
        else if (condLower.includes('kiváló') || condLower.includes('excellent')) matchedCondition = 'Excellent';
        else if (condLower.includes('jó') || condLower.includes('good')) matchedCondition = 'Good';
        else if (condLower.includes('közepes') || condLower.includes('fair')) matchedCondition = 'Fair';
        else if (condLower.includes('gyenge') || condLower.includes('poor')) matchedCondition = 'Poor';
        else if (condLower.includes('hibás') || condLower.includes('broken')) matchedCondition = 'Broken';

        // 7. Duplicate Warning
        const isDuplicate = items.some(i =>
          i.name.toLowerCase() === nameVal.trim().toLowerCase() && i.location_id === matchedLocId
        );
        if (isDuplicate) {
          warnings.push(
            isHu
              ? 'Figyelem: Potenciális duplikáció (már létezik ilyen nevű tárgy ezen a helyszínen)'
              : 'Potential duplicate item at this location'
          );
        }

        return {
          rowNum: index + 2,
          raw: { name: nameVal, category: catVal, location: locVal },
          name: nameVal.trim(),
          categoryId: matchedCatId,
          categoryName: getCategoryName(matchedCatId),
          locationId: matchedLocId,
          locationName: getLocationPath(matchedLocId),
          purchaseDate: parsedPDate,
          purchasePrice: parsedPPrice,
          currentValue: parsedCValue,
          condition: matchedCondition,
          storeSeller: sellerVal.trim() || null,
          warrantyEnd: parsedWEnd,
          notes: notesVal.trim() || null,
          isValid: errors.length === 0,
          errors,
          warnings
        };
      });

      setParsedRows(validated);
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  // EXECUTE IMPORT
  const handleExecuteImport = async () => {
    if (isImporting) return;

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    let success = 0;
    let fail = 0;

    for (const r of validRows) {
      try {
        const createdItem = await addItem({
          name: r.name,
          category_id: r.categoryId,
          location_id: r.locationId,
          purchase_date: r.purchaseDate || undefined,
          purchase_price: r.purchasePrice || undefined,
          current_value: r.currentValue || undefined,
          condition: r.condition,
          store_seller: r.storeSeller || undefined,
          warranty_end: r.warrantyEnd || undefined,
          notes: r.notes || undefined,
          status: 'Working',
          ownership_scope: 'private'
        });

        if (isSupabaseConfigured && createdItem?.id?.startsWith('item-')) {
          console.warn('CSV import row failed on Supabase backend:', r.name);
          fail++;
        } else {
          success++;
        }
      } catch (err) {
        console.error('CSV import row failed:', err);
        fail++;
      }
    }

    setIsImporting(false);
    setImportResult({ successCount: success, failCount: fail });
  };

  const validRowsCount = parsedRows.filter(r => r.isValid).length;
  const invalidRowsCount = parsedRows.filter(r => !r.isValid).length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-[14px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {isHu ? 'CSV Tárgykezelés (Export / Import)' : 'CSV Management (Export / Import)'}
              </h3>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Tárgyak kötegelt kimentése és biztonságos beimportálása' : 'Batch export and secure import of items'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/30 px-6 gap-2 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'export'
                ? 'border-[var(--color-primary-blue,#2563EB)] text-[var(--color-primary-blue,#2563EB)] font-bold'
                : 'border-transparent text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>{isHu ? 'CSV Export' : 'CSV Export'}</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'import'
                ? 'border-[var(--color-primary-blue,#2563EB)] text-[var(--color-primary-blue,#2563EB)] font-bold'
                : 'border-transparent text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>{isHu ? 'CSV Importálás' : 'CSV Import'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)] space-y-4 text-center">
                <FileSpreadsheet className="h-12 w-12 text-[var(--color-primary-blue,#2563EB)] mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                    {isHu ? 'Teljes Leltár Exportálása CSV-be' : 'Export Full Inventory to CSV'}
                  </h4>
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-md mx-auto leading-relaxed">
                    {isHu
                      ? 'Az exportálás UTF-8 BOM kódolással történik, így az ékezetes karakterek és a szövegek közvetlenül, hibátlanul nyílnak meg Microsoft Excelben.'
                      : 'Exports all current items to UTF-8 BOM CSV format compatible with Excel.'}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={items.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isHu ? `CSV Export Letöltése (${items.length} tárgy)` : `Download CSV (${items.length} items)`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              
              {/* Step 1: Sample CSV & File Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Download Sample */}
                <div className="p-5 rounded-2xl bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)] flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[var(--color-primary-blue,#2563EB)] uppercase tracking-wider">1. Lépés</span>
                    <h5 className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">{isHu ? 'Minta CSV Fájl Letöltése' : 'Download Sample CSV'}</h5>
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu
                        ? 'Használd a hivatalos oszlopfejléceket tartalmazó minta fájlt az adatok feltöltéséhez.'
                        : 'Use the official sample CSV file with correct column headers.'}
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSample}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] text-xs font-bold border border-[var(--border-color,#56616D)] transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{isHu ? 'Minta CSV Letöltése' : 'Download Sample'}</span>
                  </button>
                </div>

                {/* Select File */}
                <div className="p-5 rounded-2xl bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)] flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[var(--color-primary-blue,#2563EB)] uppercase tracking-wider">2. Lépés</span>
                    <h5 className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">{isHu ? 'CSV Fájl Kiválasztása' : 'Select CSV File'}</h5>
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)] truncate">
                      {csvFile ? csvFile.name : (isHu ? 'Válassz ki egy `.csv` fájlt a számítógépedről' : 'Select a `.csv` file')}
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs shadow transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{csvFile ? (isHu ? 'Másik fájl kiválasztása' : 'Choose another file') : (isHu ? 'CSV Tallózása' : 'Browse CSV')}</span>
                  </button>
                </div>

              </div>

              {/* Parsing Progress */}
              {isParsing && (
                <div className="p-8 text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-[var(--color-primary-blue,#2563EB)] animate-spin mx-auto" />
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] font-medium">
                    {isHu ? 'CSV fájl elemzése és ellenőrzése...' : 'Parsing and validating CSV...'}
                  </p>
                </div>
              )}

              {/* Import Result Notification */}
              {importResult && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  importResult.failCount === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <div>
                      <h5 className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
                        {isHu ? 'Importálás Befejeződött' : 'Import Finished'}
                      </h5>
                      <p className="text-xs">
                        {isHu
                          ? `Sikeresen mentve: ${importResult.successCount} tárgy.${importResult.failCount > 0 ? ` Hibás/kihagyott: ${importResult.failCount} tárgy.` : ''}`
                          : `Successfully saved: ${importResult.successCount} items.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Validation Preview Table */}
              {parsedRows.length > 0 && !isParsing && (
                <div className="space-y-4 pt-2">
                  
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)] text-xs flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[var(--text-main,#E0E3E6)]">
                        {isHu ? `Összes sor: ${parsedRows.length}` : `Total rows: ${parsedRows.length}`}
                      </span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isHu ? `Érvényes: ${validRowsCount} db` : `Valid: ${validRowsCount}`}
                      </span>
                      {invalidRowsCount > 0 && (
                        <span className="font-bold text-rose-400 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" />
                          {isHu ? `Hibás: ${invalidRowsCount} db` : `Invalid: ${invalidRowsCount}`}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting || validRowsCount === 0}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>
                        {isHu
                          ? `Importálás Indítása (${validRowsCount} tárgy)`
                          : `Start Import (${validRowsCount} items)`}
                      </span>
                    </button>
                  </div>

                  {/* Rows Table */}
                  <div className="rounded-xl border border-[var(--border-color,#56616D)] overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[var(--surface-bg,#465362)]/60 border-b border-[var(--border-color,#56616D)] text-[11px] font-bold text-[var(--text-sub,#B5BDC6)]">
                          <th className="p-2.5 w-12 text-center">Sor</th>
                          <th className="p-2.5">Státusz</th>
                          <th className="p-2.5">Tárgy Neve</th>
                          <th className="p-2.5">Kategória</th>
                          <th className="p-2.5">Helyszín</th>
                          <th className="p-2.5 text-right">Vételár</th>
                          <th className="p-2.5">Hiba / Részletek</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color,#56616D)]/60 bg-[var(--surface-bg,#465362)]/20 text-[var(--text-main,#E0E3E6)]">
                        {parsedRows.map((row) => (
                          <tr key={row.rowNum} className={row.isValid ? 'hover:bg-[var(--surface-bg,#465362)]/40' : 'bg-rose-950/20'}>
                            <td className="p-2.5 text-center font-mono text-[11px] text-[var(--text-sub,#B5BDC6)]">
                              #{row.rowNum}
                            </td>
                            <td className="p-2.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3 w-3" /> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  <XCircle className="h-3 w-3" /> Hiba
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-bold text-[var(--text-main,#E0E3E6)]">
                              {row.name || <span className="text-rose-400 italic">Hiányzik</span>}
                            </td>
                            <td className="p-2.5">{row.categoryName}</td>
                            <td className="p-2.5">{row.locationName}</td>
                            <td className="p-2.5 text-right font-mono">
                              {row.purchasePrice !== null ? `${row.purchasePrice.toLocaleString()} Ft` : '-'}
                            </td>
                            <td className="p-2.5 text-[11px]">
                              {row.errors.length > 0 && (
                                <div className="text-rose-400 font-semibold space-y-0.5">
                                  {row.errors.map((err, i) => (
                                    <div key={i}>• {err}</div>
                                  ))}
                                </div>
                              )}
                              {row.warnings.length > 0 && (
                                <div className="text-amber-400 font-medium space-y-0.5 mt-0.5">
                                  {row.warnings.map((warn, i) => (
                                    <div key={i}>⚠️ {warn}</div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
};
