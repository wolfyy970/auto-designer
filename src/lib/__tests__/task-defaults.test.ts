import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import rawTaskDefaults from '../../../config/task-defaults.json';
import { THINKING_TASKS } from '../thinking-defaults';
import { TaskDefaultsFileSchema, getTaskModelDefault } from '../task-defaults';

describe('task-defaults.json', () => {
  it('round-trips through TaskDefaultsFileSchema', () => {
    expect(TaskDefaultsFileSchema.safeParse(rawTaskDefaults).success).toBe(true);
  });

  it('defines a provider/model pair for every thinking task', () => {
    for (const task of THINKING_TASKS) {
      expect(getTaskModelDefault(task)).toEqual(
        expect.objectContaining({
          providerId: expect.any(String),
          modelId: expect.any(String),
        }),
      );
    }
  });

  it('rejects an empty modelId', () => {
    const bad = {
      ...rawTaskDefaults,
      perTaskDefaults: {
        ...rawTaskDefaults.perTaskDefaults,
        design: { ...rawTaskDefaults.perTaskDefaults.design, modelId: '' },
      },
    };
    expect(() => TaskDefaultsFileSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects unknown top-level keys', () => {
    const bad = { ...rawTaskDefaults, providerDefaults: { providerId: 'openrouter' } };
    expect(() => TaskDefaultsFileSchema.parse(bad)).toThrow(z.ZodError);
  });
});
