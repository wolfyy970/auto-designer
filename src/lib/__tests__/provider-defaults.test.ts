import { describe, expect, it } from 'vitest';
import { DEFAULT_LEGACY_MODEL_TASK, getTaskModelDefault } from '../task-defaults';
import {
  DEFAULT_COMPILER_PROVIDER,
  DEFAULT_MODEL_ID,
} from '../provider-defaults';

describe('legacy provider defaults', () => {
  it('derive from the canonical incubate task default', () => {
    const taskDefault = getTaskModelDefault(DEFAULT_LEGACY_MODEL_TASK);
    expect(DEFAULT_COMPILER_PROVIDER).toBe(taskDefault.providerId);
    expect(DEFAULT_MODEL_ID).toBe(taskDefault.modelId);
  });
});
