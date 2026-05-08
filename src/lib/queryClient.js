import { QueryClient } from '@tanstack/react-query';

/**
 * Stale-time presets — pick the right one per query based on freshness needs.
 *
 * Use {@link STALE_TIME.STATIC} (the default) for catalog data that rarely
 * changes (system roles, plan list, country dictionaries, etc.). Use
 * {@link STALE_TIME.REALTIME} for data backed by a websocket where the
 * cache is mostly a fallback while the socket is connecting/reconnecting
 * (group members, online presence, discussion threads). Use {@link STALE_TIME.LIVE}
 * for data where the user expects every visit to refetch (workspace activity,
 * latest quiz attempts).
 */
export const STALE_TIME = Object.freeze({
  STATIC: 1000 * 60 * 5,   // 5 min — default for stable catalogs
  SHORT: 1000 * 60,        // 1 min — semi-static lists that change occasionally
  REALTIME: 1000 * 30,     // 30 s — primarily fed via websocket
  LIVE: 0,                 // never stale — always refetch on mount
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tăng staleTime để dữ liệu vẫn còn "fresh" khi user chuyển tab/route →
      // tránh refetch ngay mỗi lần quay lại, giảm cảm giác chờ 3-4s.
      // Override per-query with STALE_TIME.REALTIME / .LIVE for data that must
      // be fresher (members, presence, discussion).
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
