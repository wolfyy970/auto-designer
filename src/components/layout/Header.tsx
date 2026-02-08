import { useState, useRef, useEffect } from 'react';
import { Pencil, FolderOpen, Settings } from 'lucide-react';
import { useSpecStore } from '../../stores/spec-store';
import SpecManager from '../shared/SpecManager';
import SettingsModal from '../shared/SettingsModal';

export default function Header() {
  const title = useSpecStore((s) => s.spec.title);
  const setTitle = useSpecStore((s) => s.setTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [showSpecManager, setShowSpecManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) setTitle(trimmed);
    setIsEditing(false);
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="rounded border border-gray-300 px-2 py-1 text-lg font-semibold text-gray-900 outline-none focus:border-gray-500"
            />
          ) : (
            <button
              onClick={startEditing}
              className="group flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-gray-100"
            >
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              <Pencil
                size={14}
                className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSpecManager(true)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            <FolderOpen size={14} />
            Specs
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <SpecManager
        open={showSpecManager}
        onClose={() => setShowSpecManager(false)}
      />
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
