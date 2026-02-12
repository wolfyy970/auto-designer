import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Loader2, ChevronDown, AlertCircle, Eye } from 'lucide-react';
import { useProviderModels } from '../../hooks/useProviderModels';
import { useQueryClient } from '@tanstack/react-query';

interface ModelSelectorProps {
  label: string;
  providerId: string;
  selectedModelId: string;
  onChange: (modelId: string) => void;
}

export default function ModelSelector({
  label,
  providerId,
  selectedModelId,
  onChange,
}: ModelSelectorProps) {
  const { data: models, isLoading, isError } = useProviderModels(providerId);
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Auto-select first model when models load and nothing selected
  useEffect(() => {
    if (models && models.length > 0 && !selectedModelId) {
      onChange(models[0].id);
    }
  }, [models, selectedModelId, onChange]);

  // If selected model isn't in new list (provider changed), reset
  useEffect(() => {
    if (models && models.length > 0 && selectedModelId) {
      const found = models.some((m) => m.id === selectedModelId);
      if (!found) {
        onChange(models[0].id);
      }
    }
  }, [models, selectedModelId, onChange]);

  const filtered = useMemo(() => {
    if (!models) return [];
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [models, search]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, isOpen]);

  const select = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[highlightIndex]) {
            select(filtered[highlightIndex].id);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearch('');
          break;
      }
    },
    [isOpen, filtered, highlightIndex, select]
  );

  const selectedModel = models?.find((m) => m.id === selectedModelId);
  const displayValue = isOpen
    ? search
    : selectedModel?.name || selectedModelId || '';

  return (
    <div className="nodrag nowheel" ref={containerRef}>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              setSearch('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Loading models...' : 'Search models...'}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-2.5 pr-7 text-xs text-gray-800 outline-none focus:border-gray-400 disabled:opacity-60"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-gray-400">
            {!isOpen && selectedModel?.supportsVision && (
              <Eye size={10} className="text-blue-500" />
            )}
            {isLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ChevronDown size={12} />
            )}
          </span>
        </div>

        {isOpen && (
          <ul
            ref={listRef}
            className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            {isError && (
              <li className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-red-500">
                <AlertCircle size={12} />
                Failed to load
                <button
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: ['provider-models', providerId],
                    })
                  }
                  className="ml-auto text-blue-500 hover:underline"
                >
                  Retry
                </button>
              </li>
            )}
            {!isError && filtered.length === 0 && !isLoading && (
              <li className="px-2.5 py-2 text-xs text-gray-400">
                No models found
              </li>
            )}
            {filtered.map((m, i) => (
              <li
                key={m.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(m.id);
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`cursor-pointer px-2.5 py-1.5 text-xs ${
                  i === highlightIndex
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700'
                } ${m.id === selectedModelId ? 'font-medium' : ''}`}
              >
                <div className="flex items-center gap-1 truncate">
                  {m.name}
                  {m.supportsVision && (
                    <Eye size={10} className="shrink-0 text-blue-500" />
                  )}
                </div>
                {m.name !== m.id && (
                  <div className="truncate text-[10px] text-gray-400">
                    {m.id}
                    {m.contextLength
                      ? ` · ${Math.round(m.contextLength / 1024)}k ctx`
                      : ''}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
