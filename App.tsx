import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { TRANSLATIONS } from './constants';
import { storageService } from './services/storageService';
import { Language, ViewState, ExpenseRecord } from './types';
import { User } from 'firebase/auth';
import { CreditCard, List, Settings, User as UserIcon, Download, Printer } from 'lucide-react';

// Import Views
import { LoginView } from './components/LoginView';
import { RecordView } from './components/RecordView';
import { ViewRecordsView } from './components/ViewRecordsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  // --- STATE ---
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [lang, setLang] = useState<Language>(Language.EN);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [t, setT] = useState(TRANSLATIONS[Language.EN]);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- INITIALIZATION ---
  // --- INITIALIZATION ---

  // 1. Load Language & Subscribe to Auth State (Run once)
  useEffect(() => {
    // Load Language
    const savedLang = storageService.getLanguage();
    setLang(savedLang);
    setT(TRANSLATIONS[savedLang]);

    // Subscribe to Auth
    const unsubscribeAuth = storageService.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Subscribe to Firebase Data (Only when user is authenticated)
  useEffect(() => {
    if (!user) {
      setRecords([]);
      return;
    }

    const unsubscribeData = storageService.subscribe((updatedRecords) => {
      setRecords(updatedRecords);
    });

    return () => unsubscribeData();
  }, [user]);

  // Update translation when language changes
  useEffect(() => {
    setT(TRANSLATIONS[lang]);
    storageService.setLanguage(lang);
  }, [lang]);

  // --- HANDLERS ---
  const handleAddRecord = async (record: ExpenseRecord) => {
    await storageService.addRecord(record);
    // setView(ViewState.HOME); // Stay on page to allow printing
  };

  const handleBack = () => setView(ViewState.HOME);

  const handleLogin = async () => {
    try {
      await storageService.loginWithGoogle();
    } catch (error) {
      // alert(t.auth.loginError); // Removed alert, handled in service or UI if needed
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await storageService.logout();
    setView(ViewState.HOME); // Reset view on logout
  };

  // Export all records as CSV directly from home
  const handleHomeExport = () => {
    const allRows: { date: string; material: string; weight: number; deduction: number; price: number; result: number }[] = [];
    records.forEach(record => {
      if (record.details && record.details.length > 0) {
        record.details.forEach(d => {
          allRows.push({ date: record.date, material: d.material, weight: d.weight, deduction: d.deduction, price: d.price, result: d.result });
        });
      } else {
        allRows.push({ date: record.date, material: record.description, weight: 0, deduction: 0, price: 0, result: record.amount });
      }
    });

    const headers = [t.view.colDate, t.view.colMaterial, t.view.colWeight, t.view.colDeduction, t.view.colPrice, t.view.colResult];
    const csvContent = [
      headers.join(','),
      ...allRows.map(r => [r.date, `"${r.material}"`, r.weight, r.deduction, r.price, r.result].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `amc_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print all records from home
  const handleHomePrint = () => {
    const allRows: { date: string; material: string; weight: number; deduction: number; price: number; result: number }[] = [];
    records.forEach(record => {
      if (record.details && record.details.length > 0) {
        record.details.forEach(d => {
          allRows.push({ date: record.date, material: d.material, weight: d.weight, deduction: d.deduction, price: d.price, result: d.result });
        });
      } else {
        allRows.push({ date: record.date, material: record.description, weight: 0, deduction: 0, price: 0, result: record.amount });
      }
    });
    const total = allRows.reduce((s, r) => s + r.result, 0);

    const rows = allRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.date}</td><td>${r.material}</td><td>${r.weight}</td><td>${r.deduction}%</td><td>${r.price}</td><td><b>${r.result.toLocaleString()}</b></td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>AMC Report</title><style>body{font-family:sans-serif;font-size:12px;padding:20px}h1{text-align:center;margin-bottom:4px}p{text-align:center;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:6px;text-align:center}</style></head><body><h1>A.C.M. JUNKSHOP</h1><p>${new Date().toLocaleDateString()} | Total: $${total.toLocaleString()}</p><table><thead><tr><th>#</th><th>${t.view.colDate}</th><th>${t.view.colMaterial}</th><th>${t.view.colWeight}</th><th>${t.view.colDeduction}</th><th>${t.view.colPrice}</th><th>${t.view.colResult}</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }
  };

  // --- RENDER VIEWS ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // FORCE LOGIN VIEW IF NO USER
  if (!user) {
    return <LoginView t={t} onLogin={handleLogin} />;
  }

  if (view === ViewState.RECORD) {
    return <RecordView t={t} onSave={handleAddRecord} onBack={handleBack} />;
  }

  if (view === ViewState.VIEW) {
    return <ViewRecordsView t={t} lang={lang} records={records} onBack={handleBack} />;
  }

  if (view === ViewState.SETTINGS) {
    return <SettingsView t={t} currentLang={lang} onLanguageChange={setLang} onBack={handleBack} onLogout={handleLogout} user={user} />;
  }

  // DEFAULT: HOME (Dashboard)
  return (
    <Layout title={t.title} onLogout={handleLogout}>
      <div className="flex flex-col h-full relative">
        {/* Profile Card */}
        <div className="mb-6 bg-white/50 backdrop-blur-sm p-4 rounded-2xl flex items-center gap-4 border border-white/60 shadow-sm">
          <div className="relative">
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shadow-md">
                <UserIcon size={24} />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-0.5">{t.auth.welcome}</p>
            <p className="text-xl font-black text-gray-800 tracking-tight">{user.displayName || user.email}</p>
            <p className="text-xs text-gray-400 font-medium mt-1">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid gap-5 flex-1 content-start">
          <HomeButton
            icon={<CreditCard size={32} />}
            label={t.home.record}
            description={t.record?.subtitle || "Create new transaction"}
            onClick={() => setView(ViewState.RECORD)}
            color="from-blue-500 to-indigo-600"
            iconColor="text-blue-50"
          />
          <HomeButton
            icon={<List size={32} />}
            label={t.home.view}
            description={t.view?.subtitle || "View history & reports"}
            onClick={() => setView(ViewState.VIEW)}
            color="from-emerald-500 to-teal-600"
            iconColor="text-emerald-50"
          />
          {/* Export & Print row */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleHomeExport}
              disabled={records.length === 0}
              className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 p-5 rounded-3xl shadow-lg hover:shadow-xl transform transition-all duration-300 active:scale-[0.98] flex flex-col items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-violet-50">
                <Download size={22} />
              </div>
              <span className="text-xs font-bold text-white tracking-wide">{t.view.exportCSV}</span>
            </button>
            <button
              onClick={handleHomePrint}
              disabled={records.length === 0}
              className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 p-5 rounded-3xl shadow-lg hover:shadow-xl transform transition-all duration-300 active:scale-[0.98] flex flex-col items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-amber-50">
                <Printer size={22} />
              </div>
              <span className="text-xs font-bold text-white tracking-wide">{t.view.printPDF}</span>
            </button>
          </div>
          <HomeButton
            icon={<Settings size={32} />}
            label={t.home.settings}
            description={t.settings?.subtitle || "System configuration"}
            onClick={() => setView(ViewState.SETTINGS)}
            color="from-slate-600 to-slate-800"
            iconColor="text-slate-50"
          />
        </div>
      </div>
    </Layout>
  );
}

const HomeButton = ({ icon, label, description, onClick, color, iconColor }: { icon: React.ReactNode, label: string, description: string, onClick: () => void, color: string, iconColor: string }) => (
  <button
    onClick={onClick}
    className={`group relative overflow-hidden bg-gradient-to-br ${color} p-6 rounded-3xl shadow-lg hover:shadow-xl transform transition-all duration-300 active:scale-[0.98] text-left w-full h-32 flex items-center`}
  >
    {/* Decorative background circles */}
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-5 rounded-full blur-lg"></div>

    <div className={`p-4 rounded-2xl bg-white/20 backdrop-blur-md ${iconColor} mr-5 shadow-inner`}>
      {icon}
    </div>

    <div className="flex-1 z-10 text-white">
      <h3 className="text-2xl font-bold tracking-tight mb-1">{label}</h3>
      <p className="text-blue-50/80 text-sm font-medium">{description}</p>
    </div>

    <div className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m9 18 6-6-6-6" /></svg>
    </div>
  </button>
);