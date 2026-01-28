import React, { useState, useEffect, useMemo } from 'react';
import { Save, FileText, Calendar, Plus, Trash2 } from 'lucide-react';
import { Layout } from './Layout';
import { InvoiceModal } from './InvoiceModal';
import { calculateRowResult } from '../utils/calculations';
import { RecordDetail, ExpenseRecord, Category } from '../types';

interface TableRow {
    material: string;
    weight: string;
    deduction: string;
    price: string;
}

interface RecordViewProps {
    t: any;
    onSave: (r: ExpenseRecord) => Promise<void>;
    onBack: () => void;
}

export const RecordView: React.FC<RecordViewProps> = ({ t, onSave, onBack }) => {
    const [rows, setRows] = useState<TableRow[]>([]);
    // Use state for date but do not provide a setter in UI (Read-only)
    const [date] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [lastSaved, setLastSaved] = useState('');

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

    const grandTotal = useMemo(() => {
        // Sum results
        const total = rows.reduce((sum, row) => sum + calculateRowResult(row), 0);
        return Math.round(total);
    }, [rows]);

    const handleClear = () => {
        // Always confirm before clearing
        if (!window.confirm(t.record.clear + '?')) {
            return;
        }
        setRows(Array.from({ length: 5 }, () => ({ material: '', weight: '', deduction: '', price: '' })));
    };

    const handleSaveAction = async () => {
        if (grandTotal === 0 && !window.confirm("Total is 0. Save anyway?")) return;

        // Password check removed by user request
        // const code = window.prompt(t.record.enterCode);
        // if (code !== "01021129") {
        //     alert(t.record.invalidCode);
        //     return;
        // }

        setIsSaving(true);

        // Serialize rows for duplication check
        const currentDataString = JSON.stringify(rows);
        if (currentDataString === lastSaved) {
            alert("This record has already been saved.");
            setIsSaving(false);
            return;
        }

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
            setLastSaved(currentDataString);
            // Explicit success alert as requested
            setTimeout(() => alert(t.record.uploadSuccess), 100);
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
                        onClick={handleClear}
                        className="bg-gray-100 text-gray-700 w-24 py-3 rounded-xl text-lg font-bold shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1 hover:bg-gray-200 border border-gray-300"
                    >
                        <Trash2 size={20} />
                        <span className="text-sm">{t.record.clear}</span>
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
