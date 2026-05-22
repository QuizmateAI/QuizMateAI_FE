import { useQuery } from '@tanstack/react-query';
import { getAiFeatureCatalog } from '@/api/ManagementSystemAPI';

export const AI_FEATURE_CATALOG_QUERY_KEY = ['ai-feature-catalog'];

const EMPTY_CATALOG = {
  userPaid: [],
  system: [],
  planBased: [],
};

function normalizeCatalog(res) {
  const data = res?.data ?? res ?? {};
  return {
    userPaid: Array.isArray(data?.userPaid) ? data.userPaid : [],
    system: Array.isArray(data?.system) ? data.system : [],
    planBased: Array.isArray(data?.planBased) ? data.planBased : [],
  };
}

export function useAiFeatureCatalog(options = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: AI_FEATURE_CATALOG_QUERY_KEY,
    queryFn: async () => normalizeCatalog(await getAiFeatureCatalog()),
    enabled,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    placeholderData: (previous) => previous,
  });

  return {
    catalog: query.data ?? EMPTY_CATALOG,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
