import { useQuery } from '@tanstack/react-query';
import { listModels } from '../api/client';
import type { ProviderModel } from '../types/provider';

export function useProviderModels(providerId: string) {
  return useQuery<ProviderModel[]>({
    queryKey: ['provider-models', providerId],
    queryFn: () => listModels(providerId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!providerId,
  });
}
