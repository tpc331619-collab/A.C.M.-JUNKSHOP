import React from 'react';
import { LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onBack, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-100 flex flex-col items-center relative overflow-hidden">
      {/* Decorative background blobs - consistent with Login */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
      {/* Container restricted to max-w-md to simulate mobile view on desktop */}
      <div className="w-full max-w-md min-h-screen bg-white shadow-2xl flex flex-col relative">

        {/* Header */}
        <header className="bg-indigo-600 text-white p-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1 hover:bg-indigo-500 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
              )}
              <h1 className="text-xl font-bold tracking-wide">{title}</h1>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            )}

            {!onLogout && <div className="w-8"></div>} {/* Spacer for centering if needed */}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="p-3 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
          <p>© {new Date().getFullYear()} A.C.M. JUNKSHOP</p>
          <p>All Rights Reserved</p>
        </footer>

      </div>
    </div>
  );
};