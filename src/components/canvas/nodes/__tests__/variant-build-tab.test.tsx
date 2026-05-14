/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { VariantBuildTab } from '../VariantBuildTab';

// The component pulls in `CanvasMarkdown`, which lazy-loads the heavy
// `streamdown` package. Stub it to a synchronous passthrough so the test
// doesn't depend on Suspense resolution or the markdown chunk.
vi.mock('../../variant-run/CanvasMarkdown', () => ({
  CanvasMarkdown: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="canvas-markdown-stub">{children}</div>
  ),
}));

afterEach(() => cleanup());

describe('VariantBuildTab', () => {
  it('renders the BUILD.md body when present', () => {
    const files = {
      'index.html': '<!doctype html>',
      'BUILD.md':
        '## Scope\nOne flow.\n\n## Working features\n### Submit observation\nUsers type into a textarea and click Submit.\n',
    };

    render(<VariantBuildTab files={files} />);

    const stub = screen.getByTestId('canvas-markdown-stub');
    expect(stub.textContent ?? '').toContain('Scope');
    expect(stub.textContent ?? '').toContain('Submit observation');
  });

  it('shows the empty state when BUILD.md is absent', () => {
    const files = { 'index.html': '<!doctype html>' };

    render(<VariantBuildTab files={files} />);

    expect(screen.queryByTestId('canvas-markdown-stub')).toBeNull();
    expect(screen.queryByText('No build report for this run.')).not.toBeNull();
  });

  it('shows the empty state when BUILD.md is whitespace only', () => {
    const files = { 'BUILD.md': '   \n\n' };

    render(<VariantBuildTab files={files} />);

    expect(screen.queryByTestId('canvas-markdown-stub')).toBeNull();
    expect(screen.queryByText('No build report for this run.')).not.toBeNull();
  });
});
