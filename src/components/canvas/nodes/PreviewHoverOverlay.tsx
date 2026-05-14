import { Button } from '@ds/components/ui/button';

type Props = {
  onClick: () => void;
  ariaLabel: string;
};

/**
 * Hover-and-focus scrim that surfaces a design-system Button as a "Preview"
 * affordance over a finished design thumbnail. The scrim itself is
 * non-interactive (`pointer-events-none`); the Button is the sole click target.
 * Visibility is driven by the parent container's `group` class via
 * `group-hover` and by descendant focus via `focus-within`, so keyboard users
 * see the scrim when they Tab to the Button.
 *
 * Used inside a parent that carries the `group relative` classes — see
 * `VariantNodeMultiFileBody` and `VariantNodeSingleFileBody`.
 */
export function PreviewHoverOverlay({ onClick, ariaLabel }: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-overlay-heavy opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClick}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={ariaLabel}
        className="nodrag pointer-events-auto"
      >
        Preview
      </Button>
    </div>
  );
}
