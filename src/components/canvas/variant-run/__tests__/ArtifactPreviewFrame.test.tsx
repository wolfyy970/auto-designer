// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ArtifactPreviewFrame from '../ArtifactPreviewFrame';

describe('ArtifactPreviewFrame', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a loading spinner while URL preview registration is pending', async () => {
    // Hang the fetch so we observe the pending state.
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));

    const { container } = render(
      <ArtifactPreviewFrame
        files={{
          'index.html': '<!doctype html><html><body><h1>Loaded design</h1></body></html>',
        }}
        title="Preview: Test"
      />,
    );

    // During pending, no iframe is mounted — preventing the previous
    // srcDoc → URL double-paint flash. A spinner is shown instead.
    expect(screen.queryByTitle('Preview: Test')).toBeNull();
    await waitFor(() => {
      expect(container.querySelector('svg.lucide-loader-circle')).not.toBeNull();
    });
  });

  it('falls back to the bundled srcDoc when the registered preview URL is missing', async () => {
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

  it('renders the URL-backed iframe once preview registration succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'good-session', entry: 'index.html' }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true }); // unmount cleanup DELETE
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
    expect(frame.getAttribute('src')).toBe('/api/preview/sessions/good-session/index.html');
    // The successful URL render does not also carry a srcDoc, so there's no
    // remount when the iframe transitions from "pending" to "ready".
    expect(frame.getAttribute('srcdoc')).toBeNull();
  });

  it('marks the iframe non-interactive when interactive=false', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'card-session', entry: 'index.html' }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true }); // unmount cleanup DELETE
    vi.stubGlobal('fetch', fetchMock);

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
