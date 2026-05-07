import { z } from 'zod';
import rawRoutingConfig from '../../config/openrouter-routing.json';

export interface OpenRouterProviderRouting {
  provider?: {
    order: string[];
    allow_fallbacks: boolean;
  };
}

export const OpenRouterRoutingConfigSchema = z
  .object({
    modelProviderRouting: z.record(
      z.string().min(1),
      z
        .object({
          order: z.array(z.string().min(1)).min(1),
          allow_fallbacks: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();

const OPENROUTER_ROUTING_CONFIG = OpenRouterRoutingConfigSchema.parse(rawRoutingConfig);

export function openRouterProviderRoutingForModel(modelId: string): OpenRouterProviderRouting {
  const routing = OPENROUTER_ROUTING_CONFIG.modelProviderRouting[modelId];
  if (!routing) return {};
  return {
    provider: {
      order: [...routing.order],
      allow_fallbacks: routing.allow_fallbacks,
    },
  };
}
