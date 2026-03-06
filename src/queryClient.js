import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 phút
      gcTime: 1000 * 60 * 5, // 5 phút cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
