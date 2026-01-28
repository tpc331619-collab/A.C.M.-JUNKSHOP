import React from 'react';
import { Globe, User as UserIcon, LogOut } from 'lucide-react';
import { Layout } from './Layout';
import { Language } from '../types';
import { User } from 'firebase/auth';

interface SettingsViewProps {
    t: any;
    currentLang: Language;
    onLanguageChange: (l: Language) => void;
    onBack: () => void;
    onLogout: () => void;
    user: User;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ t, currentLang, onLanguageChange, onBack, onLogout, user }) => {
    return (
        <Layout title={t.settings.title} onBack={onBack}>
            <div className="flex flex-col gap-6">
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

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {user.photoURL ? (
                            <img src={user.photoURL} className="w-12 h-12 rounded-full border" alt="Profile" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserIcon className="text-gray-500" />
                            </div>
                        )}
                        <div className="overflow-hidden">
                            <p className="font-bold text-gray-800 text-sm truncate">{user.displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all shadow-sm"
                >
                    <LogOut size={20} />
                    {t.auth.logout}
                </button>
            </div>
        </Layout>
    );
};
