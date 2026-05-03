import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskConfigStore } from '../task-config-store';
import { THINKING_TASKS } from '../../lib/thinking-defaults';

describe('useTaskConfigStore', () => {
  beforeEach(() => {
    useTaskConfigStore.getState().resetAll();
  });

  it('starts with an empty override per task', () => {
    const { overrides } = useTaskConfigStore.getState();
    for (const t of THINKING_TASKS) {
      expect(overrides[t]).toEqual({});
    }
  });

  it('persists an effort override on a single task', () => {
    useTaskConfigStore.getState().setEffort('design', 'maximum');
    expect(useTaskConfigStore.getState().overrides.design).toEqual({ effort: 'maximum' });
  });

  it('overwrites an effort override when set again', () => {
    const s = useTaskConfigStore.getState();
    s.setEffort('incubate', 'thorough');
    s.setEffort('incubate', 'quick');
    expect(useTaskConfigStore.getState().overrides.incubate).toEqual({ effort: 'quick' });
  });

  it('passing undefined clears the override', () => {
    const s = useTaskConfigStore.getState();
    s.setEffort('evaluator', 'balanced');
    s.setEffort('evaluator', undefined);
    expect(useTaskConfigStore.getState().overrides.evaluator).toEqual({});
  });

  it('resetTask clears a single task without disturbing siblings', () => {
    const s = useTaskConfigStore.getState();
    s.setEffort('design', 'thorough');
    s.setEffort('inputs-research', 'quick');
    s.resetTask('design');
    expect(useTaskConfigStore.getState().overrides.design).toEqual({});
    expect(useTaskConfigStore.getState().overrides['inputs-research']).toEqual({
      effort: 'quick',
    });
  });

  it('resetAll clears every task', () => {
    const s = useTaskConfigStore.getState();
    s.setEffort('design', 'maximum');
    s.setEffort('inputs-objectives', 'off');
    s.resetAll();
    for (const t of THINKING_TASKS) {
      expect(useTaskConfigStore.getState().overrides[t]).toEqual({});
    }
  });
});
