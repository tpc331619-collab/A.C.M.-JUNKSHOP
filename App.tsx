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
    <Layout title={t.title}>
      <div className="mb-4 bg-indigo-50 p-4 rounded-xl flex items-center gap-3 border border-indigo-100">
        {user.photoURL ? (
          <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700">
            <UserIcon size={20} />
          </div>
        )}
        <div>
          <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">{t.auth.welcome}</p>
          <p className="font-bold text-gray-800">{user.displayName || user.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 h-full justify-center pb-10">
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

const HomeButton = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) => (
  <button
    onClick={onClick}
    className={`${color} text-white p-8 rounded-2xl shadow-lg transform transition active:scale-95 flex flex-col items-center justify-center gap-3 w-full`}
  >
    {icon}
    <span className="text-2xl font-bold">{label}</span>
  </button>
);