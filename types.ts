export enum Language {
  ZH_TW = 'zh-TW',
  EN = 'en',
  FIL = 'fil'
}

export enum ViewState {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  RECORD = 'RECORD',
  VIEW = 'VIEW',
  SETTINGS = 'SETTINGS'
}

export enum Category {
  FOOD = 'food',
  TRANSPORT = 'transport',
  SHOPPING = 'shopping',
  ENTERTAINMENT = 'entertainment',
  HOUSING = 'housing',
  OTHER = 'other'
}

export interface RecordDetail {
  material: string;
  weight: number;
  deduction: number;
  price: number;
  result: number;
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string; // ISO string
  timestamp: number;
  details?: RecordDetail[]; // New field to store line items
}

export interface Translation {
  title: string;
  home: {
    record: string;
    view: string;
    settings: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    loginButton: string;
    loggingIn: string;
    welcome: string;
    logout: string;
    loginError: string;
  };
  record: {
    title: string;
    companyName: string;
    date: string;
    colIndex: string;
    colMaterial: string;
    colWeight: string;
    colDeduction: string;
    colPrice: string;
    colResult: string;
    grandTotal: string;
    addRow: string;
    save: string;
    saved: string;
    invoice: string;
    enterCode: string;
    invalidCode: string;
    uploadSuccess: string;
    clear: string;
  };
  invoice: {
    proofCopy: string;
    yearMonth: string;
    invoiceNum: string;
    randomNum: string;
    seller: string;
    item: string;
    qty: string;
    price: string;
    amt: string;
    totalAmount: string;
    cash: string;
    print: string;
    close: string;
    signature: string;
    footerNote: string;
  };
  view: {
    title: string;
    filterDateStart: string;
    filterDateEnd: string;
    filterMaterial: string;
    exportCSV: string;
    printPDF: string;
    colIndex: string;
    colDate: string;
    colMaterial: string;
    colWeight: string;
    colDeduction: string;
    colPrice: string;
    colResult: string;
    noRecords: string;
    delete: string;
    totalSummary: string;
  };
  settings: {
    title: string;
    language: string;
    selectLanguage: string;
  };
  categories: Record<Category, string>;
}