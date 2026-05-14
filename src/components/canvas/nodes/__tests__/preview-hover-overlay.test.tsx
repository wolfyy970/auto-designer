/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { PreviewHoverOverlay } from '../PreviewHoverOverlay';

// Radix Slot is pulled in transitively via the DS Button; stub to passthrough.
vi.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children }: { children: React.ReactNode }) => children as React.ReactElement,
}));

afterEach(() => cleanup());

describe('PreviewHoverOverlay', () => {
  it('renders a button labelled "Preview" with the provided aria-label', () => {
    render(
      <PreviewHoverOverlay onClick={() => {}} ariaLabel="Open foo preview at full screen" />,
    );

    const button = screen.getByRole('button', { name: /open foo preview at full screen/i });
    expect(button).not.toBeNull();
    expect(button.textContent ?? '').toContain('Preview');
  });

  it('invokes onClick when the button is clicked', () => {
    const onClick = vi.fn();
    render(<PreviewHoverOverlay onClick={onClick} ariaLabel="Open bar preview" />);

    fireEvent.click(screen.getByRole('button', { name: /open bar preview/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not bubble pointer-down events to the parent (React Flow drag guard)', () => {
    // Pointer-down bubbling is what React Flow uses to start a node drag.
    // The component stops propagation on the Button itself.
    const onParentPointerDown = vi.fn();
    render(
      <div onPointerDown={onParentPointerDown}>
        <PreviewHoverOverlay onClick={() => {}} ariaLabel="Open baz preview" />
      </div>,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: /open baz preview/i }));

    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
