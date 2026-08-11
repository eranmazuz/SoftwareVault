import React, { useState, useEffect } from 'react';
import { HardDrive, Settings, Tag, ShieldAlert, Sun, Moon } from 'lucide-react';
import DashboardView from './views/DashboardView';
import SoftwareDetailView from './views/SoftwareDetailView';
import SettingsView from './views/SettingsView';
import LabelsView from './views/LabelsView';
import * as api from './api';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedSoftwareId, setSelectedSoftwareId] = useState(null);
  const [labels, setLabels] = useState([]);
  const [darkMode, setDarkMode] = useState(true);

  // Initialize theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load catalog labels once on start & provide ref function
  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const data = await api.fetchLabels();
      setLabels(data);
    } catch (err) {
      console.error('Failed to load labels globally', err);
    }
  };

  const handleSelectSoftware = (id) => {
    setSelectedSoftwareId(id);
    setCurrentView('detail');
  };

  const handleBackToLibrary = () => {
    setSelectedSoftwareId(null);
    setCurrentView('dashboard');
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onSelectSoftware={handleSelectSoftware}
            activeLabels={labels}
          />
        );
      case 'detail':
        return (
          <SoftwareDetailView
            softwareId={selectedSoftwareId}
            onBack={handleBackToLibrary}
            activeLabels={labels}
          />
        );
      case 'labels':
        return (
          <LabelsView
            labels={labels}
            onRefreshLabels={loadLabels}
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <div className="text-center py-20">
            <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">View not found</h2>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-900/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              onClick={handleBackToLibrary}
              className="flex items-center gap-2.5 cursor-pointer hover:scale-105 active:scale-95 transition"
            >
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-600/30">
                <HardDrive size={20} />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
                Software Vault
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => { setCurrentView('dashboard'); setSelectedSoftwareId(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  currentView === 'dashboard' || currentView === 'detail'
                    ? 'bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                }`}
              >
                <HardDrive size={14} />
                Library
              </button>

              <button
                onClick={() => { setCurrentView('labels'); setSelectedSoftwareId(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  currentView === 'labels'
                    ? 'bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                }`}
              >
                <Tag size={14} />
                Labels
              </button>

              <button
                onClick={() => { setCurrentView('settings'); setSelectedSoftwareId(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  currentView === 'settings'
                    ? 'bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                }`}
              >
                <Settings size={14} />
                Settings
              </button>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-900 transition cursor-pointer"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveView()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-900/50 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>© 2026 Software Vault. Powered by FastAPI & React. Running in Home Network mode.</p>
      </footer>
    </div>
  );
}
