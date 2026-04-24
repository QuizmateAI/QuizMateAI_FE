import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getMyWallet } from '@/api/ManagementSystemAPI';

export const WALLET_QUERY_KEY = ['wallet'];

const EMPTY_WALLET_SUMMARY = {
  totalAvailableCredits: 0,
  regularCreditBalance: 0,
  planCreditBalance: 0,
  hasActivePlan: false,
  planCreditExpiresAt: null,
};

function normalizeWalletPayload(res) {
  const data = res?.data ?? res ?? {};
  return {
    ...EMPTY_WALLET_SUMMARY,
    ...data,
    totalAvailableCredits: data?.totalAvailableCredits ?? data?.balance ?? 0,
    regularCreditBalance: data?.regularCreditBalance ?? 0,
    planCreditBalance: data?.planCreditBalance ?? 0,
    hasActivePlan: Boolean(data?.hasActivePlan),
    planCreditExpiresAt: data?.planCreditExpiresAt ?? null,
  };
}

/**
 * Hook đọc ví credit của user hiện tại qua React Query.
 * Các trang (Home, Profile, Plan, Sidebar...) dùng chung một query key →
 * dedupe network, share cache, invalidate tập trung sau khi trừ/cộng credit.
 */
export function useWallet(options = {}) {
  const { enabled = true, staleTime = 1000 * 60 * 5 } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: async () => normalizeWalletPayload(await getMyWallet()),
    enabled,
    staleTime,
    placeholderData: (previous) => previous,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY }),
    [queryClient],
  );

  return {
    wallet: query.data ?? EMPTY_WALLET_SUMMARY,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}

export { EMPTY_WALLET_SUMMARY };
