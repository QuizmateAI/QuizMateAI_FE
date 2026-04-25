import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tăng staleTime để dữ liệu vẫn còn "fresh" khi user chuyển tab/route →
      // tránh refetch ngay mỗi lần quay lại, giảm cảm giác chờ 3-4s.
      staleTime: 1000 * 60 * 5, // 5 phút
      gcTime: 1000 * 60 * 10, // 10 phút giữ cache trong bộ nhớ
      retry: 1,
      refetchOnWindowFocus: false,
      // Mặc định React Query trả cache ngay và chỉ refetch ngầm khi stale →
      // user thấy dữ liệu ngay, không chờ.
      refetchOnReconnect: 'always',
    },
  },
});
