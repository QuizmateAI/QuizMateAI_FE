import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingSpinner from '@/Components/ui/LoadingSpinner';

const NavigationLoadingContext = createContext(null);

export function NavigationLoadingProvider({ children }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  const pendingRef = useRef(false);

  const startNavigation = useCallback(() => {
    pendingRef.current = true;
    setIsNavigating(true);
  }, []);

  // Khi pathname thay đổi → trang mới đã render → tắt loading
  useEffect(() => {
    if (pendingRef.current) {
      const timer = setTimeout(() => {
        pendingRef.current = false;
        setIsNavigating(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <NavigationLoadingContext.Provider value={{ startNavigation }}>
      {children}
      {isNavigating && (
        <div className="fixed inset-0 z-[9999]">
          <LoadingSpinner />
        </div>
      )}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  return ctx;
}
