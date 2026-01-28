
interface RowData {
    weight: string | number;
    deduction: string | number;
    price: string | number;
}

export const calculateRowResult = (row: RowData): number => {
    const w = typeof row.weight === 'string' ? parseFloat(row.weight) : row.weight;
    const d = typeof row.deduction === 'string' ? parseFloat(row.deduction) : row.deduction;
    const p = typeof row.price === 'string' ? parseFloat(row.price) : row.price;

    // If weight or price are not valid numbers, return 0
    if (isNaN(w) || isNaN(p)) return 0;

    // Treat NaN deduction as 0
    const deductionVal = isNaN(d) ? 0 : d;

    // Logic: (Weight * (1 - Deduction/100)) * Price
    const netWeight = w * (1 - (deductionVal / 100));
    const result = netWeight * p;

    // Round to integer
    return Math.round(result);
};
