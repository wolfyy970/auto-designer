import type { GenerationProvider } from '../../types/provider';
import { OpenRouterGenerationProvider } from './claude';
import { LMStudioProvider } from './lmstudio';

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

// Register built-in providers
registerProvider(new OpenRouterGenerationProvider());
registerProvider(new LMStudioProvider());
