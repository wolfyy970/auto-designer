import { describe, expect, it } from 'vitest';
import { getTaskModelDefault } from '../task-defaults';
import { pinForLockdown } from '../lockdown-model';

describe('pinForLockdown — credential lists', () => {
  it('passes through when lockdown is false', () => {
    const creds = [{ providerId: 'lmstudio', modelId: 'x', thinkingLevel: 'minimal' as const }];
    const out = pinForLockdown(creds, false, 'design');
    expect(out).toEqual([{ providerId: 'lmstudio', modelId: 'x', thinkingLevel: 'minimal' }]);
  });

  it("pins every lane to the task's lockdown model when on", () => {
    const designPin = getTaskModelDefault('design');
    const creds = [
      { providerId: 'lmstudio', modelId: 'x', thinkingLevel: 'minimal' as const },
      { providerId: 'openrouter', modelId: 'other', thinkingLevel: 'high' as const },
    ];
    const out = pinForLockdown(creds, true, 'design');
    expect(out).toEqual([
      { providerId: designPin.providerId, modelId: designPin.modelId, thinkingLevel: 'minimal' },
      { providerId: designPin.providerId, modelId: designPin.modelId, thinkingLevel: 'high' },
    ]);
  });

  it('different tasks pin to different models', () => {
    const incubatePin = getTaskModelDefault('incubate');
    const out = pinForLockdown(
      [{ providerId: 'x', modelId: 'y', thinkingLevel: 'minimal' as const }],
      true,
      'incubate',
    );
    expect(out[0]?.providerId).toBe(incubatePin.providerId);
    expect(out[0]?.modelId).toBe(incubatePin.modelId);
  });
});

describe('pinForLockdown — single pair', () => {
  it('passes through when lockdown is false', () => {
    const out = pinForLockdown({ providerId: 'lmstudio', modelId: 'x' }, false, 'design');
    expect(out).toEqual({ providerId: 'lmstudio', modelId: 'x' });
  });

  it("returns the task's pin when lockdown is true", () => {
    const pin = getTaskModelDefault('evaluator');
    const out = pinForLockdown({ providerId: 'x', modelId: 'y' }, true, 'evaluator');
    expect(out).toEqual(pin);
  });
});
