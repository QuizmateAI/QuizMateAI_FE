import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const NavigationLoadingContext = createContext(null);

export function NavigationLoadingProvider({ children }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  const pendingRef = useRef(false);

  const startNavigation = useCallback(() => {
    pendingRef.current = true;
    setIsNavigating(true);
  }, []);

  // Khi location thay đổi (pathname hoặc key) → trang mới đã render → tắt loading
  // Dùng location.key vì navigate cùng URL (replace state) không đổi pathname nhưng đổi key
  useEffect(() => {
    if (pendingRef.current) {
      const timer = setTimeout(() => {
        pendingRef.current = false;
        setIsNavigating(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.key]);

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
