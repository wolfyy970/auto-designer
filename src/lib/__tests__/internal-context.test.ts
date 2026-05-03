import { describe, it, expect } from 'vitest';
import { buildInternalContext } from '../internal-context';
import type { DesignSpec, SpecSection } from '../../types/spec';

type Img = { id: string; filename: string; dataUrl: string; description: string; createdAt: string; extractedContext?: string };

function specWith(
  sections: Partial<Record<string, { content: string; images?: Img[] }>>,
  title = 'Test Canvas',
): DesignSpec {
  const now = '2026-01-01T00:00:00Z';
  const built: Record<string, SpecSection> = {};
  for (const [id, value] of Object.entries(sections)) {
    built[id] = {
      id: id as SpecSection['id'],
      content: value!.content,
      images: (value!.images ?? []).map((img) => ({ ...img })),
      lastModified: now,
    };
  }
  return {
    id: 'spec-1',
    title,
    sections: built as DesignSpec['sections'],
    createdAt: now,
    lastModified: now,
    version: 1,
  };
}

describe('buildInternalContext', () => {
  it('wraps every populated section in its XML tag', () => {
    const out = buildInternalContext(
      specWith({
        'design-brief': { content: 'Build a checkout flow.' },
        'research-context': { content: 'Mobile users abandon at step 2.' },
        'objectives-metrics': { content: 'Reduce drop-off by 20%.' },
        'design-constraints': { content: 'Must work on Safari 16.' },
      }),
    );
    expect(out).toContain('<canvas_title>Test Canvas</canvas_title>');
    expect(out).toContain('<design_brief>\nBuild a checkout flow.\n</design_brief>');
    expect(out).toContain('<research_context>\nMobile users abandon at step 2.\n</research_context>');
    expect(out).toContain('<objectives_metrics>\nReduce drop-off by 20%.\n</objectives_metrics>');
    expect(out).toContain('<design_constraints>\nMust work on Safari 16.\n</design_constraints>');
  });

  it('preserves user text verbatim — no paraphrase, no rewriting', () => {
    const verbatim = 'Some users — particularly those on slow networks — abandon if loading >2s.';
    const out = buildInternalContext(specWith({ 'design-brief': { content: verbatim } }));
    expect(out).toContain(verbatim);
  });

  it('skips empty sections instead of emitting empty tags', () => {
    const out = buildInternalContext(
      specWith({
        'design-brief': { content: 'Brief here.' },
        'research-context': { content: '' },
        'objectives-metrics': { content: '   ' },
      }),
    );
    expect(out).toContain('<design_brief>');
    expect(out).not.toContain('<research_context>');
    expect(out).not.toContain('<objectives_metrics>');
    expect(out).not.toContain('<design_constraints>');
  });

  it('emits a reference-images manifest when images are attached', () => {
    const out = buildInternalContext(
      specWith({
        'design-brief': {
          content: 'Brief',
          images: [
            {
              id: 'img-1',
              filename: 'mock.png',
              dataUrl: 'data:image/png;base64,xxx',
              description: 'mobile mockup',
              createdAt: '2026-01-01T00:00:00Z',
              extractedContext: 'shows hero + CTA',
            },
          ],
        },
      }),
    );
    expect(out).toContain('<reference_images>');
    expect(out).toContain('design-brief: mock.png — mobile mockup (shows hero + CTA)');
    expect(out).toContain('</reference_images>');
  });

  it('omits reference-images section entirely when no images exist', () => {
    const out = buildInternalContext(
      specWith({ 'design-brief': { content: 'Brief without images' } }),
    );
    expect(out).not.toContain('<reference_images>');
  });

  it('is deterministic — same input always produces the same output', () => {
    const spec = specWith({
      'design-brief': { content: 'Brief' },
      'research-context': { content: 'Research' },
    });
    expect(buildInternalContext(spec)).toBe(buildInternalContext(spec));
  });
});
