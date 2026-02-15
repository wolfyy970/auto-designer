import { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, FolderOpen, Pencil, Sun, Moon, Monitor } from 'lucide-react';
import { useSpecStore } from '../../stores/spec-store';
import { useCanvasStore } from '../../stores/canvas-store';
import { useThemeStore, type ThemeMode } from '../../stores/theme-store';
import SpecManager from '../shared/SpecManager';
import SettingsModal from '../shared/SettingsModal';

const THEME_CYCLE: ThemeMode[] = ['dark', 'light', 'system'];
const THEME_ICON = {
  dark: Moon,
  light: Sun,
  system: Monitor,
} as const;

export default function CanvasHeader() {
  const title = useSpecStore((s) => s.spec.title);
  const setTitle = useSpecStore((s) => s.setTitle);
  const autoLayout = useCanvasStore((s) => s.autoLayout);
  const toggleAutoLayout = useCanvasStore((s) => s.toggleAutoLayout);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

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

  const cycleTheme = useCallback(() => {
    const idx = THEME_CYCLE.indexOf(themeMode);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setThemeMode(next);
  }, [themeMode, setThemeMode]);

  const ThemeIcon = THEME_ICON[themeMode];

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-10 flex h-header items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur-sm">
        {/* Left: Identity + workspace controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-fg">
            Auto Designer
          </span>
          <span className="text-fg-faint">|</span>
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="rounded border border-border px-2 py-0.5 text-sm text-fg-secondary outline-none focus:border-accent"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg"
            >
              {title || 'Untitled Spec'}
              <Pencil size={12} className="text-fg-muted" />
            </button>
          )}
          <span className="text-fg-faint">|</span>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-secondary select-none hover:text-fg">
            <input
              type="checkbox"
              checked={autoLayout}
              onChange={toggleAutoLayout}
              className="accent-accent"
            />
            Auto Layout
          </label>
        </div>

        {/* Right: Navigation actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSpecs(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-fg-secondary hover:bg-surface-raised"
          >
            <FolderOpen size={14} />
            Specs
          </button>
          <button
            onClick={cycleTheme}
            className="rounded-md p-1.5 text-fg-secondary hover:bg-surface-raised"
            title={`Theme: ${themeMode}`}
          >
            <ThemeIcon size={16} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-md p-1.5 text-fg-secondary hover:bg-surface-raised"
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
