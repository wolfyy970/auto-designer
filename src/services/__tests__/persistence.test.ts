import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSpec, loadSpec, deleteSpec, getSpecList, importSpec } from '../persistence';
import type { DesignSpec, SpecSection, SpecSectionId } from '../../types/spec';

// Mock localStorage
const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, val: string) => storage.set(key, val),
    removeItem: (key: string) => storage.delete(key),
  });
});

function makeSection(id: SpecSectionId): SpecSection {
  return { id, content: '', images: [], lastModified: '2024-01-01' };
}

function makeSpec(overrides: Partial<DesignSpec> & { id: string }): DesignSpec {
  return {
    title: 'Test Spec',
    createdAt: '2024-01-01',
    lastModified: '2024-01-01',
    version: 1,
    sections: {
      'design-brief': makeSection('design-brief'),
      'existing-design': makeSection('existing-design'),
      'research-context': makeSection('research-context'),
      'objectives-metrics': makeSection('objectives-metrics'),
      'design-constraints': makeSection('design-constraints'),
      'design-system': makeSection('design-system'),
    },
    ...overrides,
  };
}

// ── getAllSpecs validation ────────────────────────────────────────────

describe('loadSpec / getAllSpecs validation', () => {
  it('returns null for missing spec', () => {
    expect(loadSpec('nonexistent')).toBeNull();
  });

  it('handles corrupt localStorage (not JSON)', () => {
    storage.set('auto-designer-specs', '{{invalid json}}');
    expect(loadSpec('any')).toBeNull();
  });

  it('handles localStorage containing an array instead of object', () => {
    storage.set('auto-designer-specs', '[1,2,3]');
    expect(loadSpec('any')).toBeNull();
  });

  it('handles localStorage containing a string instead of object', () => {
    storage.set('auto-designer-specs', '"just a string"');
    expect(loadSpec('any')).toBeNull();
  });

  it('handles localStorage containing null', () => {
    storage.set('auto-designer-specs', 'null');
    expect(loadSpec('any')).toBeNull();
  });
});

// ── saveSpec / loadSpec / deleteSpec ──────────────────────────────────

describe('saveSpec and loadSpec', () => {
  it('round-trips a spec through save and load', () => {
    const spec = makeSpec({ id: 'spec-1', title: 'My Spec' });
    saveSpec(spec);
    const loaded = loadSpec('spec-1');
    expect(loaded?.title).toBe('My Spec');
  });

  it('deleteSpec removes a spec', () => {
    const spec = makeSpec({ id: 'spec-del' });
    saveSpec(spec);
    expect(loadSpec('spec-del')).not.toBeNull();
    deleteSpec('spec-del');
    expect(loadSpec('spec-del')).toBeNull();
  });
});

// ── getSpecList ──────────────────────────────────────────────────────

describe('getSpecList', () => {
  it('returns specs sorted by lastModified descending', () => {
    saveSpec(makeSpec({ id: 's1', title: 'Old', lastModified: '2024-01-01' }));
    saveSpec(makeSpec({ id: 's2', title: 'New', lastModified: '2024-06-01' }));
    const list = getSpecList();
    expect(list[0].title).toBe('New');
    expect(list[1].title).toBe('Old');
  });

  it('returns empty array when no specs saved', () => {
    expect(getSpecList()).toEqual([]);
  });
});

// ── importSpec validation ────────────────────────────────────────────

describe('importSpec', () => {
  function makeFile(content: string): File {
    return new File([content], 'test.json', { type: 'application/json' });
  }

  it('accepts a valid spec file', async () => {
    const spec = makeSpec({ id: 'imp-1' });
    const file = makeFile(JSON.stringify(spec));
    const result = await importSpec(file);
    expect(result.id).toBe('imp-1');
  });

  it('rejects file without id', async () => {
    const file = makeFile(JSON.stringify({ title: 'No ID', sections: {} }));
    await expect(importSpec(file)).rejects.toThrow('missing required fields');
  });

  it('rejects file without title', async () => {
    const file = makeFile(JSON.stringify({ id: 'x', sections: {} }));
    await expect(importSpec(file)).rejects.toThrow('missing required fields');
  });

  it('rejects file with non-object sections', async () => {
    const file = makeFile(JSON.stringify({ id: 'x', title: 'T', sections: 'string' }));
    await expect(importSpec(file)).rejects.toThrow('missing required fields');
  });

  it('rejects file with null sections', async () => {
    const file = makeFile(JSON.stringify({ id: 'x', title: 'T', sections: null }));
    await expect(importSpec(file)).rejects.toThrow('missing required fields');
  });

  it('rejects unparseable JSON', async () => {
    const file = makeFile('not json');
    await expect(importSpec(file)).rejects.toThrow('could not parse JSON');
  });
});
