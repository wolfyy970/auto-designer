import { describe, it, expect } from 'vitest';
import { isValidConnection, VALID_CONNECTIONS } from '../canvas-connections';

describe('isValidConnection', () => {
  it('allows section types to connect to compiler', () => {
    const sectionTypes = [
      'designBrief',
      'researchContext',
      'objectivesMetrics',
      'designConstraints',
    ];
    for (const section of sectionTypes) {
      expect(isValidConnection(section, 'incubator')).toBe(true);
    }
  });

  it('allows designSystem to connect to hypothesis only', () => {
    expect(isValidConnection('designSystem', 'incubator')).toBe(false);
    expect(isValidConnection('designSystem', 'hypothesis')).toBe(true);
  });

  it('allows compiler to connect to hypothesis', () => {
    expect(isValidConnection('incubator', 'hypothesis')).toBe(true);
  });

  it('allows hypothesis to connect to preview', () => {
    expect(isValidConnection('hypothesis', 'preview')).toBe(true);
  });

  it('allows preview to connect to compiler only', () => {
    expect(isValidConnection('preview', 'incubator')).toBe(true);
    expect(isValidConnection('preview', 'designSystem')).toBe(false);
  });

  it('rejects reverse connections', () => {
    expect(isValidConnection('incubator', 'designBrief')).toBe(false);
    expect(isValidConnection('hypothesis', 'incubator')).toBe(false);
    expect(isValidConnection('preview', 'hypothesis')).toBe(false);
  });

  it('rejects self-connections', () => {
    expect(isValidConnection('incubator', 'incubator')).toBe(false);
    expect(isValidConnection('preview', 'preview')).toBe(false);
  });

  it('rejects unknown node types', () => {
    expect(isValidConnection('unknown', 'incubator')).toBe(false);
    expect(isValidConnection('designBrief', 'unknown')).toBe(false);
  });

  it('rejects model edges in either direction (Settings is the model source)', () => {
    expect(isValidConnection('model', 'incubator')).toBe(false);
    expect(isValidConnection('model', 'hypothesis')).toBe(false);
    expect(isValidConnection('incubator', 'model')).toBe(false);
    expect(isValidConnection('hypothesis', 'model')).toBe(false);
  });

  it('covers all defined source types', () => {
    const definedSources = Object.keys(VALID_CONNECTIONS);
    expect(definedSources.length).toBeGreaterThanOrEqual(7);
  });
});
