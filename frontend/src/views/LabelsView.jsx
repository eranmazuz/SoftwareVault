import React, { useState } from 'react';
import { Tag, Plus, Edit2, Trash2, Check, X, Loader2, Info } from 'lucide-react';
import * as api from '../api';

export default function LabelsView({ labels, onRefreshLabels }) {
  const [newLabelName, setNewLabelName] = useState('');
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateLabel = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    try {
      setSubmitting(true);
      await api.createLabel(newLabelName.trim());
      setNewLabelName('');
      onRefreshLabels();
    } catch (err) {
      alert(err.message || 'Failed to create label');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (label) => {
    setEditingLabelId(label.id);
    setEditingLabelName(label.name);
  };

  const handleCancelEdit = () => {
    setEditingLabelId(null);
    setEditingLabelName('');
  };

  const handleSaveEdit = async (id) => {
    if (!editingLabelName.trim()) return;
    try {
      setSubmitting(true);
      await api.updateLabel(id, editingLabelName.trim());
      setEditingLabelId(null);
      onRefreshLabels();
    } catch (err) {
      alert(err.message || 'Failed to update label');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLabel = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the label "${name}"? This will detach the label from any installation files using it, but will NOT delete the files themselves.`)) return;
    try {
      setSubmitting(true);
      await api.deleteLabel(id);
      onRefreshLabels();
    } catch (err) {
      alert(err.message || 'Failed to delete label');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Catalog Labels
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage dynamic labels to categorize your installation packages (e.g. "64-bit", "32-bit", "portable", "patch").
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form: Add Label (1 column) */}
        <div className="md:col-span-1">
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus size={16} className="text-indigo-600" />
              Add New Label
            </h3>

            <form onSubmit={handleCreateLabel} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="e.g. 64-bit, portable"
                  required
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !newLabelName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Label'}
              </button>
            </form>
          </div>
        </div>

        {/* Right List: Display & Edit Labels (2 columns) */}
        <div className="md:col-span-2 space-y-4">
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Tag size={16} className="text-indigo-600" />
              Active Catalog Labels ({labels.length})
            </h3>

            {labels.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-xs py-6 text-center">
                No labels created yet. Add one to categorize installer uploads!
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                {labels.map((label) => (
                  <div key={label.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                    {editingLabelId === label.id ? (
                      <div className="flex gap-2 w-full pr-4">
                        <input
                          type="text"
                          value={editingLabelName}
                          onChange={(e) => setEditingLabelName(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2.5 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveEdit(label.id)}
                          className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-md hover:bg-emerald-500/20"
                          title="Save change"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-md hover:bg-slate-200"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                            {label.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Created {new Date(label.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleStartEdit(label)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                            title="Rename label"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteLabel(label.id, label.name)}
                            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                            title="Delete label"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-850 flex gap-2.5 items-start">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
              Deleting a label detaches it from all files, setting their label column in the database to null. It will never delete the actual installation files from disk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
