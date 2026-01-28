import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
              )}
              <h1 className="text-xl font-bold tracking-wide">{title}</h1>
            </div>
            <div className="w-8"></div> {/* Spacer for centering if needed */}
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