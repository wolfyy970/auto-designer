import { Hono } from 'hono';
import { env } from '../env.ts';
import { FEATURE_LOCKDOWN, FEATURE_AUTO_IMPROVE } from '../../src/lib/feature-flags.ts';
import { DEFAULT_RUBRIC_WEIGHTS } from '../../src/types/evaluation.ts';
import { AppConfigResponseSchema } from '../../src/api/wire-schemas.ts';

const configRoute = new Hono();

configRoute.get('/', (c) => {
  return c.json(
    AppConfigResponseSchema.parse({
      lockdown: FEATURE_LOCKDOWN,
      agenticMaxRevisionRounds: env.AGENTIC_MAX_REVISION_ROUNDS,
      agenticMinOverallScore: env.AGENTIC_MIN_OVERALL_SCORE ?? null,
      defaultRubricWeights: { ...DEFAULT_RUBRIC_WEIGHTS },
      maxConcurrentRuns: env.MAX_CONCURRENT_AGENTIC_RUNS,
      autoImprove: FEATURE_AUTO_IMPROVE,
    }),
  );
});

export default configRoute;
