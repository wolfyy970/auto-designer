import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface NodeHeaderProps {
  onRemove: () => void;
  /** Optional subtitle below the title row */
  description?: ReactNode;
  /** Override the outer div className (default: border-b border-border-subtle) */
  className?: string;
  /** Title area — h3, input, or any element placed before the X button */
  children: ReactNode;
}

export default function NodeHeader({
  onRemove,
  description,
  className = 'border-b border-border-subtle',
  children,
}: NodeHeaderProps) {
  return (
    <div className={`px-3 py-2.5 ${className}`}>
      <div className="flex items-center gap-2">
        {children}
        <button
          onClick={onRemove}
          className="nodrag ml-auto shrink-0 rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
      {description != null && (
        <p className="mt-0.5 text-nano leading-tight text-fg-muted">
          {description}
        </p>
      )}
    </div>
  );
}
