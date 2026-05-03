import { describe, it, expect, beforeEach } from 'vitest';
import { useThinkingDefaultsStore } from '../thinking-defaults-store';
import { THINKING_TASKS } from '../../lib/thinking-defaults';

describe('useThinkingDefaultsStore', () => {
  beforeEach(() => {
    useThinkingDefaultsStore.getState().resetAll();
  });

  it('starts with an empty override per task', () => {
    const { overrides } = useThinkingDefaultsStore.getState();
    for (const t of THINKING_TASKS) {
      expect(overrides[t]).toEqual({});
    }
  });

  it('persists an effort override on a single task', () => {
    useThinkingDefaultsStore.getState().setEffort('design', 'maximum');
    expect(useThinkingDefaultsStore.getState().overrides.design).toEqual({ effort: 'maximum' });
  });

  it('overwrites an effort override when set again', () => {
    const s = useThinkingDefaultsStore.getState();
    s.setEffort('incubate', 'thorough');
    s.setEffort('incubate', 'quick');
    expect(useThinkingDefaultsStore.getState().overrides.incubate).toEqual({ effort: 'quick' });
  });

  it('passing undefined clears the override', () => {
    const s = useThinkingDefaultsStore.getState();
    s.setEffort('evaluator', 'balanced');
    s.setEffort('evaluator', undefined);
    expect(useThinkingDefaultsStore.getState().overrides.evaluator).toEqual({});
  });

  it('resetTask clears a single task without disturbing siblings', () => {
    const s = useThinkingDefaultsStore.getState();
    s.setEffort('design', 'thorough');
    s.setEffort('inputs-research', 'quick');
    s.resetTask('design');
    expect(useThinkingDefaultsStore.getState().overrides.design).toEqual({});
    expect(useThinkingDefaultsStore.getState().overrides['inputs-research']).toEqual({
      effort: 'quick',
    });
  });

  it('resetAll clears every task', () => {
    const s = useThinkingDefaultsStore.getState();
    s.setEffort('design', 'maximum');
    s.setEffort('inputs-objectives', 'off');
    s.resetAll();
    for (const t of THINKING_TASKS) {
      expect(useThinkingDefaultsStore.getState().overrides[t]).toEqual({});
    }
  });
});
