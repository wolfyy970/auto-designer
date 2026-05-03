import { describe, expect, it } from 'vitest';
import app from '../../app.ts';
import { FEATURE_LOCKDOWN, FEATURE_AUTO_IMPROVE } from '../../../src/lib/feature-flags.ts';
import { DEFAULT_RUBRIC_WEIGHTS } from '../../../src/types/evaluation.ts';

describe('GET /api/config', () => {
  it('reflects feature-flags.json lockdown state and includes all required fields', async () => {
    const res = await app.request('http://localhost/api/config');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.lockdown).toBe(FEATURE_LOCKDOWN);
    expect(typeof body.agenticMaxRevisionRounds).toBe('number');
    expect(
      body.agenticMinOverallScore === null || typeof body.agenticMinOverallScore === 'number',
    ).toBe(true);
    expect(body.defaultRubricWeights).toEqual(DEFAULT_RUBRIC_WEIGHTS);
    expect(typeof body.maxConcurrentRuns).toBe('number');
    expect(body.maxConcurrentRuns).toBeGreaterThanOrEqual(1);
    expect(body.autoImprove).toBe(FEATURE_AUTO_IMPROVE);
  });
});
