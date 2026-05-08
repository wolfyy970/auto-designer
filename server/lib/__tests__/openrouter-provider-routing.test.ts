import { describe, expect, it } from 'vitest';
import rawRoutingConfig from '../../../config/openrouter-routing.json';
import {
  OpenRouterRoutingConfigSchema,
  openRouterProviderRoutingForModel,
} from '../openrouter-provider-routing';

describe('openRouterProviderRoutingForModel', () => {
  it('round-trips config/openrouter-routing.json through the schema', () => {
    expect(OpenRouterRoutingConfigSchema.safeParse(rawRoutingConfig).success).toBe(true);
  });

  it('pins MiniMax M2.5 to Mara with fallbacks disabled', () => {
    expect(openRouterProviderRoutingForModel('minimax/minimax-m2.5')).toEqual({
      provider: {
        order: ['mara'],
        allow_fallbacks: false,
      },
    });
  });

  it('does not alter routing for other models', () => {
    expect(openRouterProviderRoutingForModel('minimax/minimax-m2.7')).toEqual({});
  });
});
