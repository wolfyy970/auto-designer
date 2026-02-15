import { describe, it, expect } from 'vitest';
import { buildAutoConnectEdges } from '../canvas-connections';

function makeNode(id: string, type: string) {
  return { id, type };
}

describe('buildAutoConnectEdges', () => {
  it('connects new section to existing compiler', () => {
    const existing = [makeNode('c1', 'compiler')];
    const edges = buildAutoConnectEdges('s1', 'designBrief', existing);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 's1', target: 'c1', type: 'dataFlow' });
  });

  it('does not connect section when no compiler exists', () => {
    const edges = buildAutoConnectEdges('s1', 'designBrief', []);
    expect(edges).toHaveLength(0);
  });

  it('does not connect section when multiple compilers exist', () => {
    const existing = [makeNode('c1', 'compiler'), makeNode('c2', 'compiler')];
    const edges = buildAutoConnectEdges('s1', 'designBrief', existing);
    expect(edges).toHaveLength(0);
  });

  it('connects all existing sections to new compiler (first compiler)', () => {
    const existing = [
      makeNode('s1', 'designBrief'),
      makeNode('s2', 'existingDesign'),
      makeNode('h1', 'hypothesis'),
    ];
    const edges = buildAutoConnectEdges('c1', 'compiler', existing);
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.source).sort()).toEqual(['s1', 's2']);
    expect(edges.every((e) => e.target === 'c1')).toBe(true);
  });

  it('does not auto-connect sections to second compiler', () => {
    const existing = [
      makeNode('c1', 'compiler'),
      makeNode('s1', 'designBrief'),
    ];
    const edges = buildAutoConnectEdges('c2', 'compiler', existing);
    expect(edges).toHaveLength(0);
  });

  it('connects new designSystem to all existing hypotheses', () => {
    const existing = [
      makeNode('h1', 'hypothesis'),
      makeNode('h2', 'hypothesis'),
      makeNode('c1', 'compiler'),
    ];
    const edges = buildAutoConnectEdges('ds1', 'designSystem', existing);
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.source === 'ds1')).toBe(true);
    expect(edges.map((e) => e.target).sort()).toEqual(['h1', 'h2']);
  });

  it('connects all existing designSystems to new hypothesis', () => {
    const existing = [
      makeNode('ds1', 'designSystem'),
      makeNode('ds2', 'designSystem'),
      makeNode('c1', 'compiler'),
    ];
    const edges = buildAutoConnectEdges('h1', 'hypothesis', existing);
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.target === 'h1')).toBe(true);
    expect(edges.map((e) => e.source).sort()).toEqual(['ds1', 'ds2']);
  });

  it('returns empty array for node types with no auto-connect rules', () => {
    const existing = [makeNode('c1', 'compiler'), makeNode('h1', 'hypothesis')];
    expect(buildAutoConnectEdges('v1', 'variant', existing)).toHaveLength(0);
    expect(buildAutoConnectEdges('cr1', 'critique', existing)).toHaveLength(0);
  });

  it('generates deterministic edge IDs', () => {
    const existing = [makeNode('c1', 'compiler')];
    const edges = buildAutoConnectEdges('s1', 'designBrief', existing);
    expect(edges[0].id).toBe('edge-s1-to-c1');
  });

  it('edges have idle status data', () => {
    const existing = [makeNode('c1', 'compiler')];
    const edges = buildAutoConnectEdges('s1', 'designBrief', existing);
    expect(edges[0].data).toEqual({ status: 'idle' });
  });
});
