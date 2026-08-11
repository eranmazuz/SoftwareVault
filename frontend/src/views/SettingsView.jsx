import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, AlertTriangle, Cpu, Loader2, Sparkles, Search, Save } from 'lucide-react';
import * as api from '../api';

export default function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState([]);
  const [modelSearch, setModelSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.fetchSettings();
      setSettings(data);
      
      // If key is configured, set dummy placeholder value
      if (data.openrouter_api_key_configured) {
        setApiKey(data.openrouter_api_key_masked || '••••••••••••••••');
        setConnected(true);
        // Load models list
        const modelsList = await api.fetchModels();
        setModels(modelsList);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    try {
      setConnecting(true);
      setError(null);
      setSuccessMsg(null);

      const result = await api.connectSettings(apiKey);
      setConnected(true);
      setModels(result.models || []);
      
      // Trigger a settings refresh to update the masked key
      const data = await api.fetchSettings();
      setSettings(data);
      setApiKey(data.openrouter_api_key_masked || '••••••••••••••••');

      setSuccessMsg('Successfully connected to OpenRouter!');
    } catch (err) {
      setError(err.message || 'Failed to connect. Please check your API key.');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectModel = async (modelId) => {
    try {
      setSavingModel(true);
      await api.saveSettings({ openrouter_model: modelId });
      setSettings(prev => ({ ...prev, openrouter_model: modelId }));
      
      setSuccessMsg(`Active model updated to ${modelId}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert('Failed to update active model');
    } finally {
      setSavingModel(false);
    }
  };

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(modelSearch.toLowerCase()) || 
    m.id.toLowerCase().includes(modelSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Configuration Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Configure OpenRouter integration to enable automated software metadata extraction.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* OpenRouter Connection Card */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="text-indigo-600" size={20} />
          OpenRouter Connection
        </h3>

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              OpenRouter API Key
            </label>
            <div className="flex gap-3">
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
              />
              <button
                type="submit"
                disabled={connecting || !apiKey.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Connecting...
                  </>
                ) : (
                  'Connect & Sync'
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Status:</span>
            {connected ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-0.5 rounded-full">
                Disconnected
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Model Selection Card */}
      {connected && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="text-indigo-600" size={20} />
                Active Model Selection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select which model to use for filename metadata extraction.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-2.5 px-4">
              <div className="col-span-8">Model Name</div>
              <div className="col-span-2 text-right">Prompt (1M)</div>
              <div className="col-span-2 text-right">Completion (1M)</div>
            </div>

            {/* Scrolling List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
              {filteredModels.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-xs py-8 text-center">
                  No matching models found.
                </p>
              ) : (
                filteredModels.map((model) => {
                  const isSelected = settings?.openrouter_model === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => !savingModel && handleSelectModel(model.id)}
                      className={`grid grid-cols-12 items-center text-xs py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition ${
                        isSelected ? 'bg-indigo-500/5 dark:bg-indigo-500/5 border-l-2 border-indigo-600 font-semibold' : ''
                      }`}
                    >
                      <div className="col-span-8 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 dark:text-slate-200 truncate">{model.name}</span>
                          {isSelected && (
                            <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Sparkles size={8} /> Active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5 truncate">{model.id}</span>
                      </div>
                      
                      <div className="col-span-2 text-right text-slate-600 dark:text-slate-400 font-mono">
                        ${model.input_price_per_m.toFixed(2)}
                      </div>
                      
                      <div className="col-span-2 text-right text-slate-600 dark:text-slate-400 font-mono">
                        ${model.output_price_per_m.toFixed(2)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Directory Info Card */}
      <div className="glass-panel p-6 rounded-2xl space-y-2">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">File Storage Library Directory</h4>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
          <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 block break-all">
            {settings?.library_path || '/library'}
          </code>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Installers are stored inside this directory on the host server. The backend maps file paths relative to this directory.
        </p>
      </div>
    </div>
  );
}
