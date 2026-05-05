import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('canvas UI surface regressions', () => {
  it('does not dim the canvas when the run inspector is open', () => {
    const source = readRepoFile('src/components/canvas/CanvasWorkspace.tsx');

    expect(source).not.toContain('z-40 bg-overlay');
    expect(source).not.toContain('runInspectorPreviewNodeId != null ? (');
  });

  it('keeps modal/dialog content on opaque design-system surfaces', () => {
    const sources = [
      'src/components/shared/SettingsModal.tsx',
      'src/components/canvas/variant-run/DesignDebugExportDialog.tsx',
      'src/components/shared/PermanentDeleteConfirmDialog.tsx',
    ].map((path) => `${path}\n${readRepoFile(path)}`);

    const forbidden = [
      'bg-surface/60',
      'bg-surface/40',
      'bg-bg/50',
      'bg-surface/70',
      'bg-surface-nested/30',
      'bg-surface-floating',
    ];

    for (const source of sources) {
      for (const token of forbidden) {
        expect(source).not.toContain(token);
      }
    }
  });
});
