import React, { useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import { calculateRowResult } from '../utils/calculations';

interface TableRow {
    material: string;
    weight: string;
    deduction: string;
    price: string;
}

interface InvoiceProps {
    t: any;
    rows: TableRow[];
    date: string;
    total: number;
    onClose: () => void;
}

export const InvoiceModal = ({ t, rows, date, total, onClose }: InvoiceProps) => {
    const handlePrint = () => {
        window.print();
    };

    const validRows = rows.filter(r => r.material.trim() !== '' || (parseFloat(r.weight) > 0 && parseFloat(r.price) > 0));
    const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

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
                            const subtotal = calculateRowResult(row);

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
            {/* Print Styles */}
            <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }
                    /* Show only the invoice content */
                    #invoice-modal, #invoice-modal * {
                        visibility: visible;
                    }
                    #invoice-modal {
                        position: fixed; /* Use fixed positioning relative to viewport */
                        left: 0;
                        top: 0;
                        right: 0;
                        bottom: 0;
                        display: flex;
                        justify-content: center; /* Center horizontally */
                        align-items: flex-start; /* Align to top */
                        padding-top: 20mm; /* Space from top */
                        background: white;
                        margin: 0;
                        z-index: 9999;
                    }
                    #invoice-content {
                        box-shadow: none;
                        width: 320px;
                        border: 2px solid black !important;
                        border-radius: 0;
                        margin: 0; /* Flexbox handles centering */
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};
