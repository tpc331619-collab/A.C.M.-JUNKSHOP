import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { TRANSLATIONS } from './constants';
import { storageService } from './services/storageService';
import { Language, ViewState, ExpenseRecord } from './types';
import { User } from 'firebase/auth';
import { CreditCard, List, Settings, User as UserIcon } from 'lucide-react';

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
  useEffect(() => {
    // Load Language Settings
    const savedLang = storageService.getLanguage();
    setLang(savedLang);
    setT(TRANSLATIONS[savedLang]);

    // Subscribe to Auth State
    const unsubscribeAuth = storageService.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });

    // Subscribe to Firebase Data
    const unsubscribeData = storageService.subscribe((updatedRecords) => {
      setRecords(updatedRecords);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribeAuth();
      unsubscribeData();
    };
  }, []);

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