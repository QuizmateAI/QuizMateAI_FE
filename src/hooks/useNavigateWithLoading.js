import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationLoading } from '@/context/NavigationLoadingContext';

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
