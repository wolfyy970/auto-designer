import { describe, expect, it } from 'vitest';
import {
  buildAgentLogSnapshotPayload,
  configureAgentLogSnapshotReaders,
} from '../agent-log-snapshot.ts';
import type { LlmLogEntry, TaskLogEntry } from '../../log-store.ts';
import type { ObservabilityLineTrace } from '../observability-line.ts';

describe('agent-log-snapshot', () => {
  it('builds the dev snapshot from registered log readers', () => {
    const llm: LlmLogEntry[] = [
      {
        id: 'llm-1',
        timestamp: '2026-05-08T00:00:00.000Z',
        source: 'builder',
        model: 'm',
        provider: 'openrouter',
        systemPrompt: 'system',
        userPrompt: 'user',
        response: 'response',
        durationMs: 1,
        status: 'complete',
      },
    ];
    const trace: ObservabilityLineTrace[] = [
      {
        v: 1,
        ts: '2026-05-08T00:00:01.000Z',
        type: 'trace',
        payload: { event: { id: 'trace-1' } },
      },
    ];
    const task: TaskLogEntry[] = [
      {
        id: 'task-1',
        timestamp: '2026-05-08T00:00:02.000Z',
        kind: 'task_run',
        sessionType: 'design',
        correlationId: 'corr-1',
        providerId: 'openrouter',
        modelId: 'model-1',
        durationMs: 2,
        outcome: 'success',
        sandboxFileCount: 1,
      },
    ];

    configureAgentLogSnapshotReaders({
      getLogEntries: () => llm,
      getTraceLogLines: () => trace,
      getTaskLogEntries: () => task,
    });

    expect(buildAgentLogSnapshotPayload()).toEqual(
      expect.objectContaining({
        note: expect.stringContaining('Mirror of dev GET /api/logs'),
        llm,
        trace,
        task,
      }),
    );
  });
});
