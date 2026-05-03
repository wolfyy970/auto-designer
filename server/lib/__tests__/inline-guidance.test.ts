import { describe, it, expect, vi } from 'vitest';

vi.mock('../prompt-resolution.ts', () => ({
  getPromptBody: vi.fn(async (key: string) => `BODY[${key}]`),
}));

import { inlineGuidance } from '../inline-guidance.ts';
import { getPromptBody } from '../prompt-resolution.ts';

describe('inlineGuidance', () => {
  it('wraps the resolved body in <tag>…</tag>', async () => {
    const out = await inlineGuidance('hypotheses-generator-system', 'guidance');
    expect(out).toBe('<guidance>\nBODY[hypotheses-generator-system]\n</guidance>');
  });

  it('flows through getPromptBody so the resolution map is the single source of truth', async () => {
    vi.mocked(getPromptBody).mockClear();
    await inlineGuidance('design-system-extract-system', 'design_md_extraction_guidance');
    expect(getPromptBody).toHaveBeenCalledExactlyOnceWith('design-system-extract-system');
  });
});
