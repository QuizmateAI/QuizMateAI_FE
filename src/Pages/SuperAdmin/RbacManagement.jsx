import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Key, ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import ListSpinner from '@/Components/ui/ListSpinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/Components/ui/dialog';
import {
  listPermissions,
  getAuditLogs,
  getUserPermissions,
  syncUserPermissions,
  getAllSystemUsers,
} from '@/api/ManagementSystemAPI';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import {
  filterRemovedLearningConfigAuditLogs,
  filterRemovedLearningConfigPermissionCodes,
  filterRemovedLearningConfigPermissions,
} from '@/lib/learningConfigAdminFilters';

const ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];

function RbacManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();
  const getFriendlyError = (err, fallbackText, fallbackKey) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    if (fallbackKey) return t(fallbackKey);
    return fallbackText;
  };
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [activeTab, setActiveTab] = useState('permissions'); // permissions | audit
  const [permissions, setPermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // User permission modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const fetchPermissions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await listPermissions();
      const data = res?.data ?? res;
      setPermissions(filterRemovedLearningConfigPermissions(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(getFriendlyError(err, 'Không thể tải danh sách quyền'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getAuditLogs();
      const data = res?.data ?? res;
      setAuditLogs(filterRemovedLearningConfigAuditLogs(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(getFriendlyError(err, 'Không thể tải nhật ký kiểm toán'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await getAllSystemUsers();
      const data = res?.data ?? res;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions') fetchPermissions();
    else if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const openUserPermissions = async (user) => {
    setSelectedUser(user);
    setUserRole(user?.role || '');
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

  const handleSyncPermissions = async () => {
    if (!selectedUser) return;
    setIsModalLoading(true);
    setError('');
    try {
      await syncUserPermissions(selectedUser.id, userPermissions);
      showSuccess(t('rbac.syncSuccess'));
      const refreshed = await getUserPermissions(selectedUser.id);
      const refreshedData = refreshed?.data ?? refreshed;
      setUserPermissions(filterRemovedLearningConfigPermissionCodes(Array.isArray(refreshedData) ? refreshedData : []));
    } catch (err) {
      const msg = getFriendlyError(err, null, 'rbac.syncError');
      setError(msg);
      showError(msg);
    } finally {
      setIsModalLoading(false);
    }
  };

  const togglePermission = (code, granted) => {
    if (granted) {
      setUserPermissions((p) => p.filter((c) => c !== code));
    } else {
      setUserPermissions((p) => [...p, code]);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('vi-VN');
  };

  const tabs = [
    { id: 'permissions', labelKey: 'rbac.tabs.permissions', icon: Key },
    { id: 'audit', labelKey: 'rbac.tabs.auditLogs', icon: ClipboardList },
  ];

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      <div>
        <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {t('rbac.title')}
        </h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-medium`}>{t('rbac.desc')}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {t(tab.id === 'audit' ? 'rbac.tabs.auditLogs' : 'rbac.tabs.permissions')}
          </button>
        ))}
      </div>

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
                size="sm"
                onClick={fetchPermissions}
                disabled={isLoading}
                className="rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                    <TableRow className="border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="font-bold text-slate-500">ID</TableHead>
                      <TableHead className="font-bold text-slate-500">Code</TableHead>
                      <TableHead className="font-bold text-slate-500">Mô tả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          <ListSpinner variant="table" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      permissions.map((p) => (
                        <TableRow
                          key={p.permissionId ?? p.code}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">
                            {p.permissionId}
                          </TableCell>
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
                      <TableHead className="font-bold text-slate-500">ID</TableHead>
                      <TableHead className="font-bold text-slate-500">Username</TableHead>
                      <TableHead className="font-bold text-slate-500">Email</TableHead>
                      <TableHead className="font-bold text-slate-500">Role</TableHead>
                      <TableHead className="font-bold text-slate-500">Status</TableHead>
                      <TableHead className="text-right font-bold text-slate-500">Hành động</TableHead>
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
                          <TableCell className="font-mono text-blue-600 dark:text-blue-400">{user.id}</TableCell>
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
                              Quản lý quyền
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
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={isLoading} className="rounded-xl">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                  <TableRow className="border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="font-bold text-slate-500">ID</TableHead>
                    <TableHead className="font-bold text-slate-500">Actor</TableHead>
                    <TableHead className="font-bold text-slate-500">Action</TableHead>
                    <TableHead className="font-bold text-slate-500">Target</TableHead>
                    <TableHead className="font-bold text-slate-500">Trước → Sau</TableHead>
                    <TableHead className="font-bold text-slate-500">Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        <ListSpinner variant="table" />
                      </TableCell>
                    </TableRow>
                  ) : auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">
                        Chưa có nhật ký
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow
                        key={log.auditId}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <TableCell className="font-mono text-sm">{log.auditId}</TableCell>
                        <TableCell>{log.actorEmail || `#${log.actorId}`}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.targetType} #{log.targetId}
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
              Quản lý quyền: {selectedUser?.username}
            </DialogTitle>
            <DialogDescription>
              Gán role và cấu hình permissions cho tài khoản ADMIN. SUPER_ADMIN có toàn quyền mặc định.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 py-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  disabled={selectedUser.role === 'SUPER_ADMIN'}
                  className={`w-full rounded-xl border px-4 py-2 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                  }`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {selectedUser.role === 'ADMIN' && (
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">
                    Permissions ({userPermissions.length})
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
              Đóng
            </Button>
            {selectedUser?.role === 'ADMIN' && (
              <Button onClick={handleSyncPermissions} disabled={isModalLoading}>
                Đồng bộ Permissions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RbacManagement;
