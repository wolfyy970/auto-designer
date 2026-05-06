import { describe, it, expect } from 'vitest';
import { getSectionContent } from '../prompts/helpers';
import type { DesignSpec, SpecSection, SpecSectionId } from '../../types/spec';

function makeSection(overrides: Partial<SpecSection> = {}): SpecSection {
  return {
    id: 'design-brief' as SpecSectionId,
    content: '',
    images: [],
    lastModified: new Date().toISOString(),
    ...overrides,
  };
}

function makeSpec(overrides: Partial<DesignSpec> = {}): DesignSpec {
  return {
    id: 'test-spec',
    title: 'Test',
    sections: {
      'design-brief': makeSection({ id: 'design-brief' }),
      'existing-design': makeSection({ id: 'existing-design' }),
      'research-context': makeSection({ id: 'research-context' }),
      'objectives-metrics': makeSection({ id: 'objectives-metrics' }),
      'design-constraints': makeSection({ id: 'design-constraints' }),
      'design-system': makeSection({ id: 'design-system' }),
    },
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

// ─── getSectionContent ──────────────────────────────────────────────

describe('getSectionContent', () => {
  it('returns trimmed section content', () => {
    const spec = makeSpec({
      sections: {
        ...makeSpec().sections,
        'design-brief': makeSection({ id: 'design-brief', content: '  Hello world  ' }),
      },
    });
    expect(getSectionContent(spec, 'design-brief')).toBe('Hello world');
  });

  it('returns "(Not provided)" for empty content', () => {
    const spec = makeSpec();
    expect(getSectionContent(spec, 'design-brief')).toBe('(Not provided)');
  });

  it('returns "(Not provided)" for whitespace-only content', () => {
    const spec = makeSpec({
      sections: {
        ...makeSpec().sections,
        'design-brief': makeSection({ id: 'design-brief', content: '   \n\t  ' }),
      },
    });
    expect(getSectionContent(spec, 'design-brief')).toBe('(Not provided)');
  });

  it('returns "(Not provided)" for unknown section', () => {
    const spec = makeSpec();
    expect(getSectionContent(spec, 'nonexistent')).toBe('(Not provided)');
  });
});
