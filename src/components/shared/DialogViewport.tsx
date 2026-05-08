import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogZoomCompensationStyle } from '../../lib/dialog-zoom';

interface DialogViewportProps {
  children: ReactNode;
  zIndexClass?: string;
  className?: string;
  onBackdropClick?: () => void;
  backdropLabel?: string;
}

export function DialogViewport({
  children,
  zIndexClass = 'z-50',
  className = 'flex items-center justify-center p-4',
  onBackdropClick,
  backdropLabel = 'Close dialog',
}: DialogViewportProps) {
  const zoomCompensationStyle = useDialogZoomCompensationStyle();

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} ${className}`}>
      {onBackdropClick ? (
        <button
          type="button"
          className="absolute inset-0 bg-overlay"
          aria-label={backdropLabel}
          onClick={onBackdropClick}
        />
      ) : (
        <div className="absolute inset-0 bg-overlay" />
      )}
      <div
        className="relative z-10 flex w-full justify-center"
        style={zoomCompensationStyle}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
