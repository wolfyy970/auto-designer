import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, Copy, Trash2, Check } from 'lucide-react';
import { useSpecStore } from '../../stores/spec-store';
import { useCompilerStore } from '../../stores/compiler-store';
import { useGenerationStore } from '../../stores/generation-store';
import { useCanvasStore } from '../../stores/canvas-store';
import {
  saveSpec,
  getSpecList,
  loadSpec,
  deleteSpec,
  exportSpec,
  importSpec,
} from '../../services/persistence';
import { generateId, now } from '../../lib/utils';
import Modal from './Modal';

interface SpecManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function SpecManager({ open, onClose }: SpecManagerProps) {
  const spec = useSpecStore((s) => s.spec);
  const loadSpecAction = useSpecStore((s) => s.loadSpec);
  const createNewSpec = useSpecStore((s) => s.createNewSpec);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track the spec list in React state so mutations trigger re-renders
  const [specs, setSpecs] = useState(() => getSpecList());
  const [savedFeedback, setSavedFeedback] = useState(false);

  const refreshList = useCallback(() => {
    setSpecs(getSpecList());
  }, []);

  // Refresh the list every time the modal opens
  useEffect(() => {
    if (open) refreshList();
  }, [open, refreshList]);

  // Reset dependent stores when switching to a different spec
  const resetDependentStores = useCallback(() => {
    useCompilerStore.getState().reset();
    useGenerationStore.getState().reset();
    useCanvasStore.getState().reset();
  }, []);

  const handleSave = useCallback(() => {
    saveSpec(spec);
    refreshList();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  }, [spec, refreshList]);

  const handleLoad = useCallback(
    (specId: string) => {
      // Auto-save current spec before switching
      saveSpec(spec);
      const loaded = loadSpec(specId);
      if (loaded) {
        resetDependentStores();
        loadSpecAction(loaded);
        onClose();
      }
    },
    [spec, loadSpecAction, resetDependentStores, onClose]
  );

  const handleDelete = useCallback(
    (specId: string) => {
      deleteSpec(specId);
      refreshList();
    },
    [refreshList]
  );

  const handleExport = useCallback(() => {
    exportSpec(spec);
  }, [spec]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        // Auto-save current spec before importing
        saveSpec(spec);
        const imported = await importSpec(file);
        resetDependentStores();
        loadSpecAction(imported);
        onClose();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Import failed');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [spec, loadSpecAction, resetDependentStores, onClose]
  );

  const handleDuplicate = useCallback(() => {
    const dup = {
      ...spec,
      id: generateId(),
      title: `${spec.title} (copy)`,
      createdAt: now(),
      lastModified: now(),
    };
    saveSpec(dup);
    loadSpecAction(dup);
    onClose();
  }, [spec, loadSpecAction, onClose]);

  const handleNew = useCallback(() => {
    // Save current before creating new
    saveSpec(spec);
    resetDependentStores();
    createNewSpec();
    onClose();
  }, [spec, createNewSpec, resetDependentStores, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Spec Manager">
      <div className="space-y-4">
        {/* Current spec info */}
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Currently editing
          </p>
          <p className="text-sm font-medium text-gray-800">{spec.title}</p>
        </div>

        {/* Actions for current spec */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            {savedFeedback ? (
              <>
                <Check size={12} />
                Saved!
              </>
            ) : (
              'Save Current'
            )}
          </button>
          <button
            onClick={handleNew}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            New Spec
          </button>
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Copy size={12} />
            Duplicate
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Download size={12} />
            Export JSON
          </button>
          <label className="flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            <Upload size={12} />
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Saved specs list */}
        {specs.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-500">
              Saved Specs
            </h3>
            <div className="space-y-1">
              {specs.map((s) => {
                const isActive = s.id === spec.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                      isActive
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => !isActive && handleLoad(s.id)}
                      disabled={isActive}
                      className="flex-1 text-left"
                    >
                      <span
                        className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-800'}`}
                      >
                        {s.title}
                      </span>
                      {isActive && (
                        <span className="ml-2 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                          Active
                        </span>
                      )}
                      <span className="ml-2 text-xs text-gray-400">
                        {new Date(s.lastModified).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={isActive}
                      className={`ml-2 rounded p-1 ${
                        isActive
                          ? 'cursor-not-allowed text-gray-200'
                          : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                      }`}
                      aria-label="Delete spec"
                      title={
                        isActive
                          ? 'Cannot delete the active spec'
                          : 'Delete spec'
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            No saved specs yet. Click &ldquo;Save Current&rdquo; to save your
            work.
          </p>
        )}
      </div>
    </Modal>
  );
}
