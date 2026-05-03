/**
 * Feature flags — shared by client and server.
 *
 * Values live in `config/feature-flags.json`. Each flag accepts:
 *   - `0`      → forced off
 *   - `1`      → forced on
 *   - `"auto"` → derive from environment (prod=on, dev=off)
 *
 * Validated by Zod at module load; a bad value fails fast with a readable error.
 */
import { z } from 'zod';
import rawFlags from '../../config/feature-flags.json';

const flag = z.union([z.literal(0), z.literal(1), z.literal('auto')]);

export const FeatureFlagsFileSchema = z
  .object({
    lockdown:    flag,
    autoImprove: flag,
  })
  .strict();

export type FeatureFlags = z.infer<typeof FeatureFlagsFileSchema>;

const FLAGS = FeatureFlagsFileSchema.parse(rawFlags);

/**
 * True when running in a production build. Works on both Vite client and
 * Node server. Single probe site so the dev/prod gate is consistent.
 */
export function isProductionEnv(): boolean {
  const meta =
    typeof import.meta !== 'undefined'
      ? ((import.meta as { env?: { PROD?: boolean } }).env ?? null)
      : null;
  if (meta && typeof meta.PROD === 'boolean') return meta.PROD;
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  if (proc && proc.env) {
    return proc.env.NODE_ENV === 'production';
  }
  return false;
}

/** Inverse of {@link isProductionEnv}. Use this for "log only in dev" guards etc. */
export function isDevEnv(): boolean {
  return !isProductionEnv();
}

function resolveFlag(value: 0 | 1 | 'auto'): boolean {
  if (value === 1) return true;
  if (value === 0) return false;
  return isProductionEnv();
}

/**
 * When true, all LLM routes clamp to the per-task pinned models from
 * `config/task-defaults.json`. Default `"auto"`: on in production builds,
 * off in development so engineers can pick any model.
 */
export const FEATURE_LOCKDOWN = resolveFlag(FLAGS.lockdown);

/** When true, the evaluator-driven revision loop UI is exposed on hypothesis nodes. */
export const FEATURE_AUTO_IMPROVE = resolveFlag(FLAGS.autoImprove);
