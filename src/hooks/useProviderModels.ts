import { useQuery } from '@tanstack/react-query';
import { getProvider } from '../services/providers/registry';
import type { ProviderModel } from '../types/provider';

export function useProviderModels(providerId: string) {
  return useQuery<ProviderModel[]>({
    queryKey: ['provider-models', providerId],
    queryFn: async () => {
      const provider = getProvider(providerId);
      if (!provider) return [];
      return provider.listModels();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!providerId,
  });
}
