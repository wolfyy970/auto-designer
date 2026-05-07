// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ArtifactPreviewFrame from '../ArtifactPreviewFrame';

describe('ArtifactPreviewFrame', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders a bundled srcDoc fallback while URL preview registration is pending', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));

    render(
      <ArtifactPreviewFrame
        files={{
          'index.html': '<!doctype html><html><body><h1>Loaded design</h1></body></html>',
        }}
        title="Preview: Test"
      />,
    );

    const frame = await screen.findByTitle<HTMLIFrameElement>('Preview: Test');
    await waitFor(() => {
      expect(frame.getAttribute('srcdoc')).toContain('Loaded design');
    });
  });
});
