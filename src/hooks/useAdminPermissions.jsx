import { useState, useEffect, createContext, useContext } from 'react';
import { getMyPermissions } from '@/api/ManagementSystemAPI';
import { getCurrentUser } from '@/api/Authentication';

const AdminPermissionsContext = createContext({ permissions: new Set(), loading: true });
const SUPER_ADMIN_PERMISSION_CODES = [
  'admin:create',
  'user:read',
  'user:status_update',
  'subscription:read',
  'subscription:write',
  'plan:write',
  'credit-package:read',
  'credit-package:write',
  'payment:read',
  'payment:write',
  'material:moderate',
  'audit:read',
  'system-settings:read',
  'system-settings:write',
  'group:read_all',
  'learning-config:read',
  'learning-config:write',
];

export function AdminPermissionsProvider({ children }) {
  const currentUser = getCurrentUser();
  const isSuperAdmin = String(currentUser?.role || '').toUpperCase() === 'SUPER_ADMIN';
  const [permissions, setPermissions] = useState(
    () => new Set(isSuperAdmin ? SUPER_ADMIN_PERMISSION_CODES : [])
  );
  const [loading, setLoading] = useState(!isSuperAdmin);

  useEffect(() => {
    let isMounted = true;

    const fetchPermissions = async () => {
      try {
        const res = await getMyPermissions();
        const codes = res?.data ?? res ?? [];
        if (!isMounted) return;
        if (Array.isArray(codes) && codes.length > 0) {
          setPermissions(new Set(codes));
        } else if (isSuperAdmin) {
          setPermissions(new Set(SUPER_ADMIN_PERMISSION_CODES));
        } else {
          setPermissions(new Set());
        }
      } catch {
        if (!isMounted) return;
        setPermissions(new Set(isSuperAdmin ? SUPER_ADMIN_PERMISSION_CODES : []));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPermissions();

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin]);

  return (
    <AdminPermissionsContext.Provider value={{ permissions, loading }}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  return useContext(AdminPermissionsContext);
}
