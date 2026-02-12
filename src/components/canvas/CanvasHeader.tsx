import { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, FolderOpen, Pencil } from 'lucide-react';
import { useSpecStore } from '../../stores/spec-store';
import { useCanvasStore } from '../../stores/canvas-store';
import SpecManager from '../shared/SpecManager';
import SettingsModal from '../shared/SettingsModal';

export default function CanvasHeader() {
  const title = useSpecStore((s) => s.spec.title);
  const setTitle = useSpecStore((s) => s.setTitle);
  const autoLayout = useCanvasStore((s) => s.autoLayout);
  const toggleAutoLayout = useCanvasStore((s) => s.toggleAutoLayout);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed) setTitle(trimmed);
    setIsEditing(false);
  }, [editValue, setTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') {
        setEditValue(title);
        setIsEditing(false);
      }
    },
    [handleSave, title]
  );

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-10 flex h-12 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-sm">
        {/* Left: Identity + workspace controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">
            Auto Designer
          </span>
          <span className="text-gray-300">|</span>
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-700 outline-none focus:border-gray-500"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              {title || 'Untitled Spec'}
              <Pencil size={12} className="text-gray-400" />
            </button>
          )}
          <span className="text-gray-300">|</span>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 select-none hover:text-gray-900">
            <input
              type="checkbox"
              checked={autoLayout}
              onChange={toggleAutoLayout}
              className="accent-blue-500"
            />
            Auto Layout
          </label>
        </div>

        {/* Right: Navigation actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSpecs(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            <FolderOpen size={14} />
            Specs
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <SpecManager open={showSpecs} onClose={() => setShowSpecs(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
