/**
 * Verifies the new `incubator-brainstorm-system` and
 * `incubator-curation-system` prompt keys resolve through the package
 * prompt loader. This catches two failure modes:
 *   - someone renames or deletes the bundled prompt file and forgets to
 *     update PACKAGE_PROMPT_FILES,
 *   - someone adds a key to PromptKey but forgets to register it in the
 *     resolver (would throw `getPromptBody: unhandled PromptKey`).
 *
 * Mocks the @auto-designer/pi loader so the test doesn't depend on the
 * bundled prompt content — only on the (key → filename) wiring.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@auto-designer/pi', async () => {
  const actual = await vi.importActual<typeof import('@auto-designer/pi')>('@auto-designer/pi');
  return {
    ...actual,
    loadPackagePromptBody: vi.fn((filename: string) => `BODY[${filename}]`),
    loadDesignerSystemPrompt: vi.fn(() => 'designer system'),
  };
});

import { getPromptBody } from '../prompt-resolution.ts';
import { loadPackagePromptBody } from '@auto-designer/pi';

describe('prompt-resolution — brainstorm + curation keys', () => {
  it('resolves `incubator-brainstorm-system` to `gen-brainstorm.md`', async () => {
    vi.mocked(loadPackagePromptBody).mockClear();
    const body = await getPromptBody('incubator-brainstorm-system');
    expect(loadPackagePromptBody).toHaveBeenCalledExactlyOnceWith('gen-brainstorm.md');
    expect(body).toBe('BODY[gen-brainstorm.md]');
  });

  it('resolves `incubator-curation-system` to `gen-curation.md`', async () => {
    vi.mocked(loadPackagePromptBody).mockClear();
    const body = await getPromptBody('incubator-curation-system');
    expect(loadPackagePromptBody).toHaveBeenCalledExactlyOnceWith('gen-curation.md');
    expect(body).toBe('BODY[gen-curation.md]');
  });
});
