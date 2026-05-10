/**
 * Env bootstrap for the experiments CLI.
 *
 * Importing `server/env.ts` triggers its module-side `dotenv` loading, so by
 * importing it here at the top of every CLI command we get the same env
 * resolution the production server uses (`.env.local` then `.env`). Re-exports
 * `env` for convenience and exposes `requireProviderEnv` for the rare cases
 * where we want to fail fast with a clearer message than a deep stack trace.
 */
import { env } from '../../server/env.ts';

export { env };

export interface ProviderEnvRequirement {
  providerId: string;
}

/**
 * Throws a CLI-friendly error when the env for the chosen provider is missing.
 * Run before any non-dry-run stage to surface "you forgot to set X" up front
 * rather than mid-flow.
 */
export function requireProviderEnv(req: ProviderEnvRequirement): void {
  if (req.providerId === 'openrouter') {
    if (!env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY.trim() === '') {
      throw new Error(
        'OPENROUTER_API_KEY is not set. Add it to .env.local or .env before running a live experiment. Use --dry-run to compose prompts without provider calls.',
      );
    }
    return;
  }
  if (req.providerId === 'lmstudio') {
    if (!env.LMSTUDIO_URL || env.LMSTUDIO_URL.trim() === '') {
      throw new Error('LMSTUDIO_URL is not set.');
    }
    return;
  }
  throw new Error(`requireProviderEnv: unsupported providerId "${req.providerId}"`);
}
