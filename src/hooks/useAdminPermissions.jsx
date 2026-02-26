import { useState, useEffect, createContext, useContext } from 'react';
import { getMyPermissions } from '@/api/ManagementSystemAPI';

const AdminPermissionsContext = createContext({ permissions: new Set(), loading: true });

export function AdminPermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await getMyPermissions();
        const codes = res?.data ?? res ?? [];
        setPermissions(new Set(Array.isArray(codes) ? codes : []));
      } catch {
        setPermissions(new Set());
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  return (
    <AdminPermissionsContext.Provider value={{ permissions, loading }}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  return useContext(AdminPermissionsContext);
}
