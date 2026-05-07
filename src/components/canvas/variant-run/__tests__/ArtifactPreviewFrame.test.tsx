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

  it('keeps the bundled srcDoc fallback when the registered preview URL is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'missing-session', entry: 'index.html' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

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
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/preview/sessions/missing-session/index.html',
        { method: 'GET' },
      );
    });
    expect(frame.getAttribute('srcdoc')).toContain('Loaded design');
    expect(frame.getAttribute('src')).toBeNull();
  });

  it('can render as a non-interactive canvas thumbnail', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));

    render(
      <ArtifactPreviewFrame
        files={{
          'index.html': '<!doctype html><html><body><h1>Loaded design</h1></body></html>',
        }}
        title="Preview: Test"
        interactive={false}
      />,
    );

    const frame = await screen.findByTitle<HTMLIFrameElement>('Preview: Test');
    expect(frame.style.pointerEvents).toBe('none');
  });
});
