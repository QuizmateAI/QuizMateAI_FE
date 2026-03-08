import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationLoading } from '@/context/NavigationLoadingContext';

/**
 * Hook bọc useNavigate: tự động hiện LoadingSpinner overlay khi chuyển trang.
 * Context (luôn mounted ở root) sẽ tự tắt loading khi pathname thay đổi.
 */
export function useNavigateWithLoading() {
  const navigate = useNavigate();
  const { startNavigation } = useNavigationLoading();

  return useCallback(
    (to, options) => {
      startNavigation();
      navigate(to, options);
    },
    [navigate, startNavigation]
  );
}
