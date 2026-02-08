import type { GenerationProvider } from '../../types/provider';
import { PreviewProvider } from './preview';
import { OpenRouterGenerationProvider } from './claude';

const providers = new Map<string, GenerationProvider>();

export function registerProvider(provider: GenerationProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): GenerationProvider | undefined {
  return providers.get(id);
}

export function getAvailableProviders(): GenerationProvider[] {
  return Array.from(providers.values()).filter((p) => p.isAvailable());
}

export function getAllProviders(): GenerationProvider[] {
  return Array.from(providers.values());
}

// Register built-in providers
registerProvider(new PreviewProvider());
registerProvider(new OpenRouterGenerationProvider());
