import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Key, ClipboardList, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ListSpinner from '@/components/ui/ListSpinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  listPermissions,
  listRoles,
  createRole,
  syncRolePermissions,
  deleteRole,
  getAuditLogs,
  getUserPermissions,
  syncUserPermissions,
  getAllSystemUsers,
} from '@/api/ManagementSystemAPI';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  SuperAdminMetricCard,
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminTabs,
} from './Components/SuperAdminSurface';
import {
  filterRemovedLearningConfigAuditLogs,
  filterRemovedLearningConfigPermissionCodes,
  filterRemovedLearningConfigPermissions,
} from '@/lib/learningConfigAdminFilters';

const RBAC_PERMS_KEY = ['superAdmin', 'rbac', 'permissions'];
const RBAC_ROLES_KEY = ['superAdmin', 'rbac', 'roles'];
const RBAC_AUDIT_KEY = ['superAdmin', 'rbac', 'audit'];
const RBAC_USERS_KEY = ['superAdmin', 'rbac', 'users'];

function RbacManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const getFriendlyError = (err, fallbackText, fallbackKey) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    if (fallbackKey) return t(fallbackKey);
    return fallbackText;
  };
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [activeTab, setActiveTab] = useState('permissions');
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRoleModalLoading, setIsRoleModalLoading] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const permsQuery = useQuery({
    queryKey: RBAC_PERMS_KEY,
    queryFn: async () => {
      const res = await listPermissions();
      const responseData = res?.data ?? res;
      const list = Array.isArray(responseData) ? responseData : (Array.isArray(responseData?.content) ? responseData.content : []);
      return filterRemovedLearningConfigPermissions(list);
    },
    enabled: activeTab === 'permissions' || activeTab === 'roles',
  });
  const permissions = permsQuery.data ?? [];

  const rolesQuery = useQuery({
    queryKey: RBAC_ROLES_KEY,
    queryFn: async () => {
      const res = await listRoles();
      const responseData = res?.data ?? res;
      return Array.isArray(responseData) ? responseData : [];
    },
    enabled: activeTab === 'roles',
  });
  const roles = rolesQuery.data ?? [];

  const auditQuery = useQuery({
    queryKey: RBAC_AUDIT_KEY,
    queryFn: async () => {
      const res = await getAuditLogs();
      const responseData = res?.data ?? res;
      const list = Array.isArray(responseData) ? responseData : (Array.isArray(responseData?.content) ? responseData.content : []);
      return filterRemovedLearningConfigAuditLogs(list);
    },
    enabled: activeTab === 'audit',
  });
  const auditLogs = auditQuery.data ?? [];

  const usersQuery = useQuery({
    queryKey: RBAC_USERS_KEY,
    queryFn: async () => {
      const res = await getAllSystemUsers();
      const responseData = res?.data ?? res;
      return Array.isArray(responseData) ? responseData : (Array.isArray(responseData?.content) ? responseData.content : []);
    },
  });
  const users = usersQuery.data ?? [];

  const isLoading = permsQuery.isLoading || rolesQuery.isLoading || auditQuery.isLoading;

  useEffect(() => {
    const e = permsQuery.error || rolesQuery.error || auditQuery.error;
    if (e) setError(getFriendlyError(e, null, 'rbac.errors.loadPermissions'));
  }, [permsQuery.error, rolesQuery.error, auditQuery.error]);

  const ensurePermissionsLoaded = async () => {
    if (permissions.length > 0) return permissions;
    const result = await permsQuery.refetch();
    return result.data ?? [];
  };

  const openUserPermissions = async (user) => {
    setSelectedUser(user);
    setUserPermissions(filterRemovedLearningConfigPermissionCodes(user?.permissions ? [...user.permissions] : []));
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      const res = await getUserPermissions(user.id);
      const data = res?.data ?? res;
      setUserPermissions(
        filterRemovedLearningConfigPermissionCodes(Array.isArray(data) ? data : user?.permissions ? [...user.permissions] : [])
      );
    } catch (err) {
      setUserPermissions(filterRemovedLearningConfigPermissionCodes(user?.permissions ? [...user.permissions] : []));
    } finally {
      setIsModalLoading(false);
    }
  };

  const openRolePermissions = async (role) => {
    setSelectedRole(role);
    setRolePermissions(filterRemovedLearningConfigPermissionCodes(role?.permissions ? [...role.permissions] : []));
    setIsRoleModalOpen(true);
    setIsRoleModalLoading(true);
    try {
      await ensurePermissionsLoaded();
    } catch (err) {
      const msg = getFriendlyError(err, null, 'rbac.errors.loadPermissions');
      setError(msg);
      showError(msg);
    } finally {
      setIsRoleModalLoading(false);
    }
  };

  const invalidateRoles = () => queryClient.invalidateQueries({ queryKey: RBAC_ROLES_KEY });

  const syncUserMutation = useMutation({
    mutationFn: ({ userId, perms }) => syncUserPermissions(userId, perms),
    onSuccess: async (_resp, { userId }) => {
      showSuccess(t('rbac.syncSuccess'));
      try {
        const refreshed = await getUserPermissions(userId);
        const refreshedData = refreshed?.data ?? refreshed;
        setUserPermissions(filterRemovedLearningConfigPermissionCodes(Array.isArray(refreshedData) ? refreshedData : []));
      } catch {
        // ignore refresh failure
      }
    },
    onError: (err) => {
      const msg = getFriendlyError(err, null, 'rbac.syncError');
      setError(msg);
      showError(msg);
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (roleName) => createRole({ roleName }),
    onSuccess: () => {
      setNewRoleName('');
      setIsCreateRoleOpen(false);
      showSuccess(t('rbac.success.roleCreated'));
      invalidateRoles();
    },
    onError: (err) => {
      const msg = getFriendlyError(err, null, 'rbac.errors.createRole');
      setError(msg);
      showError(msg);
    },
  });

  const syncRoleMutation = useMutation({
    mutationFn: ({ roleId, perms }) => syncRolePermissions(roleId, perms),
    onSuccess: () => {
      showSuccess(t('rbac.success.rolePermissionsSynced'));
      invalidateRoles();
    },
    onError: (err) => {
      const msg = getFriendlyError(err, null, 'rbac.errors.syncRolePermissions');
      setError(msg);
      showError(msg);
    },
  });

  const handleSyncPermissions = () => {
    if (!selectedUser) return;
    setError('');
    syncUserMutation.mutate({ userId: selectedUser.id, perms: userPermissions });
  };

  const handleCreateRole = () => {
    const trimmedRoleName = newRoleName.trim();
    if (!trimmedRoleName) {
      const msg = t('rbac.errors.roleNameRequired');
      setError(msg);
      showError(msg);
      return;
    }
    setError('');
    createRoleMutation.mutate(trimmedRoleName);
  };

  const handleSyncRolePermissions = () => {
    if (!selectedRole) return;
    setError('');
    syncRoleMutation.mutate({ roleId: selectedRole.roleId, perms: rolePermissions });
  };

  const handleDeleteRole = async (role) => {
    if (!role || role.isSystem) return;
    const confirmed = window.confirm(
      t('rbac.confirmDeleteRole', {
        role: role.roleName,
        defaultValue: 'Delete role {{role}}?',
      })
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteRole(role.roleId);
      showSuccess(t('rbac.success.roleDeleted'));
      invalidateRoles();
    } catch (err) {
      const msg = getFriendlyError(err, null, 'rbac.errors.deleteRole');
      setError(msg);
      showError(msg);
    }
  };

  const togglePermission = (code, granted) => {
    if (granted) {
      setUserPermissions((p) => p.filter((c) => c !== code));
    } else {
      setUserPermissions((p) => [...p, code]);
    }
  };

  const toggleRolePermission = (code, granted) => {
    if (granted) {
      setRolePermissions((current) => current.filter((permissionCode) => permissionCode !== code));
    } else {
      setRolePermissions((current) => [...current, code]);
    }
  };

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const customPermissionUsers = users.filter((user) => Array.isArray(user?.permissions) && user.permissions.length > 0).length;

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString(locale);
  };

  const tabs = [
    { id: 'roles', labelKey: 'rbac.tabs.roles', icon: Shield },
    { id: 'permissions', labelKey: 'rbac.tabs.permissions', icon: Key },
    { id: 'audit', labelKey: 'rbac.tabs.auditLogs', icon: ClipboardList },
  ];

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow="Access Control"
        title={t('rbac.title')}
        description={t('rbac.desc')}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SuperAdminMetricCard
          label={t('rbac.tabs.roles')}
          value={roles.length.toLocaleString(locale)}
          helper={t('rbac.metricRoles', 'Configured system roles')}
          icon={Shield}
          tone="blue"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('rbac.tabs.permissions')}
          value={permissions.length.toLocaleString(locale)}
          helper={t('rbac.metricPermissions', 'Available permission codes')}
          icon={Key}
          tone="amber"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('rbac.tabs.auditLogs')}
          value={auditLogs.length.toLocaleString(locale)}
          helper={t('rbac.metricAudit', 'Recorded permission changes')}
          icon={ClipboardList}
          tone="slate"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('rbac.metricUsersLabel', 'Overrides')}
          value={customPermissionUsers.toLocaleString(locale)}
          helper={t('rbac.metricUsersHelper', 'Users with direct permission overrides')}
          icon={Shield}
          tone="emerald"
          isDarkMode={isDarkMode}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}
      <SuperAdminTabs
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.labelKey.startsWith('rbac.') ? t(tab.labelKey) : tab.labelKey,
        }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'roles' && (
        <Card
          className={`border shadow-sm overflow-hidden rounded-[24px] transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className={`text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {t('rbac.roleManagementTitle', 'Role management')}
              </CardTitle>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('rbac.roleManagementDesc', 'Create custom roles, review permissions, and sync permissions by role.')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => rolesQuery.refetch()}
                disabled={rolesQuery.isFetching}
                className="rounded-xl"
                aria-label={t('common.refresh')}
                title={t('common.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${rolesQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" onClick={() => setIsCreateRoleOpen(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                {t('rbac.createRole', 'Create role')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                  <TableRow className="border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.role', 'Role')}</TableHead>
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.type', 'Type')}</TableHead>
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.permissions', 'Permissions')}</TableHead>
                    <TableHead className="text-right font-bold text-slate-500">{t('rbac.columns.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <ListSpinner variant="table" />
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-400 italic">
                        {t('rbac.emptyRoles', 'No roles yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow
                        key={role.roleId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                      >
                        <TableCell className="font-semibold">{role.roleName}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              role.isSystem
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }
                          >
                            {role.isSystem
                              ? t('rbac.systemRoleLabel', 'SYSTEM')
                              : t('rbac.customRoleLabel', 'CUSTOM')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[460px]">
                            {(role.permissions || []).slice(0, 4).map((code) => (
                              <Badge key={code} variant="outline" className="font-mono text-xs">
                                {code}
                              </Badge>
                            ))}
                            {(role.permissions || []).length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.permissions.length - 4}
                              </Badge>
                            )}
                            {(role.permissions || []).length === 0 && (
                              <span className="text-sm text-slate-400">{t('rbac.noPermission', 'No permissions')}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRolePermissions(role)}
                              className="rounded-lg"
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {t('rbac.permissionsAction', 'Permissions')}
                            </Button>
                            {!role.isSystem && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRole(role)}
                                className="rounded-lg text-rose-600 border-rose-200 hover:text-rose-700"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('rbac.deleteAction', 'Delete')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'permissions' && (
        <>
          <Card
            className={`border shadow-sm overflow-hidden rounded-[24px] transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className={`text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {t('rbac.permissionsList')}
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={() => permsQuery.refetch()}
                disabled={permsQuery.isFetching}
                className="rounded-xl"
                aria-label={t('common.refresh')}
                title={t('common.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${permsQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                    <TableRow className="border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="font-bold text-slate-500">{t('rbac.columns.code', 'Code')}</TableHead>
                      <TableHead className="font-bold text-slate-500">{t('rbac.columns.description', 'Description')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4">
                          <ListSpinner variant="table" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      permissions.map((p) => (
                        <TableRow
                          key={p.permissionId ?? p.code}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <TableCell className="font-mono font-medium">{p.code}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{p.description || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border shadow-sm overflow-hidden rounded-[24px] transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className={`text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {t('rbac.userRoleManagement')}
              </CardTitle>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('rbac.userRoleDesc')}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                    <TableRow className="border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="font-bold text-slate-500">{t('rbac.columns.username', 'Username')}</TableHead>
                      <TableHead className="font-bold text-slate-500">{t('rbac.columns.email', 'Email')}</TableHead>
                      <TableHead className="font-bold text-slate-500">{t('rbac.columns.role', 'Role')}</TableHead>
                      <TableHead className="font-bold text-slate-500">{t('rbac.columns.status', 'Status')}</TableHead>
                      <TableHead className="text-right font-bold text-slate-500">{t('rbac.columns.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
                      .map((user) => (
                        <TableRow
                          key={user.id}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                        >
                          <TableCell className="font-semibold">{user.username}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.role === 'SUPER_ADMIN'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUserPermissions(user)}
                              className="rounded-lg"
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {t('rbac.managePermissionsAction', 'Manage permissions')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'audit' && (
        <Card
          className={`border shadow-sm overflow-hidden rounded-[24px] transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className={`text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              {t('rbac.auditLogs')}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => auditQuery.refetch()}
              disabled={auditQuery.isFetching}
              className="rounded-xl"
              aria-label={t('common.refresh')}
              title={t('common.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${auditQuery.isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                  <TableRow className="border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.actor', 'Actor')}</TableHead>
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.action', 'Action')}</TableHead>
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.target', 'Target')}</TableHead>
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.change', 'Before → After')}</TableHead>
                    <TableHead className="font-bold text-slate-500">{t('rbac.columns.time', 'Time')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        <ListSpinner variant="table" />
                      </TableCell>
                    </TableRow>
                  ) : auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">
                        {t('rbac.noAuditLogs', 'No audit logs yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow
                        key={log.auditId}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <TableCell>{log.actorEmail || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.targetType || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {log.beforeState} → {log.afterState}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(log.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Permission Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={`max-w-2xl max-h-[85vh] overflow-y-auto ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'
          }`}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>
              {t('rbac.userPermissionTitle', { username: selectedUser?.username, defaultValue: 'Manage permissions: {{username}}' })}
            </DialogTitle>
            <DialogDescription>
              {t('rbac.userPermissionDesc', 'Assign roles and configure permissions for ADMIN accounts. SUPER_ADMIN keeps full default access.')}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 py-4">
              {selectedUser.role === 'ADMIN' && (
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">
                    {t('rbac.userPermissionsCount', { count: userPermissions.length, defaultValue: 'Permissions ({{count}})' })}
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl dark:border-slate-700">
                    {permissions.map((p) => {
                      const granted = userPermissions.includes(p.code);
                      return (
                        <Badge
                          key={p.code}
                          variant={granted ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => togglePermission(p.code, granted)}
                        >
                          {p.code}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
            {selectedUser?.role === 'ADMIN' && (
              <Button onClick={handleSyncPermissions} disabled={isModalLoading}>
                {t('rbac.syncPermissions', 'Sync permissions')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent
          className={`max-w-md ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'
          }`}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>{t('rbac.createRoleTitle', 'Create a new role')}</DialogTitle>
            <DialogDescription>
              {t('rbac.createRoleDesc', 'Enter the new role name. The backend will normalize it to uppercase.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block">{t('rbac.roleName', 'Role name')}</label>
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder={t('rbac.roleNamePlaceholder', 'Example: CONTENT_MANAGER')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
            <Button onClick={handleCreateRole} disabled={isModalLoading}>
              {t('rbac.createRole', 'Create role')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent
          className={`max-w-3xl max-h-[85vh] overflow-y-auto ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'
          }`}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>
              {t('rbac.rolePermissionTitle', { role: selectedRole?.roleName, defaultValue: 'Sync permissions for role: {{role}}' })}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.roleName === 'SUPER_ADMIN'
                ? t('rbac.superAdminReadonlyDesc', 'SUPER_ADMIN always has all default permissions and cannot be edited manually.')
                : t('rbac.syncRoleDesc', 'Choose the permissions applied to this role. This action syncs the full permission set for the role.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Badge
                className={
                  selectedRole?.isSystem
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }
              >
                {selectedRole?.isSystem
                  ? t('rbac.systemRoleLabel', 'SYSTEM')
                  : t('rbac.customRoleLabel', 'CUSTOM')}
              </Badge>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {t('rbac.selectedPermissionsCount', { count: rolePermissions.length, defaultValue: '{{count}} permissions selected' })}
              </span>
            </div>
            {isRoleModalLoading ? (
              <ListSpinner variant="table" />
            ) : (
              <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-2 border rounded-xl dark:border-slate-700">
                {permissions.map((permission) => {
                  const granted = rolePermissions.includes(permission.code);
                  return (
                    <Badge
                      key={permission.code}
                      variant={granted ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleRolePermission(permission.code, granted)}
                    >
                      {permission.code}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
            <Button
              onClick={handleSyncRolePermissions}
              disabled={isRoleModalLoading || !selectedRole || selectedRole?.roleName === 'SUPER_ADMIN'}
            >
              {t('rbac.syncPermissions', 'Sync permissions')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default RbacManagement;
