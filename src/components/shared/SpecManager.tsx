import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, Copy, Trash2, Check } from 'lucide-react';
import { normalizeError } from '../../lib/error-utils';
import { useSpecStore } from '../../stores/spec-store';
import { useCompilerStore } from '../../stores/compiler-store';
import { useGenerationStore } from '../../stores/generation-store';
import { useCanvasStore } from '../../stores/canvas-store';
import { FEEDBACK_DISMISS_MS } from '../../lib/constants';
import {
  saveCanvas,
  getCanvasList,
  loadCanvas,
  deleteCanvas,
  exportCanvas,
  importCanvas,
} from '../../services/persistence';
import { generateId, now } from '../../lib/utils';
import Modal from './Modal';

interface SpecManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function SpecManager({ open, onClose }: SpecManagerProps) {
  const spec = useSpecStore((s) => s.spec);
  const loadCanvasAction = useSpecStore((s) => s.loadCanvas);
  const createNewCanvas = useSpecStore((s) => s.createNewCanvas);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track the spec list in React state so mutations trigger re-renders
  const [specs, setSpecs] = useState(() => getCanvasList());
  const [savedFeedback, setSavedFeedback] = useState(false);

  const refreshList = useCallback(() => {
    setSpecs(getCanvasList());
  }, []);

  // Refresh the list every time the modal opens
  useEffect(() => {
    if (open) refreshList();
  }, [open, refreshList]);

  // Reset dependent stores when switching to a different spec
  const resetDependentStores = useCallback(() => {
    useCompilerStore.getState().reset();
    useGenerationStore.getState().reset();
    useCanvasStore.getState().resetCanvas();
  }, []);

  const handleSave = useCallback(() => {
    saveCanvas(spec);
    refreshList();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), FEEDBACK_DISMISS_MS);
  }, [spec, refreshList]);

  const handleLoad = useCallback(
    (specId: string) => {
      // Auto-save current spec before switching
      saveCanvas(spec);
      const loaded = loadCanvas(specId);
      if (loaded) {
        resetDependentStores();
        loadCanvasAction(loaded);
        onClose();
      }
    },
    [spec, loadCanvasAction, resetDependentStores, onClose]
  );

  const handleDelete = useCallback(
    (specId: string) => {
      deleteCanvas(specId);
      refreshList();
    },
    [refreshList]
  );

  const handleExport = useCallback(() => {
    exportCanvas(spec);
  }, [spec]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        // Auto-save current spec before importing
        saveCanvas(spec);
        const imported = await importCanvas(file);
        resetDependentStores();
        loadCanvasAction(imported);
        onClose();
      } catch (err) {
        alert(normalizeError(err, 'Import failed'));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [spec, loadCanvasAction, resetDependentStores, onClose]
  );

  const handleDuplicate = useCallback(() => {
    const dup = {
      ...spec,
      id: generateId(),
      title: `${spec.title} (copy)`,
      createdAt: now(),
      lastModified: now(),
    };
    saveCanvas(dup);
    loadCanvasAction(dup);
    onClose();
  }, [spec, loadCanvasAction, onClose]);

  const handleNew = useCallback(() => {
    // Save current before creating new
    saveCanvas(spec);
    resetDependentStores();
    createNewCanvas();
    onClose();
  }, [spec, createNewCanvas, resetDependentStores, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Canvas Manager">
      <div className="space-y-4">
        {/* Current spec info */}
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-nano font-medium uppercase tracking-wide text-fg-muted">
            Currently editing
          </p>
          <p className="text-sm font-medium text-fg-secondary">{spec.title}</p>
        </div>

        {/* Actions for current spec */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded-md bg-fg px-3 py-1.5 text-xs font-medium text-bg hover:bg-fg/90"
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
            className="rounded-md border border-border px-3 py-1.5 text-xs text-fg-secondary hover:bg-surface"
          >
            New Canvas
          </button>
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-fg-secondary hover:bg-surface"
          >
            <Copy size={12} />
            Duplicate
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-fg-secondary hover:bg-surface"
          >
            <Download size={12} />
            Export JSON
          </button>
          <label className="flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-fg-secondary hover:bg-surface">
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
            <h3 className="mb-2 text-xs font-medium text-fg-secondary">
              Saved Canvases
            </h3>
            <div className="space-y-1">
              {specs.map((s) => {
                const isActive = s.id === spec.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                      isActive
                        ? 'border-accent bg-info-subtle'
                        : 'border-border-subtle hover:bg-surface'
                    }`}
                  >
                    <button
                      onClick={() => !isActive && handleLoad(s.id)}
                      disabled={isActive}
                      className="flex-1 text-left"
                    >
                      <span
                        className={`text-sm font-medium ${isActive ? 'text-info' : 'text-fg-secondary'}`}
                      >
                        {s.title}
                      </span>
                      {isActive && (
                        <span className="ml-2 inline-block rounded bg-accent-subtle px-1.5 py-0.5 text-nano font-medium text-info">
                          Active
                        </span>
                      )}
                      <span className="ml-2 text-xs text-fg-muted">
                        {new Date(s.lastModified).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={isActive}
                      className={`ml-2 rounded p-1 ${
                        isActive
                          ? 'cursor-not-allowed text-fg-faint'
                          : 'text-fg-muted hover:bg-error-subtle hover:text-error'
                      }`}
                      aria-label="Delete canvas"
                      title={
                        isActive
                          ? 'Cannot delete the active canvas'
                          : 'Delete canvas'
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
          <p className="text-xs text-fg-muted">
            No saved canvases yet. Click &ldquo;Save Current&rdquo; to save your
            work.
          </p>
        )}
      </div>
    </Modal>
  );
}
