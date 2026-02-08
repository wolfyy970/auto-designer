import { useState, useEffect } from 'react';
import Modal from './Modal';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const KEYS_STORAGE = 'auto-designer-api-keys';

function loadKeys(): { openrouter: string } {
  const raw = localStorage.getItem(KEYS_STORAGE);
  if (!raw) return { openrouter: '' };
  try {
    return JSON.parse(raw);
  } catch {
    return { openrouter: '' };
  }
}

function saveKeys(keys: { openrouter: string }) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [openrouterKey, setOpenrouterKey] = useState(() => loadKeys().openrouter);

  // Reload keys from storage when modal opens
  // This is a legitimate use of setState in effect - syncing with localStorage
  useEffect(() => {
    if (!open) return;

    const keys = loadKeys();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenrouterKey(prev => {
      const newValue = keys.openrouter;
      return prev !== newValue ? newValue : prev;
    });
  }, [open]);

  const handleSave = () => {
    saveKeys({ openrouter: openrouterKey });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          All API calls go through OpenRouter. One key for everything — compiler
          and generation. Set it here or in{' '}
          <code className="text-xs">.env.local</code> as{' '}
          <code className="text-xs">VITE_OPENROUTER_API_KEY</code>.
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            OpenRouter API Key
          </label>
          <input
            type="password"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            placeholder="sk-or-..."
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <p className="mt-1 text-xs text-gray-400">
            Get one at openrouter.ai — gives access to Claude, GPT-4o, Gemini,
            and more.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
