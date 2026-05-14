import { describe, expect, it } from 'vitest';
import { resolveCanvasMarkdownControls } from '../canvas-markdown-controls';

describe('resolveCanvasMarkdownControls', () => {
  it('disables Streamdown table chrome when controls are omitted', () => {
    expect(resolveCanvasMarkdownControls(undefined)).toEqual({ table: false });
  });

  it('passes through an explicit controls value', () => {
    expect(resolveCanvasMarkdownControls(false)).toBe(false);
    expect(resolveCanvasMarkdownControls({ table: true })).toEqual({ table: true });
    expect(
      resolveCanvasMarkdownControls({
        code: false,
        table: { copy: true, download: false, fullscreen: false },
      }),
    ).toEqual({
      code: false,
      table: { copy: true, download: false, fullscreen: false },
    });
  });
});
