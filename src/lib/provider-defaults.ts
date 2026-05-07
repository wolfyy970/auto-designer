/**
 * Provider / model defaults — shared by client and server.
 * Compatibility exports for legacy migrations and helpers that still ask for a
 * single default provider/model pair. The canonical source is
 * config/task-defaults.json; these values intentionally derive from the
 * incubation task pin so there is no second model-default config to keep in sync.
 */
import { DEFAULT_LEGACY_MODEL_TASK, getTaskModelDefault } from './task-defaults';

const DEFAULTS = getTaskModelDefault(DEFAULT_LEGACY_MODEL_TASK);

/** Legacy provider default used by migration and compatibility helpers. */
export const DEFAULT_COMPILER_PROVIDER = DEFAULTS.providerId;

/** Legacy model slug used by migration and compatibility helpers. */
export const DEFAULT_MODEL_ID = DEFAULTS.modelId;
