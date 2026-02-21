import type { GenerationProvider } from '../../../src/types/provider.ts';
import { OpenRouterGenerationProvider } from './openrouter.ts';
import { LMStudioProvider } from './lmstudio.ts';

const providers = new Map<string, GenerationProvider>();

function registerProvider(provider: GenerationProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): GenerationProvider | undefined {
  return providers.get(id);
}

export function getAvailableProviders(): GenerationProvider[] {
  return Array.from(providers.values()).filter((p) => p.isAvailable());
}

registerProvider(new OpenRouterGenerationProvider());
registerProvider(new LMStudioProvider());
