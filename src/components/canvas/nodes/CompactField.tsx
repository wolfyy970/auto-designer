/** Shared labeled textarea for canvas nodes (HypothesisNode, CritiqueNode). */
export default function CompactField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  labelClassName = 'text-fg-muted',
  focusClassName = 'focus:border-accent',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  labelClassName?: string;
  focusClassName?: string;
}) {
  return (
    <div>
      <label className={`mb-0.5 block text-nano font-medium ${labelClassName}`}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`nodrag nowheel w-full resize-none rounded border border-border px-2 py-1.5 text-micro text-fg-secondary placeholder:text-fg-faint outline-none ${focusClassName}`}
      />
    </div>
  );
}
