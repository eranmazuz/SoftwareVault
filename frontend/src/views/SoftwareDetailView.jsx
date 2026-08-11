import React, { useState, useEffect } from 'react';
import { ArrowLeft, HardDrive, ShieldCheck, Tag, Trash2, Edit, Plus, Copy, Download, Calendar, ExternalLink, FileUp, Loader2, X, Check, Save, Image as ImageIcon } from 'lucide-react';
import * as api from '../api';

export default function SoftwareDetailView({ softwareId, onBack, activeLabels }) {
  const [software, setSoftware] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Edit Software Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', edition: '', os: '', tagsInput: '' });

  // Custom Field Form state
  const [newField, setNewField] = useState({ key: '', value: '' });
  const [addingField, setAddingField] = useState(false);

  // License Form state
  const [newLicenseContent, setNewLicenseContent] = useState('');
  const [addingLicense, setAddingLicense] = useState(false);

  // File Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLabelText, setUploadLabelText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Cover image uploading state
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    loadSoftware();
  }, [softwareId]);

  const loadSoftware = async () => {
    try {
      setLoading(true);
      const data = await api.fetchSoftware(softwareId);
      setSoftware(data);
      setEditFormData({
        name: data.name,
        edition: data.edition || '',
        os: data.os,
        tagsInput: (data.tags || []).join(', ')
      });
      if (activeLabels.length > 0) {
        setUploadLabelText(activeLabels[0].name);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load software details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSoftware = async (e) => {
    e.preventDefault();
    try {
      const tagsList = editFormData.tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await api.updateSoftware(software.id, {
        name: editFormData.name,
        edition: editFormData.edition || null,
        os: editFormData.os,
        tags: tagsList
      });
      setIsEditModalOpen(false);
      loadSoftware();
    } catch (err) {
      alert('Failed to update software entry');
    }
  };

  const handleDeleteSoftware = async () => {
    if (!window.confirm(`Are you sure you want to delete ${software.name}? This will permanently delete all associated files and licenses.`)) return;
    try {
      await api.deleteSoftware(software.id);
      onBack();
    } catch (err) {
      alert('Failed to delete software');
    }
  };

  const handleCoverUploadDirect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      await api.uploadSoftwareCover(software.id, file);
      loadSoftware();
    } catch (err) {
      alert('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddCustomField = async (e) => {
    e.preventDefault();
    if (!newField.key.trim() || !newField.value.trim()) return;
    try {
      setAddingField(true);
      await api.addCustomField(software.id, newField.key.trim(), newField.value.trim());
      setNewField({ key: '', value: '' });
      loadSoftware();
    } catch (err) {
      alert(err.message || 'Failed to add custom field');
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteCustomField = async (key) => {
    if (!window.confirm(`Delete field "${key}"?`)) return;
    try {
      await api.deleteCustomField(software.id, key);
      loadSoftware();
    } catch (err) {
      alert('Failed to delete custom field');
    }
  };

  const handleAddLicense = async (e) => {
    e.preventDefault();
    if (!newLicenseContent.trim()) return;
    try {
      setAddingLicense(true);
      await api.addLicense(software.id, newLicenseContent.trim());
      setNewLicenseContent('');
      loadSoftware();
    } catch (err) {
      alert('Failed to add license/serial');
    } finally {
      setAddingLicense(false);
    }
  };

  const handleDeleteLicense = async (licenseId) => {
    if (!window.confirm('Are you sure you want to delete this license/serial?')) return;
    try {
      await api.deleteLicense(software.id, licenseId);
      loadSoftware();
    } catch (err) {
      alert('Failed to delete license');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setUploading(true);
      setUploadProgress(0);

      // Determine label
      const matchedLabel = activeLabels.find(l => l.name.toLowerCase() === uploadLabelText.toLowerCase().trim());
      const labelId = matchedLabel ? matchedLabel.id : null;
      const labelName = matchedLabel ? null : uploadLabelText.trim();

      await api.uploadFile(
        software.id,
        labelId,
        labelName || uploadLabelText,
        uploadFile,
        (progress) => setUploadProgress(progress)
      );
      setUploadFile(null);
      loadSoftware();
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileLabelChange = async (fileId, newLabelId) => {
    try {
      await api.updateFileLabel(fileId, newLabelId || null);
      loadSoftware();
    } catch (err) {
      alert('Failed to update file label');
    }
  };

  const handleFileDelete = async (fileId, filename) => {
    if (!window.confirm(`Are you sure you want to delete the file "${filename}"?`)) return;
    try {
      await api.deleteFile(fileId);
      loadSoftware();
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    const seed = (charSum % 5) + 1;
    return `gradient-seed-${seed}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400">Loading details...</p>
      </div>
    );
  }

  if (error || !software) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl p-6 text-center">
        <p className="font-semibold">{error || 'Software entry not found'}</p>
        <button onClick={onBack} className="mt-2 text-xs text-indigo-600 hover:underline flex items-center gap-1 mx-auto">
          <ArrowLeft size={16} /> Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Detail Header Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 font-semibold cursor-pointer text-xs"
        >
          <ArrowLeft size={16} />
          Back to Library
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-350 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-semibold py-1.5 px-3 rounded-xl cursor-pointer text-xs"
          >
            <Edit size={14} />
            Edit Metadata
          </button>
          <button
            onClick={handleDeleteSoftware}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-xl cursor-pointer text-xs"
          >
            <Trash2 size={14} />
            Delete Software
          </button>
        </div>
      </div>

      {/* Main Info Hero card with Cover Image */}
      <div className="glass-panel rounded-2xl border border-slate-200/40 dark:border-slate-900 overflow-hidden flex flex-col md:flex-row shadow-sm">
        {/* Cover Preview / Picker Block */}
        <div className="w-full md:w-56 h-56 relative overflow-hidden bg-slate-950 shrink-0 border-r border-slate-200/40 dark:border-slate-900 flex flex-col items-center justify-center">
          {software.cover_path ? (
            <img
              src={api.getSoftwareCoverUrl(software.id) + '?t=' + new Date().getTime()}
              alt={software.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-white font-black text-4xl ${getCoverGradientClass(software.name)}`}>
              {software.name.substring(0, 2).toUpperCase()}
            </div>
          )}

          {/* Change cover button overlay */}
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 hover:opacity-100 transition duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUploadDirect}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {uploadingCover ? (
              <Loader2 className="animate-spin text-white" size={24} />
            ) : (
              <>
                <ImageIcon className="text-white" size={24} />
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change Cover</span>
              </>
            )}
          </div>
        </div>

        {/* Info Block */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${getOsBadgeColor(software.os)}`}>
                {software.os}
              </span>
              {software.edition && (
                <span className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-200/20 dark:border-slate-800/20">
                  {software.edition}
                </span>
              )}
            </div>
            <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white mt-1">
              {software.name}
            </h2>
            {software.tags && software.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {software.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-200/20 dark:border-slate-850/30">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 mt-6 flex items-center gap-1.5">
            <Calendar size={13} />
            Registered on {new Date(software.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Installers & Licenses (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Installation Files card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <HardDrive className="text-indigo-500" size={20} />
              Installation Files
            </h3>

            {software.installation_files.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
                No installation files uploaded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {software.installation_files.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150/40 dark:border-slate-900 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1 overflow-hidden w-full md:w-3/5">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white truncate font-mono" title={file.original_filename}>
                        {file.original_filename}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                        <span>{formatBytes(file.file_size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5"><Calendar size={10} /> {new Date(file.uploaded_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Downloads: <span className="text-slate-700 dark:text-slate-350">{file.downloads}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      {/* Catalog label assignment dropdown */}
                      <select
                        value={file.catalog_label_id || ''}
                        onChange={(e) => handleFileLabelChange(file.id, e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs py-1 px-2.5 focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="">No Label</option>
                        {activeLabels.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>

                      <div className="flex gap-1.5">
                        <a
                          href={api.getDownloadUrl(file.id)}
                          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer"
                          title="Download installer"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          onClick={() => handleFileDelete(file.id, file.original_filename)}
                          className="p-2 bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-500 rounded-lg hover:scale-105 transition cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline file upload form */}
            <form onSubmit={handleFileUpload} className="border-t border-slate-150/40 dark:border-slate-900 pt-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload New Installer File</p>
              
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="file"
                    required
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center gap-2 cursor-pointer">
                    <FileUp size={16} />
                    {uploadFile ? uploadFile.name : 'Select file...'}
                  </div>
                </div>

                {/* Combobox datalist for labels */}
                <input
                  type="text"
                  list="detail-labels-list"
                  placeholder="Type label or select..."
                  required
                  value={uploadLabelText}
                  onChange={(e) => setUploadLabelText(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                <datalist id="detail-labels-list">
                  {activeLabels.map(l => (
                    <option key={l.id} value={l.name} />
                  ))}
                </datalist>

                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-indigo-500">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Licenses Section */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-indigo-500" size={20} />
              Licenses & Serials
            </h3>

            {software.licenses.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
                No licenses recorded for this software.
              </p>
            ) : (
              <div className="space-y-3.5">
                {software.licenses.map((lic) => (
                  <div
                    key={lic.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150/40 dark:border-slate-900 rounded-xl relative group"
                  >
                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-350 whitespace-pre-wrap break-all pr-12">
                      {lic.content}
                    </pre>
                    
                    <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => copyToClipboard(lic.content, lic.id)}
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 rounded-md cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === lic.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => handleDeleteLicense(lic.id)}
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 rounded-md cursor-pointer"
                        title="Delete license"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddLicense} className="border-t border-slate-150/40 dark:border-slate-900 pt-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add License / Serial</p>
              <textarea
                placeholder="Paste key, serial, or multi-line license info here..."
                required
                value={newLicenseContent}
                onChange={(e) => setNewLicenseContent(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={addingLicense || !newLicenseContent.trim()}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm cursor-pointer"
              >
                Add License
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Custom Fields */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Tag className="text-indigo-500" size={20} />
              Metadata Custom Fields
            </h3>

            {software.custom_fields.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-xs py-4 text-center">
                No custom fields defined.
              </p>
            ) : (
              <div className="space-y-2 border-b border-slate-150/40 dark:border-slate-900 pb-4">
                {software.custom_fields.map((field) => (
                  <div
                    key={field.key}
                    className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-150/40 dark:border-slate-900 group"
                  >
                    <div className="overflow-hidden mr-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{field.key}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-all">{field.value}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomField(field.key)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Remove field"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddCustomField} className="space-y-2.5 pt-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Custom Field</p>
              
              <div>
                <input
                  type="text"
                  placeholder="Key (e.g. Developer, Language)"
                  required
                  value={newField.key}
                  onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Value"
                  required
                  value={newField.value}
                  onChange={(e) => setNewField({ ...newField, value: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={addingField || !newField.key.trim() || !newField.value.trim()}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white font-semibold text-xs py-2 rounded-xl shadow-sm cursor-pointer"
              >
                Add Field
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Software Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-850">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Edit size={18} className="text-indigo-500" />
                Edit Software Details
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSoftware} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Software Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Edition (Optional)
                </label>
                <input
                  type="text"
                  value={editFormData.edition}
                  onChange={(e) => setEditFormData({ ...editFormData, edition: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Operating System *
                </label>
                <select
                  required
                  value={editFormData.os}
                  onChange={(e) => setEditFormData({ ...editFormData, os: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer font-medium"
                >
                  <option value="Windows">Windows</option>
                  <option value="macOS">macOS</option>
                  <option value="Linux">Linux</option>
                  <option value="Cross-platform">Cross-platform</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editFormData.tagsInput}
                  onChange={(e) => setEditFormData({ ...editFormData, tagsInput: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
