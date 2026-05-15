/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('postTraceEvents — production gate', () => {
  it('short-circuits in production without calling fetch', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { postTraceEvents } = await import('../client');
    const ok = await postTraceEvents({
      events: [{ id: 'e1', at: new Date().toISOString(), kind: 'run_started', label: 'x' }],
    });

    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards in dev', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const { postTraceEvents } = await import('../client');
    const ok = await postTraceEvents({
      events: [{ id: 'e1', at: new Date().toISOString(), kind: 'run_started', label: 'x' }],
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/logs/trace');
    expect(opts?.method).toBe('POST');
  });
});
