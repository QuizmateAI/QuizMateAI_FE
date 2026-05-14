import { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { getMyPermissions } from '@/api/ManagementSystemAPI';
import { getCurrentUser } from '@/api/Authentication';
import { getAccessToken } from '@/utils/tokenStorage';
import { getPermsFromAccessToken } from '@/utils/jwt';

const AdminPermissionsContext = createContext({ permissions: new Set(), loading: true });
const SUPER_ADMIN_PERMISSION_CODES = [
  'admin:create',
  'user:read',
  'user:status_update',
  'user:delete',
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
  'group:delete',
  'learning-config:read',
  'learning-config:write',
  'ai-provider:read',
  'ai-provider:test',
  'ai-model:read',
  'ai-model:write',
  'ai-cost:read',
  'ai-audit:read',
  'feedback:read',
  'feedback:write',
];

export function AdminPermissionsProvider({ children }) {
  const currentUser = getCurrentUser();
  const isSuperAdmin = String(currentUser?.role || '').toUpperCase() === 'SUPER_ADMIN';

  // BE giờ embed claim `perms` vào access token — decode để skip extra
  // API round-trip ở mount. Token rotation (1h) sẽ tự refresh perms qua
  // bootstrap; mid-session role change cần reload (giống behavior cũ).
  const tokenPerms = useMemo(
    () => getPermsFromAccessToken(getAccessToken()),
    [],
  );
  const hasTokenPerms = Array.isArray(tokenPerms);

  const [permissions, setPermissions] = useState(() => {
    if (hasTokenPerms) return new Set(tokenPerms);
    return new Set(isSuperAdmin ? SUPER_ADMIN_PERMISSION_CODES : []);
  });
  const [loading, setLoading] = useState(!hasTokenPerms && !isSuperAdmin);

  useEffect(() => {
    if (hasTokenPerms) return undefined; // JWT claim is authoritative for UX.

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
  }, [isSuperAdmin, hasTokenPerms]);

  return (
    <AdminPermissionsContext.Provider value={{ permissions, loading }}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  return useContext(AdminPermissionsContext);
}
