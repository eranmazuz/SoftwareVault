import React, { useState, useEffect } from 'react';
import { Search, Plus, HardDrive, Cpu, Calendar, ShieldCheck, Tag, X, FileUp, Loader2, ArrowRight, Image as ImageIcon } from 'lucide-react';
import * as api from '../api';

export default function DashboardView({ onSelectSoftware, activeLabels }) {
  const [softwares, setSoftwares] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedOs, setSelectedOs] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    edition: '',
    os: 'Windows',
    tagsInput: '',
    catalog_label: '',
    cover_url: ''
  });

  // Extract all unique tags for filtering dropdown
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    loadSoftwares();
  }, [search, selectedOs, selectedTag]);

  const loadSoftwares = async () => {
    try {
      setLoading(true);
      const data = await api.fetchSoftwares(search, selectedOs, selectedTag);
      setSoftwares(data);
      
      // Update the tags filter list from all softwares
      const tagsSet = new Set();
      data.forEach(s => {
        if (s.tags) s.tags.forEach(t => tagsSet.add(t));
      });
      setAllTags(Array.from(tagsSet).sort());
      
      setError(null);
    } catch (err) {
      setError('Failed to load software catalog');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setAnalyzing(true);
    
    try {
      // Step 1: AI (or fallback) Analysis of filename
      const analysis = await api.analyzeFilename(file.name);
      setFormData({
        name: analysis.name || '',
        edition: analysis.edition || '',
        os: analysis.os || 'Windows',
        tagsInput: (analysis.tags || []).join(', '),
        catalog_label: activeLabels[0]?.name || '',
        cover_url: analysis.cover_url || ''
      });
    } catch (err) {
      console.error('Filename analysis error:', err);
      const fallbackName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setFormData({
        name: fallbackName,
        edition: '',
        os: 'Windows',
        tagsInput: '',
        catalog_label: activeLabels[0]?.name || '',
        cover_url: ''
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAndUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    
    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 2: Create the software entry
      const tagsList = formData.tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const softwareEntry = await api.createSoftware({
        name: formData.name,
        edition: formData.edition || null,
        os: formData.os,
        tags: tagsList,
        cover_url: formData.cover_url || null
      });

      // Step 3: If cover file is selected, upload it
      if (coverFile) {
        await api.uploadSoftwareCover(softwareEntry.id, coverFile);
      }

      // Step 4: Upload the installer file linked to the entry with dynamic label
      // Determine if label is an existing one or a new string
      const matchedLabel = activeLabels.find(l => l.name.toLowerCase() === formData.catalog_label.toLowerCase().trim());
      const labelId = matchedLabel ? matchedLabel.id : null;
      const labelName = matchedLabel ? null : formData.catalog_label.trim();

      await api.uploadFile(
        softwareEntry.id,
        labelId,
        labelName || formData.catalog_label,
        uploadFile,
        (progress) => setUploadProgress(progress)
      );

      // Reset & close
      setIsModalOpen(false);
      setUploadFile(null);
      setCoverFile(null);
      setCoverPreview(null);
      loadSoftwares();
    } catch (err) {
      alert(err.message || 'Error occurred during creation/upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getOsBadgeColor = (os) => {
    switch (os.toLowerCase()) {
      case 'windows': return 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
      case 'macos': return 'bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20';
      case 'linux': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      default: return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    }
  };

  const getCoverGradientClass = (name) => {
    const charSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = (charSum % 5) + 1; // 1 to 5
    return `gradient-seed-${seed}`;
  };

  return (
    <div className="space-y-6">
      {/* Header section with search & actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Software Library
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Browse, manage, and download software packages from your local vault.
          </p>
        </div>
        
        <button
          onClick={() => {
            setFormData({ name: '', edition: '', os: 'Windows', tagsInput: '', catalog_label: activeLabels[0]?.name || '' });
            setUploadFile(null);
            setCoverFile(null);
            setCoverPreview(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          Add Software
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search software or editions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white"
          />
        </div>

        {/* OS Filter */}
        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['', 'Windows', 'macOS', 'Linux', 'Cross-platform'].map((os) => (
            <button
              key={os}
              onClick={() => setSelectedOs(os)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                selectedOs === os
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50'
              }`}
            >
              {os || 'All OS'}
            </button>
          ))}
        </div>

        {/* Tags filter dropdown */}
        <div className="w-full md:w-48 ml-auto">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            <option value="">All Tags</option>
            {allTags.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Software Catalog Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
          <p className="text-slate-500 dark:text-slate-400">Loading catalog...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl p-6 text-center">
          <p className="font-semibold">{error}</p>
          <button onClick={loadSoftwares} className="mt-2 text-sm text-indigo-600 hover:underline">Try Again</button>
        </div>
      ) : softwares.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <HardDrive className="mx-auto text-slate-400 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No software found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Get started by adding your first software installation package.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            Add Software
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {softwares.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSoftware(s.id)}
              className="group glass-panel premium-card rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-900 cursor-pointer overflow-hidden flex flex-col justify-between"
            >
              {/* Card Cover Image Header */}
              <div className="h-36 w-full relative overflow-hidden bg-slate-950">
                {s.cover_path ? (
                  <img
                    src={api.getSoftwareCoverUrl(s.id)}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full flex items-center justify-center text-white font-extrabold text-2xl ${getCoverGradientClass(s.name)}`}
                  style={{ display: s.cover_path ? 'none' : 'flex' }}
                >
                  <span className="opacity-80 drop-shadow">{s.name.substring(0, 2).toUpperCase()}</span>
                </div>
                
                {/* OS badge overlay */}
                <span className={`absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm ${getOsBadgeColor(s.os)}`}>
                  {s.os}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-bold text-slate-950 dark:text-white group-hover:text-indigo-500 transition duration-300">
                      {s.name}
                    </h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 font-semibold">
                      <HardDrive size={13} />
                      {s.file_count}
                    </span>
                  </div>
                  
                  {s.edition && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {s.edition}
                    </p>
                  )}

                  {s.tags && s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-4">
                      {s.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="bg-slate-100 dark:bg-slate-850/80 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-semibold border border-slate-200/20 dark:border-slate-800/20">
                          {tag}
                        </span>
                      ))}
                      {s.tags.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-bold self-center ml-1">
                          +{s.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="border-t border-slate-150/40 dark:border-slate-900 mt-5 pt-3.5 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1.5 transition text-indigo-500 duration-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI-Assisted Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-850">
              <h2 className="text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <FileUp className="text-indigo-500" size={22} />
                Add Software Entry
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                disabled={uploading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateAndUpload} className="p-6 space-y-4">
              {!uploadFile ? (
                // Step 1: Select Installer File
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer relative bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-950 transition">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required
                  />
                  <FileUp className="mx-auto text-slate-400 dark:text-slate-600 mb-3" size={36} />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Click or drag installer file to analyze
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports ISO, EXE, DMG, ZIP, RAR, tar.gz, etc.
                  </p>
                </div>
              ) : (
                // Step 2: Confirmation and Metadata editing
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200/20 dark:border-slate-850 flex items-center justify-between">
                    <div className="overflow-hidden pr-4">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">File Selected</p>
                      <p className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300 truncate">{uploadFile.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      disabled={uploading}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {analyzing ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="animate-spin text-indigo-500 mb-3" size={32} />
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">AI is extracting software metadata...</p>
                      <p className="text-xs text-slate-400 mt-1">Detecting name, version, edition, OS and tags</p>
                    </div>
                  ) : (
                    <>
                      {/* Cover Selection Row */}
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                          {coverPreview ? (
                            <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                          ) : formData.cover_url ? (
                            <img src={formData.cover_url} alt="Cover preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="text-slate-400" size={24} />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Software Cover Image
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            />
                            <button
                              type="button"
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold py-1.5 px-3 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                            >
                              Choose local cover...
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Software Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Edition (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Pro, 2026, Enterprise"
                            value={formData.edition}
                            onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Operating System *
                          </label>
                          <select
                            required
                            value={formData.os}
                            onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer font-medium"
                          >
                            <option value="Windows">Windows</option>
                            <option value="macOS">macOS</option>
                            <option value="Linux">Linux</option>
                            <option value="Cross-platform">Cross-platform</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Catalog Label *
                          </label>
                          {/* Searchable Combobox using Datalist */}
                          <input
                            type="text"
                            list="active-labels-list"
                            placeholder="Type label or select..."
                            required
                            value={formData.catalog_label}
                            onChange={(e) => setFormData({ ...formData, catalog_label: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                          <datalist id="active-labels-list">
                            {activeLabels.map(l => (
                              <option key={l.id} value={l.name} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          Tags (comma separated)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. IDE, Utility, Graphics"
                          value={formData.tagsInput}
                          onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-indigo-500">
                    <span>Uploading installer...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl cursor-pointer"
                  disabled={uploading}
                >
                  Cancel
                </button>
                {uploadFile && !analyzing && (
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        Create & Upload
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
