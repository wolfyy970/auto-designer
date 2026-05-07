import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { RF_INTERACTIVE } from '../../../constants/canvas';

export type CanvasNodeSelectOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Array<CanvasNodeSelectOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

export function CanvasNodeSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  className,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (event.target instanceof Node && root?.contains(event.target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`${RF_INTERACTIVE} relative ${className ?? ''}`}>
      <button
        type="button"
        className="flex min-w-0 items-center gap-1 rounded border border-border bg-bg px-2 py-1 text-nano font-semibold text-fg-secondary outline-none input-focus disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown size={12} aria-hidden className="shrink-0 text-fg-muted" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-lg"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-nano font-semibold transition-colors ${
                  active
                    ? 'bg-accent text-accent-contrast'
                    : 'text-fg-secondary hover:bg-surface-nested hover:text-fg'
                }`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <Check
                  size={12}
                  aria-hidden
                  className={active ? 'opacity-100' : 'opacity-0'}
                />
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
