import React, { useState, useMemo, useRef } from 'react';
import { Search, Download, Printer, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, FileText, Trash2, Save, X, BarChart2 } from 'lucide-react';
import { Layout } from './Layout';
import { InvoiceModal } from './InvoiceModal';
import { Language, ExpenseRecord } from '../types';
import { storageService } from '../services/storageService';
import { calculateRowResult } from '../utils/calculations';

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
    itemIndex: number;
    totalItems: number;
    recordAmount: number;
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

const formatDateTwoLines = (dateStr: string) => {
    if (!dateStr) return { year: '', date: '' };
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return {
            year: parts[0],
            date: `${parts[1]}/${parts[2]}`
        };
    }
    return { year: '', date: dateStr };
};

interface ViewRecordsViewProps {
    t: any;
    lang: Language;
    records: ExpenseRecord[];
    onBack: () => void;
}

export const ViewRecordsView: React.FC<ViewRecordsViewProps> = ({ t, lang, records, onBack }) => {
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [searchMat, setSearchMat] = useState('');

    const [selectedInvoice, setSelectedInvoice] = useState<{
        rows: { material: string; weight: string; deduction: string; price: string }[];
        date: string;
        total: number;
        recordId: string;
    } | null>(null);

    const [editingItem, setEditingItem] = useState<{
        recordId: string;
        itemIndex: number;
        material: string;
        weight: string;
        deduction: string;
        price: string;
        txNum: number;
        date: string;
        totalItems: number;
    } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const [sortConfig, setSortConfig] = useState<{ key: keyof FlattenedRow, direction: 'asc' | 'desc' }>({
        key: 'timestamp',
        direction: 'desc'
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Breakdown state
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [breakdownMode, setBreakdownMode] = useState<'year' | 'month' | 'week'>('month');

    const printRef = useRef<HTMLDivElement>(null);

    // Map each unique record to a transaction sequence number
    const recordTxMap = useMemo(() => {
        const map = new Map<string, number>();
        let count = 1;
        const sortedRecords = [...records].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        sortedRecords.forEach(r => {
            if (!map.has(r.id)) {
                map.set(r.id, count++);
            }
        });
        return map;
    }, [records]);

    // Flatten logic: Convert saved records into rows with transaction metadata
    const allRows: FlattenedRow[] = useMemo(() => {
        return records.flatMap(record => {
            if (record.details && record.details.length > 0) {
                const totalItems = record.details.length;
                return record.details.map((detail, idx) => ({
                    id: `${record.id}-${idx}`,
                    recordId: record.id,
                    date: record.date,
                    material: detail.material,
                    weight: detail.weight,
                    deduction: detail.deduction,
                    price: detail.price,
                    result: detail.result,
                    timestamp: record.timestamp,
                    itemIndex: idx,
                    totalItems: totalItems,
                    recordAmount: record.amount
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
                    timestamp: record.timestamp,
                    itemIndex: 0,
                    totalItems: 1,
                    recordAmount: record.amount
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

    const totalFiltered = sortedRows.length;

    // Pagination Logic
    const totalPages = Math.ceil(totalFiltered / itemsPerPage);
    const currentRows = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedRows.slice(start, start + itemsPerPage);
    }, [sortedRows, currentPage]);

    // Reset to page 1 when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [filteredRows]);

    // Calculate total amount separately for display if needed, but 'totalFiltered' usually refers to count or sum
    const totalAmountFiltered = sortedRows.reduce((sum, row) => sum + row.result, 0);

    // Breakdown computations
    const breakdownData = useMemo(() => {
        const getWeekKey = (dateStr: string) => {
            if (!dateStr) return 'Unknown';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            // ISO week: find Monday of the week
            const day = d.getDay(); // 0=Sun, 1=Mon...
            const diffToMon = (day === 0 ? -6 : 1 - day);
            const mon = new Date(d);
            mon.setDate(d.getDate() + diffToMon);
            const sun = new Date(mon);
            sun.setDate(mon.getDate() + 6);
            const fmt = (dt: Date) => `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
            return `${mon.getFullYear()} W${fmt(mon)}-${fmt(sun)}`;
        };

        const yearMap = new Map<string, number>();
        const monthMap = new Map<string, number>();
        const weekMap = new Map<string, number>();

        sortedRows.forEach(row => {
            if (!row.date) return;
            const parts = row.date.split('-');
            if (parts.length < 2) return;
            const y = parts[0];
            const ym = `${parts[0]}-${parts[1]}`;
            const wk = getWeekKey(row.date);

            yearMap.set(y, (yearMap.get(y) || 0) + row.result);
            monthMap.set(ym, (monthMap.get(ym) || 0) + row.result);
            weekMap.set(wk, (weekMap.get(wk) || 0) + row.result);
        });

        const sortDesc = (m: Map<string, number>) =>
            [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));

        return {
            year: sortDesc(yearMap),
            month: sortDesc(monthMap),
            week: sortDesc(weekMap),
        };
    }, [sortedRows]);

    // Handlers
    const handleSort = (key: keyof FlattenedRow) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleDelete = async (recordId: string) => {
        // Password check removed by user request
        // const code = window.prompt(t.record.enterCode);
        // if (code !== "01021129") {
        //     alert(t.record.invalidCode);
        //     return;
        // }

        if (window.confirm(t.view.delete + "?")) {
            try {
                await storageService.deleteRecord(recordId);
            } catch (error) {
                console.error(error);
                alert("Error deleting record");
            }
        }
    };

    const handleShowInvoice = (recordId: string) => {
        const rec = records.find(r => r.id === recordId);
        if (!rec) return;

        let invoiceRows: { material: string; weight: string; deduction: string; price: string }[] = [];
        if (rec.details && rec.details.length > 0) {
            invoiceRows = rec.details.map(d => ({
                material: d.material,
                weight: d.weight.toString(),
                deduction: d.deduction.toString(),
                price: d.price.toString()
            }));
        } else {
            invoiceRows = [{
                material: rec.description || 'Item',
                weight: '1',
                deduction: '0',
                price: rec.amount.toString()
            }];
        }

        setSelectedInvoice({
            rows: invoiceRows,
            date: rec.date,
            total: rec.amount,
            recordId: rec.id
        });
    };

    const handleOpenEdit = (row: FlattenedRow, txNum: number) => {
        setEditingItem({
            recordId: row.recordId,
            itemIndex: row.itemIndex,
            material: row.material,
            weight: row.weight.toString(),
            deduction: row.deduction.toString(),
            price: row.price.toString(),
            txNum,
            date: row.date,
            totalItems: row.totalItems
        });
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        const { recordId, itemIndex, material, weight, deduction, price } = editingItem;

        const w = parseFloat(weight) || 0;
        const d = parseFloat(deduction) || 0;
        const p = parseFloat(price) || 0;

        if (material.trim() === '' && w === 0 && p === 0) {
            alert(t.record?.emptyDataError || "Please enter valid data");
            return;
        }

        const rec = records.find(r => r.id === recordId);
        if (!rec) return;

        setIsUpdating(true);
        try {
            const updatedDetails = rec.details ? [...rec.details] : [];
            const newResult = calculateRowResult({ weight: w, deduction: d, price: p });

            if (updatedDetails.length > 0 && itemIndex < updatedDetails.length) {
                updatedDetails[itemIndex] = {
                    material: material.trim(),
                    weight: w,
                    deduction: d,
                    price: p,
                    result: newResult
                };
            } else {
                updatedDetails.push({
                    material: material.trim(),
                    weight: w,
                    deduction: d,
                    price: p,
                    result: newResult
                });
            }

            const newAmount = updatedDetails.reduce((sum, item) => sum + item.result, 0);
            const summaryItems = updatedDetails.map(item => `${item.material || 'Item'}: ${item.weight}kg @ ${item.price}`);
            const newDescription = `${t.record.companyName} - ${updatedDetails.length} items. ${summaryItems.join(', ')}`;

            const updatedRecord: ExpenseRecord = {
                ...rec,
                amount: newAmount,
                description: newDescription,
                details: updatedDetails
            };

            await storageService.addRecord(updatedRecord);
            setEditingItem(null);
        } catch (err: any) {
            console.error(err);
            alert(`Error updating: ${err.message || 'Unknown error'}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!editingItem) return;
        if (!window.confirm(t.view.deleteConfirm || "確定要刪除此品項嗎？")) return;

        const { recordId, itemIndex } = editingItem;
        const rec = records.find(r => r.id === recordId);
        if (!rec) return;

        setIsUpdating(true);
        try {
            if (!rec.details || rec.details.length <= 1) {
                // If only 1 item, delete the entire record
                await storageService.deleteRecord(recordId);
            } else {
                // Remove item and recalculate total
                const updatedDetails = rec.details.filter((_, idx) => idx !== itemIndex);
                const newAmount = updatedDetails.reduce((sum, item) => sum + item.result, 0);
                const summaryItems = updatedDetails.map(item => `${item.material || 'Item'}: ${item.weight}kg @ ${item.price}`);
                const newDescription = `${t.record.companyName} - ${updatedDetails.length} items. ${summaryItems.join(', ')}`;

                const updatedRecord: ExpenseRecord = {
                    ...rec,
                    amount: newAmount,
                    description: newDescription,
                    details: updatedDetails
                };

                await storageService.addRecord(updatedRecord);
            }
            setEditingItem(null);
        } catch (err: any) {
            console.error(err);
            alert(`Error deleting: ${err.message || 'Unknown error'}`);
        } finally {
            setIsUpdating(false);
        }
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
        link.setAttribute("download", `amc_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        // Quick hack for print: Create a print window or style dynamically
        const printContent = document.getElementById('printable-full-list');
        if (printContent) {
            // Temporarily add a class to body to indicate printing table mode
            document.body.classList.add('printing-list');
            window.print();
            document.body.classList.remove('printing-list');
        }
    };

    return (
        <Layout title={t.view.title} onBack={onBack}>

            {/* Filters - Glass Card */}
            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-white/60 mb-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full mix-blend-multiply opacity-50 blur-xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex flex-col gap-4 relative z-10">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-black text-indigo-900 mb-1.5 block tracking-widest bg-white/50 w-fit px-1 rounded">{t.view.filterDateStart}</label>
                            <input lang={lang} type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-gray-900 font-bold shadow-sm appearance-none" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-black text-indigo-900 mb-1.5 block tracking-widest bg-white/50 w-fit px-1 rounded">{t.view.filterDateEnd}</label>
                            <input lang={lang} type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-gray-900 font-bold shadow-sm appearance-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-black text-indigo-900 mb-1.5 block tracking-widest bg-white/50 w-fit px-1 rounded">{t.view.filterMaterial}</label>
                        <div className="relative">
                            <input type="text" placeholder={t.view.filterMaterial} value={searchMat} onChange={e => setSearchMat(e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 placeholder-gray-500 font-bold shadow-sm" />
                            <Search size={18} className="absolute left-3.5 top-2.5 text-gray-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Statistics — expandable */}
            <div className="mb-4">
                <button
                    onClick={() => setShowBreakdown(v => !v)}
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-4 rounded-2xl flex justify-between items-center text-sm font-medium shadow-md hover:from-indigo-600 hover:to-blue-700 active:scale-[0.99] transition-all"
                >
                    <span className="opacity-90">{t.view.totalSummary} ({sortedRows.length}):</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight">${totalAmountFiltered.toLocaleString()}</span>
                        <ChevronDown
                            size={18}
                            className={`opacity-70 transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`}
                        />
                    </div>
                </button>

                {/* Breakdown Panel */}
                {showBreakdown && (
                    <div className="mt-2 bg-white/90 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Mode tabs */}
                        <div className="flex border-b border-indigo-50">
                            {(['year', 'month', 'week'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setBreakdownMode(mode)}
                                    className={`flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-all ${breakdownMode === mode
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-indigo-400 hover:bg-indigo-50'
                                        }`}
                                >
                                    {mode === 'year' ? (t.view.byYear || 'Year') : mode === 'month' ? (t.view.byMonth || 'Month') : (t.view.byWeek || 'Week')}
                                </button>
                            ))}
                        </div>
                        {/* Rows */}
                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                            {breakdownData[breakdownMode].length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-6">{t.view.noRecords}</p>
                            ) : (
                                breakdownData[breakdownMode].map(([key, total]) => (
                                    <div key={key} className="flex justify-between items-center px-4 py-2.5 hover:bg-indigo-50/40 transition-colors">
                                        <span className="text-xs font-semibold text-gray-600">{key}</span>
                                        <span className="text-sm font-black text-indigo-700">${total.toLocaleString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Table - Optimized available space */}
            <div className="bg-white/90 backdrop-blur rounded-3xl shadow-sm border border-white/60 overflow-hidden flex-1 flex flex-col min-h-[400px]">
                <div className="overflow-x-auto" id="print-table-container">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-1 py-3.5 w-12 text-center font-bold tracking-wider opacity-60">#</th>
                                {/* Applied very specific widths to fit mobile without scrolling */}
                                <SortableHeader width="w-16" label={t.view.colDate} sKey="date" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-auto" label={t.view.colMaterial} sKey="material" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-12" label={t.view.colWeight} sKey="weight" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-10" label={t.view.colDeduction} sKey="deduction" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-12" label={t.view.colPrice} sKey="price" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-16" label={t.view.colResult} sKey="result" currentSort={sortConfig} onSort={handleSort} align="center" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs text-center">
                            {sortedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2 opacity-50">
                                            <Search size={32} />
                                            <p>{t.view.noRecords}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentRows.map((row, index) => {
                                    const isSameAsNext = index < currentRows.length - 1 && currentRows[index + 1].recordId === row.recordId;
                                    const isSameAsPrev = index > 0 && currentRows[index - 1].recordId === row.recordId;
                                    const isMulti = row.totalItems > 1;
                                    const txNum = recordTxMap.get(row.recordId) || ((currentPage - 1) * itemsPerPage + index + 1);

                                    return (
                                        <React.Fragment key={row.id}>
                                            <tr
                                                onClick={() => handleOpenEdit(row, txNum)}
                                                className={`transition-colors cursor-pointer group ${isMulti ? 'bg-indigo-50/20 hover:bg-indigo-50/50' : 'hover:bg-indigo-50/40'} ${isSameAsNext ? 'border-b border-indigo-100/40' : ''}`}
                                                title={t.view.editItemTip || "Click to edit or delete"}
                                            >
                                                {/* Clean index: 2-1 for multi-item, 1 for single item */}
                                                <td className="px-1 py-2 text-center select-none">
                                                    {isMulti ? (
                                                        <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[11px] leading-tight">
                                                            {txNum}-{row.itemIndex + 1}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 font-semibold text-xs">{txNum}</span>
                                                    )}
                                                </td>
                                                {/* 2-line date: year on top, MM/DD below for minimal width + full clarity */}
                                                <td className="px-1 py-1.5 text-center select-none" title={row.date}>
                                                    {(() => {
                                                        const { year, date } = formatDateTwoLines(row.date);
                                                        return (
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                {year && (
                                                                    <span className="text-[10px] text-gray-400 font-semibold tracking-tight leading-none">
                                                                        {year}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs font-bold text-gray-700 leading-tight">
                                                                    {date}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-1 py-2 font-bold text-gray-700 break-words leading-tight text-center">{row.material}</td>
                                                <td className="px-1 py-2 text-center text-gray-600">{row.weight}</td>
                                                <td className="px-1 py-2 text-center text-gray-400">{row.deduction}</td>
                                                <td className="px-1 py-2 text-center text-gray-600">{row.price}</td>
                                                {/* If single-item tx, result is the total (has invoice icon). If multi-item, plain number */}
                                                <td className="px-1 py-2 text-center font-black">
                                                    {isMulti ? (
                                                        <span className="text-gray-800">{row.result.toLocaleString()}</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleShowInvoice(row.recordId);
                                                            }}
                                                            className="inline-flex items-center justify-center gap-1 font-black text-indigo-600 hover:text-indigo-800 hover:underline px-1 py-0.5 rounded transition-all active:scale-95"
                                                            title={t.view.viewInvoice || "View Invoice"}
                                                        >
                                                            <span>{row.result.toLocaleString()}</span>
                                                            <FileText size={11} className="text-indigo-500 shrink-0" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Show transaction subtotal bar ONLY when ending a multi-item transaction */}
                                            {isMulti && !isSameAsNext && (
                                                <tr
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShowInvoice(row.recordId);
                                                    }}
                                                    className="bg-indigo-50/80 hover:bg-indigo-100/90 border-b-2 border-indigo-200 text-indigo-900 font-bold text-xs cursor-pointer transition-colors group"
                                                    title={t.view.viewInvoice || "View the invoice"}
                                                >
                                                    <td colSpan={6} className="py-2 px-3 text-right text-[11px] text-indigo-700 font-bold">
                                                        <span className="inline-flex items-center gap-1.5 group-hover:underline">
                                                            🧾 {t.view.txTotal || 'View the invoice'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-1 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleShowInvoice(row.recordId);
                                                            }}
                                                            className="inline-flex items-center justify-center gap-1 font-black text-indigo-700 hover:text-indigo-950 text-xs active:scale-95 transition-all bg-white border border-indigo-200 px-2 py-1 rounded-lg shadow-2xs hover:bg-indigo-50"
                                                            title={t.view.viewInvoice || "View the invoice"}
                                                        >
                                                            <span>${row.recordAmount.toLocaleString()}</span>
                                                            <FileText size={11} className="text-indigo-600 shrink-0" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Hidden Printable Table (Full List) */}
            <div id="printable-full-list" className="hidden">
                <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold">{t.view.title}</h1>
                    <p className="text-sm text-gray-500">
                        {dateStart || '...'} - {dateEnd || '...'} | {t.view.totalSummary}: ${totalAmountFiltered.toLocaleString()}
                    </p>
                </div>
                <table className="w-full text-xs text-center border-collapse border border-gray-300">
                    <thead className="bg-gray-100 border-b border-gray-300">
                        <tr>
                            <th className="p-2 border border-gray-300">{t.view.colIndex}</th>
                            <th className="p-2 border border-gray-300">{t.view.colDate}</th>
                            <th className="p-2 border border-gray-300">{t.view.colMaterial}</th>
                            <th className="p-2 border border-gray-300">{t.view.colWeight}</th>
                            <th className="p-2 border border-gray-300">{t.view.colDeduction}</th>
                            <th className="p-2 border border-gray-300">{t.view.colPrice}</th>
                            <th className="p-2 border border-gray-300">{t.view.colResult}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.map((row, index) => {
                            const txNum = recordTxMap.get(row.recordId) || index + 1;
                            const isMulti = row.totalItems > 1;
                            return (
                                <tr key={row.id} className="border-b border-gray-200">
                                    <td className="p-2 border border-gray-300">
                                        {isMulti ? `${txNum}-${row.itemIndex + 1}` : txNum}
                                    </td>
                                    <td className="p-2 border border-gray-300">{row.date}</td>
                                    <td className="p-2 border border-gray-300">{row.material}</td>
                                    <td className="p-2 border border-gray-300">{row.weight}</td>
                                    <td className="p-2 border border-gray-300">{row.deduction}%</td>
                                    <td className="p-2 border border-gray-300">{row.price}</td>
                                    <td className="p-2 border border-gray-300 font-bold">{row.result.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {
                totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-4 no-print">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-medium text-gray-600">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )
            }

            {/* Hidden Print Style Trigger */}
            <style>{`
        @media print {
          body.printing-list * { visibility: hidden; }
          body.printing-list #printable-full-list, 
          body.printing-list #printable-full-list * { 
            visibility: visible; 
          }
          body.printing-list #printable-full-list {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important; /* Force display */
          }
          
          /* Ensuring table borders print correctly */
          #printable-full-list table { border-collapse: collapse; width: 100%; }
          #printable-full-list th, #printable-full-list td { border: 1px solid #000 !important; color: #000 !important; }
          
          /* Hide the invoice modal when printing table */
          #invoice-modal { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

            {selectedInvoice && (
                <InvoiceModal
                    t={t}
                    rows={selectedInvoice.rows}
                    date={selectedInvoice.date}
                    total={selectedInvoice.total}
                    recordId={selectedInvoice.recordId}
                    onClose={() => setSelectedInvoice(null)}
                />
            )}

            {/* Edit / Delete Item Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-[92vw] max-w-sm border border-indigo-50 relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-indigo-950">
                                    {t.view.editTitle || 'Edit Item'}
                                </h3>
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                                    #{editingItem.txNum}{editingItem.totalItems > 1 ? `-${editingItem.itemIndex + 1}` : ''}
                                </span>
                                {editingItem.date && (
                                    <span className="text-xs text-gray-400 font-medium">
                                        ({editingItem.date})
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setEditingItem(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">
                                    {t.view.colMaterial || 'Material'}
                                </label>
                                <input
                                    type="text"
                                    value={editingItem.material}
                                    onChange={e => setEditingItem({ ...editingItem, material: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white transition-all text-gray-800"
                                    placeholder="..."
                                    maxLength={20}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block text-center">
                                        {t.view.colWeight || 'Kilo'}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editingItem.weight}
                                        onChange={e => setEditingItem({ ...editingItem, weight: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white text-center text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block text-center">
                                        {t.view.colDeduction || '%'}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editingItem.deduction}
                                        onChange={e => setEditingItem({ ...editingItem, deduction: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white text-center text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block text-center">
                                        {t.view.colPrice || 'Price/KG'}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editingItem.price}
                                        onChange={e => setEditingItem({ ...editingItem, price: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white text-center text-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Live Subtotal */}
                            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-900">
                                    {t.view.colResult || 'Result'}:
                                </span>
                                <span className="text-xl font-black text-indigo-600">
                                    ${calculateRowResult({
                                        weight: editingItem.weight,
                                        deduction: editingItem.deduction,
                                        price: editingItem.price
                                    }).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleDeleteItem}
                                disabled={isUpdating}
                                className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-3 px-2 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 shadow-xs"
                            >
                                <Trash2 size={16} className="shrink-0" />
                                <span className="truncate">{t.view.deleteItem || 'Delete'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isUpdating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-2 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all min-w-0"
                            >
                                {isUpdating ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent shrink-0" />
                                ) : (
                                    <Save size={16} className="shrink-0" />
                                )}
                                <span className="truncate">{t.view.editSave || 'Save Changes'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout >
    );
};
