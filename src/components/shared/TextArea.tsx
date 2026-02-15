import { useEffect, useRef } from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}

export default function TextArea({
  value,
  onChange,
  placeholder,
  className = '',
  minRows = 4,
}: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, minRows * 24) + 'px';
  }, [value, minRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className={`w-full resize-none rounded-lg border border-border bg-bg px-4 py-3 text-sm text-fg placeholder-fg-muted outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/40 ${className}`}
    />
  );
}
