import { QueryClient } from '@tanstack/react-query';

export const STALE_TIME = Object.freeze({
  STATIC: 1000 * 60 * 5,   // 5 min — default for stable catalogs
  SHORT: 1000 * 60,        // 1 min — semi-static lists that change occasionally
  REALTIME: 1000 * 30,     // 30 s — primarily fed via websocket
  LIVE: 0,                 // never stale — always refetch on mount
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.STATIC,
      gcTime: 1000 * 60 * 10, // 10 phút giữ cache trong bộ nhớ
      retry: 1,
      refetchOnWindowFocus: false,
      // Mặc định React Query trả cache ngay và chỉ refetch ngầm khi stale →
      // user thấy dữ liệu ngay, không chờ.
      refetchOnReconnect: 'always',
    },
  },
});
