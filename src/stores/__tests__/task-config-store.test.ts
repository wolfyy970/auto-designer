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

  it('persists a level override on a single task', () => {
    useTaskConfigStore.getState().setLevel('design', 'xhigh');
    expect(useTaskConfigStore.getState().overrides.design).toEqual({ level: 'xhigh' });
  });

  it('overwrites a level override when set again', () => {
    const s = useTaskConfigStore.getState();
    s.setLevel('incubate', 'high');
    s.setLevel('incubate', 'low');
    expect(useTaskConfigStore.getState().overrides.incubate).toEqual({ level: 'low' });
  });

  it('passing undefined clears the override', () => {
    const s = useTaskConfigStore.getState();
    s.setLevel('evaluator', 'medium');
    s.setLevel('evaluator', undefined);
    expect(useTaskConfigStore.getState().overrides.evaluator).toEqual({});
  });

  it('resetTask clears a single task without disturbing siblings', () => {
    const s = useTaskConfigStore.getState();
    s.setLevel('design', 'high');
    s.setLevel('inputs', 'low');
    s.resetTask('design');
    expect(useTaskConfigStore.getState().overrides.design).toEqual({});
    expect(useTaskConfigStore.getState().overrides.inputs).toEqual({ level: 'low' });
  });

  it('resetAll clears every task', () => {
    const s = useTaskConfigStore.getState();
    s.setLevel('design', 'xhigh');
    s.setLevel('inputs', 'off');
    s.resetAll();
    for (const t of THINKING_TASKS) {
      expect(useTaskConfigStore.getState().overrides[t]).toEqual({});
    }
  });
});
