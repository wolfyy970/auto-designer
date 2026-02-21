import { describe, it, expect } from 'vitest';
import { PROMPT_DEFAULTS } from '../prompts/shared-defaults';

const EXPECTED_KEYS = [
  'compilerSystem',
  'compilerUser',
  'agentSystemPlanner',
  'agentSystemBuilder',
  'genSystemHtml',
  'variant',
  'designSystemExtract',
] as const;

describe('PROMPT_DEFAULTS', () => {
  it('defines every prompt key', () => {
    for (const key of EXPECTED_KEYS) {
      expect(PROMPT_DEFAULTS).toHaveProperty(key);
    }
  });

  it('has non-empty string for every key', () => {
    for (const key of EXPECTED_KEYS) {
      const val = PROMPT_DEFAULTS[key];
      expect(typeof val).toBe('string');
      expect(val.trim().length).toBeGreaterThan(0);
    }
  });

  it('compilerSystem contains expected structural content', () => {
    expect(PROMPT_DEFAULTS.compilerSystem).toContain('dimension map');
    expect(PROMPT_DEFAULTS.compilerSystem).toContain('JSON');
  });

  it('genSystemHtml contains HTML instruction', () => {
    expect(PROMPT_DEFAULTS.genSystemHtml).toContain('HTML');
  });

  it('variant prompt contains template variables', () => {
    expect(PROMPT_DEFAULTS.variant).toContain('{{STRATEGY_NAME}}');
    expect(PROMPT_DEFAULTS.variant).toContain('{{DESIGN_BRIEF}}');
  });

  it('compilerUser prompt contains template variables', () => {
    expect(PROMPT_DEFAULTS.compilerUser).toContain('{{SPEC_TITLE}}');
    expect(PROMPT_DEFAULTS.compilerUser).toContain('{{DESIGN_CONSTRAINTS}}');
  });
});
