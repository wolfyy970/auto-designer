/**
 * Provider / model defaults — shared by client and server.
 * Values live in config/provider-defaults.json. Only used by legacy migrations
 * and compatibility helpers; current per-task defaults and lockdown pins live in
 * config/task-defaults.json.
 * Validated by Zod at module load; a bad value fails fast with a readable error.
 */
import { z } from 'zod';
import rawDefaults from '../../config/provider-defaults.json';

export const ProviderDefaultsFileSchema = z
  .object({
    compilerProvider: z.enum(['openrouter', 'lmstudio']),
    modelId:          z.string().min(1),
  })
  .strict();

export type ProviderDefaults = z.infer<typeof ProviderDefaultsFileSchema>;

const DEFAULTS = ProviderDefaultsFileSchema.parse(rawDefaults);

/** Legacy provider default used by migration and compatibility helpers. */
export const DEFAULT_COMPILER_PROVIDER = DEFAULTS.compilerProvider;

/** Legacy OpenRouter model slug used by migration and compatibility helpers. */
export const DEFAULT_MODEL_ID = DEFAULTS.modelId;
