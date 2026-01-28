import React, { useState, useMemo, useRef } from 'react';
import { Search, Download, Printer, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from './Layout';
import { Language, ExpenseRecord } from '../types';
import { storageService } from '../services/storageService';

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

    const [sortConfig, setSortConfig] = useState<{ key: keyof FlattenedRow, direction: 'asc' | 'desc' }>({
        key: 'timestamp',
        direction: 'desc'
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

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
                <span>{t.view.totalSummary} ({sortedRows.length} items):</span>
                <span className="text-lg font-bold">${totalAmountFiltered.toLocaleString()}</span>
            </div>

            {/* Table - Optimized available space */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
                <div className="overflow-x-auto" id="print-table-container">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="text-gray-700 uppercase bg-gray-100 border-b">
                            <tr>
                                <th className="px-1 py-3 w-8 text-center">{t.view.colIndex}</th>
                                {/* Applied very specific widths to fit mobile without scrolling */}
                                <SortableHeader width="w-20" label={t.view.colDate} sKey="date" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-auto" label={t.view.colMaterial} sKey="material" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-12" label={t.view.colWeight} sKey="weight" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-10" label={t.view.colDeduction} sKey="deduction" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-12" label={t.view.colPrice} sKey="price" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortableHeader width="w-16" label={t.view.colResult} sKey="result" currentSort={sortConfig} onSort={handleSort} align="center" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-center">
                            {sortedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                        {t.view.noRecords}
                                    </td>
                                </tr>
                            ) : (
                                currentRows.map((row, index) => (
                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-1 py-2 text-center text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="px-1 py-2 whitespace-nowrap text-gray-600 text-center">
                                            {/* Format date according to language setting if possible */}
                                            {row.date}
                                        </td>
                                        <td className="px-1 py-2 font-medium text-gray-900 break-words leading-tight text-center">{row.material}</td>
                                        <td className="px-1 py-2 text-center">{row.weight}</td>
                                        <td className="px-1 py-2 text-center">{row.deduction}%</td>
                                        <td className="px-1 py-2 text-center">{row.price}</td>
                                        <td className="px-1 py-2 text-center font-bold">{row.result.toLocaleString()}</td>
                                    </tr>
                                ))
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
                        {sortedRows.map((row, index) => (
                            <tr key={row.id} className="border-b border-gray-200">
                                <td className="p-2 border border-gray-300">{index + 1}</td>
                                <td className="p-2 border border-gray-300">{row.date}</td>
                                <td className="p-2 border border-gray-300">{row.material}</td>
                                <td className="p-2 border border-gray-300">{row.weight}</td>
                                <td className="p-2 border border-gray-300">{row.deduction}%</td>
                                <td className="p-2 border border-gray-300">{row.price}</td>
                                <td className="p-2 border border-gray-300 font-bold">{row.result.toLocaleString()}</td>
                            </tr>
                        ))}
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
        </Layout >
    );
};
