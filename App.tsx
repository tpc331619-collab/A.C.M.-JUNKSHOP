import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout } from './components/Layout';
import { TRANSLATIONS } from './constants';
import { storageService } from './services/storageService';
import { Language, ViewState, Category, ExpenseRecord, RecordDetail } from './types';

// Icons
import { 
  CreditCard, 
  List, 
  Settings, 
  Save, 
  Trash2, 
  Globe,
  Plus,
  FileText,
  Printer,
  X,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react';

export default function App() {
  // --- STATE ---
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [lang, setLang] = useState<Language>(Language.EN);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [t, setT] = useState(TRANSLATIONS[Language.EN]);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load Language Settings
    const savedLang = storageService.getLanguage();
    setLang(savedLang);
    setT(TRANSLATIONS[savedLang]);

    // Subscribe to Firebase Data
    const unsubscribe = storageService.subscribe((updatedRecords) => {
      setRecords(updatedRecords);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Update translation when language changes
  useEffect(() => {
    setT(TRANSLATIONS[lang]);
    storageService.setLanguage(lang);
  }, [lang]);

  // --- HANDLERS ---
  const handleAddRecord = async (record: ExpenseRecord) => {
    await storageService.addRecord(record);
    setView(ViewState.HOME);
  };

  const handleBack = () => setView(ViewState.HOME);

  // --- RENDER VIEWS ---

  if (view === ViewState.RECORD) {
    return <RecordView t={t} onSave={handleAddRecord} onBack={handleBack} />;
  }

  if (view === ViewState.VIEW) {
    return <ViewRecordsView t={t} lang={lang} records={records} onBack={handleBack} />;
  }

  if (view === ViewState.SETTINGS) {
    return <SettingsView t={t} currentLang={lang} onLanguageChange={setLang} onBack={handleBack} />;
  }

  // DEFAULT: HOME
  return (
    <Layout title={t.title}>
      <div className="flex flex-col gap-6 h-full justify-center py-10">
        <HomeButton 
          icon={<CreditCard size={40} />} 
          label={t.home.record} 
          onClick={() => setView(ViewState.RECORD)} 
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <HomeButton 
          icon={<List size={40} />} 
          label={t.home.view} 
          onClick={() => setView(ViewState.VIEW)} 
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
        />
        <HomeButton 
          icon={<Settings size={40} />} 
          label={t.home.settings} 
          onClick={() => setView(ViewState.SETTINGS)} 
          color="bg-gradient-to-r from-slate-500 to-slate-600"
        />
      </div>
    </Layout>
  );
}

// --- SUB-COMPONENTS ---

const HomeButton = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) => (
  <button 
    onClick={onClick}
    className={`${color} text-white p-8 rounded-2xl shadow-lg transform transition active:scale-95 flex flex-col items-center justify-center gap-3 w-full`}
  >
    {icon}
    <span className="text-2xl font-bold">{label}</span>
  </button>
);

// --- INVOICE MODAL ---
interface InvoiceProps {
  t: any;
  rows: TableRow[];
  date: string;
  total: number;
  onClose: () => void;
}

const InvoiceModal = ({ t, rows, date, total, onClose }: InvoiceProps) => {
  const handlePrint = () => {
    window.print();
  };

  const validRows = rows.filter(r => r.material.trim() !== '' || (parseFloat(r.weight) > 0 && parseFloat(r.price) > 0));
  const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  // Generate a random Philippine Invoice Number (SI No.)
  // Format: SI No. 001234
  const invoiceNumber = useMemo(() => {
    const randomSeq = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `SI No. ${randomSeq}`;
  }, []);

  return (
    <div id="invoice-modal" className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div id="invoice-content" className="bg-white text-black font-mono text-xs w-[320px] shadow-2xl relative overflow-hidden flex flex-col">
        <div className="p-6 pb-10 flex flex-col items-center">
          <div className="mb-2 text-center">
            <h2 className="text-xl font-bold tracking-tight">{t.record.companyName}</h2>
            <h3 className="text-2xl text-black font-medium mt-1">{t.invoice.proofCopy}</h3>
          </div>
          
          <div className="w-full border-t border-dashed border-black my-2"></div>
          
          <div className="w-full text-center text-xl font-bold tracking-widest mb-2">
            {invoiceNumber}
          </div>
          <div className="w-full flex justify-between text-[10px] mb-2 border-b border-black pb-1">
             <span>{date} {time}</span>
          </div>
          
          <div className="w-full mb-2">
            <div className="flex justify-between font-bold mb-1 border-b border-dashed border-gray-400 pb-1">
              <span className="w-24 text-left">{t.invoice.item}</span>
              <span className="w-12 text-center">{t.invoice.qty}</span>
              <span className="w-12 text-center">{t.invoice.price}</span>
              <span className="flex-1 text-right">{t.invoice.amt}</span>
            </div>
            {validRows.map((row, idx) => {
              const w = parseFloat(row.weight) || 0;
              const d = parseFloat(row.deduction) || 0;
              const p = parseFloat(row.price) || 0;
              
              // Logic: (Weight * (1 - Deduction/100)) * Price
              // Example: (100kg * (1 - 2/100)) * 10 = (100 * 0.98) * 10 = 98 * 10 = 980
              const netW = w * (1 - (d / 100));
              const subtotal = Math.round(netW * p);
              
              return (
                <div key={idx} className="flex flex-col mb-1">
                  <div className="text-left font-semibold">{row.material || 'Item'}</div>
                  <div className="flex justify-between text-black">
                    <span className="w-24 pl-2 text-[10px]">({d}%)</span>
                    <span className="w-12 text-center">{w}</span>
                    <span className="w-12 text-center">{p}</span>
                    <span className="flex-1 text-right">{subtotal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="w-full border-t-2 border-dashed border-black my-2"></div>
          <div className="w-full flex justify-between items-center mb-1">
            <span className="text-lg text-black font-bold">{t.invoice.totalAmount}</span>
            <div className="text-right">
              <div className="text-xl font-bold">${total.toLocaleString()}</div>
            </div>
          </div>
          
          {/* Signature Field */}
          <div className="w-full mt-6 mb-4 px-2">
            <div className="border-b border-black w-full h-8"></div>
            <div className="text-center text-[10px] mt-1">{t.invoice.signature}</div>
          </div>

          <div className="text-[9px] text-center mt-1">
            ** {t.invoice.footerNote} **
          </div>
        </div>
        <div className="no-print bg-gray-100 p-3 flex gap-2 border-t border-gray-200">
          <button onClick={handlePrint} className="flex-1 bg-gray-800 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-700">
            <Printer size={16} /> {t.invoice.print}
          </button>
          <button onClick={onClose} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
            <X size={16} /> {t.invoice.close}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- RECORD PAGE ---
interface TableRow {
  material: string;
  weight: string;
  deduction: string;
  price: string;
}

const RecordView = ({ t, onSave, onBack }: { t: any, onSave: (r: ExpenseRecord) => void, onBack: () => void }) => {
  const [rows, setRows] = useState<TableRow[]>([]);
  // Use state for date but do not provide a setter in UI (Read-only)
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    // REVERTED TO 5 ROWS
    setRows(Array.from({ length: 5 }, () => ({ material: '', weight: '', deduction: '', price: '' })));
  }, []);

  const handleRowChange = (index: number, field: keyof TableRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const addRow = () => {
    setRows([...rows, { material: '', weight: '', deduction: '', price: '' }]);
  };

  const calculateRowResult = (row: TableRow): number => {
    const w = parseFloat(row.weight);
    const d = parseFloat(row.deduction);
    const p = parseFloat(row.price);
    
    // If weight or price are not valid numbers, return 0
    if (isNaN(w) || isNaN(p)) return 0;
    
    // Treat NaN deduction as 0
    const deductionVal = isNaN(d) ? 0 : d;
    
    // Logic: (Weight * (1 - Deduction/100)) * Price
    // Example: (100kg * (1 - 2/100)) * 10 = (100 * 0.98) * 10 = 98 * 10 = 980
    const netWeight = w * (1 - (deductionVal / 100));
    const result = netWeight * p;
    
    // Round to integer (四捨五入)
    return Math.round(result);
  };

  const grandTotal = useMemo(() => {
    // Sum results
    const total = rows.reduce((sum, row) => sum + calculateRowResult(row), 0);
    return Math.round(total);
  }, [rows]);

  const handleSaveAction = async () => {
    if (grandTotal === 0 && !window.confirm("Total is 0. Save anyway?")) return;

    const code = window.prompt(t.record.enterCode);
    if (code !== "01021129") {
      alert(t.record.invalidCode);
      return;
    }

    setIsSaving(true);
    
    // Convert valid rows to RecordDetail objects
    const details: RecordDetail[] = rows
      .filter(r => r.material.trim() !== '' || (parseFloat(r.weight) > 0 && parseFloat(r.price) > 0))
      .map(r => ({
        material: r.material,
        weight: parseFloat(r.weight) || 0,
        deduction: parseFloat(r.deduction) || 0,
        price: parseFloat(r.price) || 0,
        result: calculateRowResult(r)
      }));

    // Create description for backward compatibility / list view
    const summaryItems = details.map(d => `${d.material || 'Item'}: ${d.weight}kg @ ${d.price}`);
    const description = `${t.record.companyName} - ${details.length} items. ${summaryItems.join(', ')}`;

    const newRecord: ExpenseRecord = {
      id: Date.now().toString(),
      amount: grandTotal,
      category: Category.OTHER,
      description: description,
      date,
      timestamp: Date.now(),
      details: details // Save detailed structure
    };
    
    try {
      await onSave(newRecord);
      alert(t.record.uploadSuccess);
    } catch (error: any) {
      console.error(error);
      alert(`Error uploading: ${error.message || error.code || 'Unknown error'}. Please check your Firebase Config and Rules.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title={t.record.title} onBack={onBack}>
      {/* CSS to hide number spinners (arrows) */}
      <style>{`
        /* Chrome, Safari, Edge, Opera */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Firefox */
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      <div className="flex flex-col gap-4">
        
        {/* Header Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50 flex flex-col items-center justify-center gap-3">
          <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">{t.record.companyName}</h2>
          
          {/* Read-only Date Display */}
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold border border-indigo-100">
            <Calendar size={16} className="text-indigo-500" />
            <span>{date}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={handleSaveAction} 
            disabled={isSaving}
            className={`flex-1 bg-indigo-600 text-white py-3 rounded-xl text-lg font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSaving ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <Save size={20} />}
            {t.record.save}
          </button>
          <button 
            onClick={() => setShowInvoice(true)} 
            className="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 py-3 rounded-xl text-lg font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-indigo-50"
          >
            <FileText size={20} />
            {t.record.invoice}
          </button>
        </div>

        {/* Table Wrapper - Optimized for Specific Widths */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white pb-2">
          {/* Removed min-w-[600px] to allow natural fit on mobile with optimized column widths */}
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-indigo-900 uppercase bg-indigo-50 border-b border-indigo-100">
              <tr>
                <th className="px-1 py-3 w-8 text-center font-bold tracking-wider">{t.record.colIndex}</th>
                <th className="px-1 py-3 w-32 text-center font-bold tracking-wider">{t.record.colMaterial}</th>
                <th className="px-1 py-3 w-16 text-center font-bold tracking-wider">{t.record.colWeight}</th>
                <th className="px-1 py-3 w-12 text-center font-bold tracking-wider">{t.record.colDeduction}</th>
                <th className="px-1 py-3 w-16 text-center font-bold tracking-wider">{t.record.colPrice}</th>
                <th className="px-1 py-3 text-right font-bold tracking-wider">{t.record.colResult}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={index} className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="px-1 py-3 text-center font-medium text-gray-400">{index + 1}</td>
                  
                  {/* Material Input: w-32 for ~12 chars */}
                  <td className="px-1 py-3">
                    <input 
                      type="text" 
                      value={row.material} 
                      onChange={(e) => handleRowChange(index, 'material', e.target.value)} 
                      className="w-full bg-transparent border-b border-gray-400 rounded-none px-1 py-2 text-base outline-none focus:border-indigo-600 focus:ring-0 transition-colors font-medium text-gray-800 placeholder-gray-300"
                      placeholder="..."
                      maxLength={12}
                    />
                  </td>
                  
                  {/* Weight Input: w-16 for 4 digits */}
                  <td className="px-1 py-3">
                    <input 
                      type="number" 
                      step="any"
                      inputMode="decimal" 
                      value={row.weight} 
                      onChange={(e) => handleRowChange(index, 'weight', e.target.value)} 
                      className="w-full text-right bg-transparent border-b border-gray-400 rounded-none px-1 py-2 text-base outline-none focus:border-indigo-600 focus:ring-0 transition-colors font-medium text-gray-800"
                    />
                  </td>
                  {/* Deduction Input: w-12 for 2 digits */}
                  <td className="px-1 py-3">
                    <input 
                      type="number" 
                      step="any"
                      inputMode="decimal" 
                      value={row.deduction} 
                      onChange={(e) => handleRowChange(index, 'deduction', e.target.value)} 
                      className="w-full text-right bg-transparent border-b border-gray-400 rounded-none px-1 py-2 text-base outline-none focus:border-indigo-600 focus:ring-0 transition-colors font-medium text-gray-800"
                    />
                  </td>
                  {/* Price Input: w-16 for 4 digits */}
                  <td className="px-1 py-3">
                    <input 
                      type="number" 
                      step="any"
                      inputMode="decimal" 
                      value={row.price} 
                      onChange={(e) => handleRowChange(index, 'price', e.target.value)} 
                      className="w-full text-right bg-transparent border-b border-gray-400 rounded-none px-1 py-2 text-base outline-none focus:border-indigo-600 focus:ring-0 transition-colors font-medium text-gray-800"
                    />
                  </td>
                  
                  {/* Result Cell */}
                  <td className="px-1 py-3 text-right font-bold text-indigo-600 text-base">
                    {calculateRowResult(row) > 0 ? calculateRowResult(row).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={addRow} className="flex items-center justify-center gap-2 p-3 text-indigo-600 border border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors font-medium">
          <Plus size={18} /> {t.record.addRow}
        </button>

        <div className="bg-gray-900 text-white p-5 rounded-2xl flex justify-between items-center shadow-xl mt-2">
          <span className="text-lg font-medium text-gray-300">{t.record.grandTotal}</span>
          <span className="text-3xl font-bold tracking-tight">${grandTotal.toLocaleString()}</span>
        </div>
      </div>
      {showInvoice && <InvoiceModal t={t} rows={rows} date={date} total={grandTotal} onClose={() => setShowInvoice(false)} />}
    </Layout>
  );
};

// --- VIEW RECORDS PAGE ---
interface FlattenedRow {
  id: string; // Unique ID for key (timestamp-index)
  recordId: string;
  date: string;
  material: string;
  weight: number;
  deduction: number;
  price: number;
  result: number;
  timestamp: number;
}

const SortableHeader = ({ label, sKey, currentSort, onSort, align = 'left', width }: { 
  label: string, 
  sKey: keyof FlattenedRow, 
  currentSort: { key: keyof FlattenedRow, direction: 'asc' | 'desc' }, 
  onSort: (k: keyof FlattenedRow) => void,
  align?: 'left' | 'center' | 'right',
  width?: string
}) => {
  const isSorted = currentSort.key === sKey;
  return (
    <th 
      className={`px-1 py-2 text-xs cursor-pointer hover:bg-gray-200 transition-colors select-none text-${align} ${width || ''}`}
      onClick={() => onSort(sKey)}
    >
      <div className={`flex items-center gap-0.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {label}
        <span className="text-gray-400">
          {isSorted ? (
            currentSort.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600" /> : <ArrowDown size={10} className="text-indigo-600" />
          ) : (
            <ArrowUpDown size={10} />
          )}
        </span>
      </div>
    </th>
  );
};

const ViewRecordsView = ({ t, lang, records, onBack }: { t: any, lang: Language, records: ExpenseRecord[], onBack: () => void }) => {
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchMat, setSearchMat] = useState('');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof FlattenedRow, direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  const printRef = useRef<HTMLDivElement>(null);

  // Flatten logic: Convert saved records (possibly containing multiple items) into a flat table list
  const allRows: FlattenedRow[] = useMemo(() => {
    return records.flatMap(record => {
      if (record.details && record.details.length > 0) {
        return record.details.map((detail, idx) => ({
          id: `${record.id}-${idx}`,
          recordId: record.id,
          date: record.date,
          material: detail.material,
          weight: detail.weight,
          deduction: detail.deduction,
          price: detail.price,
          result: detail.result,
          timestamp: record.timestamp
        }));
      } else {
        // Handle legacy records without details (show as one row)
        return [{
          id: record.id,
          recordId: record.id,
          date: record.date,
          material: record.description, // Use description as material name fallback
          weight: 0,
          deduction: 0,
          price: 0,
          result: record.amount,
          timestamp: record.timestamp
        }];
      }
    });
  }, [records]);

  // Filtering
  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      const matchDateStart = dateStart ? row.date >= dateStart : true;
      const matchDateEnd = dateEnd ? row.date <= dateEnd : true;
      const matchMat = searchMat ? row.material.toLowerCase().includes(searchMat.toLowerCase()) : true;
      return matchDateStart && matchDateEnd && matchMat;
    });
  }, [allRows, dateStart, dateEnd, searchMat]);

  // Sorting
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRows, sortConfig]);

  const totalFiltered = sortedRows.reduce((sum, row) => sum + row.result, 0);

  // Handlers
  const handleSort = (key: keyof FlattenedRow) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleExport = () => {
    const headers = [t.view.colDate, t.view.colMaterial, t.view.colWeight, t.view.colDeduction, t.view.colPrice, t.view.colResult];
    const csvContent = [
      headers.join(','),
      ...sortedRows.map(r => [
        r.date, 
        `"${r.material}"`, 
        r.weight, 
        r.deduction, 
        r.price, 
        r.result
      ].join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `amc_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    // We are using a specific print div (#print-table-area) handled by CSS media query in index.html 
    // but here we can just use window.print() and ensuring CSS hides everything else
    // To make this work smoothly with the existing modal print CSS, we need to ensure the table 
    // is visible and others hidden.
    // For this implementation, let's rely on specific print styles injected or scoped.
    
    // Quick hack for print: Create a print window or style dynamically
    const printContent = document.getElementById('print-table-container');
    if (printContent) {
       // Temporarily add a class to body to indicate printing table mode
       document.body.classList.add('printing-table');
       window.print();
       document.body.classList.remove('printing-table');
    }
  };

  return (
    <Layout title={t.view.title} onBack={onBack}>
      
      {/* Filters - Compacted */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col gap-3">
        <div className="flex gap-2">
           <div className="flex-1">
             <label className="text-xs font-medium text-gray-500 mb-1 block">{t.view.filterDateStart}</label>
             <input lang={lang} type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
           </div>
           <div className="flex-1">
             <label className="text-xs font-medium text-gray-500 mb-1 block">{t.view.filterDateEnd}</label>
             <input lang={lang} type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
           </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t.view.filterMaterial}</label>
          <div className="relative">
             <input type="text" placeholder={t.view.filterMaterial} value={searchMat} onChange={e => setSearchMat(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
             <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <button onClick={handleExport} className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-sm active:scale-95 transition-all">
          <Download size={18} /> {t.view.exportCSV}
        </button>
        <button onClick={handlePrint} className="flex-1 bg-gray-700 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 shadow-sm active:scale-95 transition-all">
          <Printer size={18} /> {t.view.printPDF}
        </button>
      </div>

      {/* Table Statistics */}
      <div className="bg-indigo-50 text-indigo-900 p-3 rounded-xl mb-3 flex justify-between items-center text-sm font-medium border border-indigo-100">
        <span>{t.view.totalSummary}:</span>
        <span className="text-lg font-bold">${totalFiltered.toLocaleString()}</span>
      </div>

      {/* Table - Optimized with SPECIFIC column widths to match Record View */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
        <div className="overflow-x-auto" id="print-table-container">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="text-gray-700 uppercase bg-gray-100 border-b">
              <tr>
                <th className="px-1 py-3 w-8 text-center">{t.view.colIndex}</th>
                {/* Applied very specific widths to fit mobile without scrolling */}
                <SortableHeader width="w-20" label={t.view.colDate} sKey="date" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader width="w-auto" label={t.view.colMaterial} sKey="material" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader width="w-12" label={t.view.colWeight} sKey="weight" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader width="w-10" label={t.view.colDeduction} sKey="deduction" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader width="w-12" label={t.view.colPrice} sKey="price" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader width="w-16" label={t.view.colResult} sKey="result" currentSort={sortConfig} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {t.view.noRecords}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-1 py-2 text-center text-gray-500">{index + 1}</td>
                    <td className="px-1 py-2 whitespace-nowrap text-gray-600">
                      {/* Format date according to language setting if possible */}
                      {row.date}
                    </td>
                    <td className="px-1 py-2 font-medium text-gray-900 break-words leading-tight">{row.material}</td>
                    <td className="px-1 py-2 text-right">{row.weight}</td>
                    <td className="px-1 py-2 text-right">{row.deduction}%</td>
                    <td className="px-1 py-2 text-right">{row.price}</td>
                    <td className="px-1 py-2 text-right font-bold">{row.result.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Hidden Print Style Trigger */}
      <style>{`
        @media print {
          body.printing-table * { visibility: hidden; }
          body.printing-table #print-table-container, 
          body.printing-table #print-table-container * { 
            visibility: visible; 
          }
          body.printing-table #print-table-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Hide the invoice modal when printing table */
          #invoice-modal { display: none !important; }
        }
      `}</style>
    </Layout>
  );
};

// --- SETTINGS PAGE ---
const SettingsView = ({ t, currentLang, onLanguageChange, onBack }: { t: any, currentLang: Language, onLanguageChange: (l: Language) => void, onBack: () => void }) => {
  return (
    <Layout title={t.settings.title} onBack={onBack}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Globe size={18} />
            {t.settings.selectLanguage}
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { id: Language.ZH_TW, label: '繁體中文' },
            { id: Language.EN, label: 'English' },
            { id: Language.FIL, label: 'Filipino' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => onLanguageChange(option.id)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className={`text-base ${currentLang === option.id ? 'font-bold text-indigo-600' : 'text-gray-700'}`}>
                {option.label}
              </span>
              {currentLang === option.id && (
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};