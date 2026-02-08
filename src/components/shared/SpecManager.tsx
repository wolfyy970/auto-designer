import { useRef } from 'react';
import { Download, Upload, Copy, Trash2 } from 'lucide-react';
import { useSpecStore } from '../../stores/spec-store';
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

  const specs = getSpecList();

  const handleSave = () => {
    saveSpec(spec);
  };

  const handleLoad = (specId: string) => {
    const loaded = loadSpec(specId);
    if (loaded) {
      loadSpecAction(loaded);
      onClose();
    }
  };

  const handleDelete = (specId: string) => {
    deleteSpec(specId);
  };

  const handleExport = () => {
    exportSpec(spec);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importSpec(file);
      loadSpecAction(imported);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDuplicate = () => {
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
  };

  const handleNew = () => {
    // Save current before creating new
    saveSpec(spec);
    createNewSpec();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Spec Manager">
      <div className="space-y-4">
        {/* Actions for current spec */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            Save Current
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
        {specs.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-500">
              Saved Specs
            </h3>
            <div className="space-y-1">
              {specs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 hover:bg-gray-50"
                >
                  <button
                    onClick={() => handleLoad(s.id)}
                    className="flex-1 text-left"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {s.title}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(s.lastModified).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete spec"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
