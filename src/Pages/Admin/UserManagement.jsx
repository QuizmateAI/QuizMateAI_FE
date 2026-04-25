import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  MoreHorizontal,
  Shield,
  Ban,
  CheckCircle2,
  Eye,
  Trash2,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/Components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/Components/ui/dropdown-menu';
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAllUsers, updateUserStatus, forceDeleteUser } from '@/api/ManagementSystemAPI';
import AdminPagination from './components/AdminPagination';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from '@/Pages/SuperAdmin/Components/SuperAdminSurface';

function UserManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError, showSuccess } = useToast();

  const basePath = location.pathname.includes('super-admin') ? '/super-admin' : '/admin';
  const isSuperAdminContext = basePath === '/super-admin';
  const DELETE_PHRASE = 'FORCE-DELETE-USER';

  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const getFriendlyError = (err, fallbackText) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    return fallbackText;
  };

  const fetchUsers = async (page = 0, size = 10) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getAllUsers(page, size);
      const responseData = response?.data || {};

      if (Array.isArray(responseData)) {
        setUsers(responseData);
        setPagination({
          page: 0,
          size: responseData.length,
          totalPages: 1,
          totalElements: responseData.length,
        });
      } else if (responseData.content && Array.isArray(responseData.content)) {
        setUsers(responseData.content);
        setPagination({
          page: responseData.page ?? responseData.number ?? 0,
          size: responseData.size || size,
          totalPages: responseData.totalPages || 0,
          totalElements: responseData.totalElements || 0,
        });
      } else {
        setUsers([]);
        setPagination({ page: 0, size, totalPages: 0, totalElements: 0 });
      }
    } catch (err) {
      const message = getFriendlyError(
        err,
        t('userManagementPage.fetchError', 'Unable to load users.'),
      );
      setError(message);
      showError(message);
      console.error('Failed to load users:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePageChange = (newPage) => {
    fetchUsers(newPage, pagination.size);
  };

  const handlePageSizeChange = (newSize) => {
    fetchUsers(0, newSize);
  };

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await updateUserStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, status: newStatus } : user)),
      );
      showSuccess(
        t('userManagementPage.updateStatusSuccess', 'User status updated successfully.'),
      );
    } catch (err) {
      const message = getFriendlyError(
        err,
        t('userManagementPage.updateStatusError', 'Unable to update the user status.'),
      );
      setError(message);
      showError(message);
      console.error('Failed to update user status:', err);
    }
  };

  const openDeleteDialog = (user) => {
    setDeleteTarget(user);
    setDeleteConfirmText('');
    setDeleteReason('');
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteConfirmText('');
    setDeleteReason('');
  };

  const canSubmitDelete =
    deleteConfirmText === DELETE_PHRASE &&
    deleteReason.trim().length >= 10 &&
    deleteReason.trim().length <= 500;

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canSubmitDelete) return;

    setIsDeleting(true);
    try {
      await forceDeleteUser(deleteTarget.id, {
        confirmText: deleteConfirmText,
        reason: deleteReason.trim(),
      });
      showSuccess(t('userManagementPage.deleteSuccess', 'User deleted.'));
      setDeleteTarget(null);
      setDeleteConfirmText('');
      setDeleteReason('');
      fetchUsers(pagination.page, pagination.size);
    } catch (err) {
      const message = getFriendlyError(
        err,
        t('userManagementPage.deleteError', 'Unable to delete the user.'),
      );
      showError(message);
      console.error('Failed to delete user:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users
    .filter((user) => user.role === 'USER')
    .filter((user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'INACTIVE':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'BANNED':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        title={t('userPage.title')}
        actions={(
          <Button
            onClick={() => fetchUsers(pagination.page, pagination.size)}
            disabled={isLoading}
            className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('userPage.refresh')}
          </Button>
        )}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-100 px-4 py-3 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <Card
        className={`overflow-hidden rounded-[24px] border shadow-sm transition-colors duration-300 ${
          isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <CardHeader
          className={`flex flex-col items-center justify-between gap-4 border-b p-6 md:flex-row ${
            isDarkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <CardTitle className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('userPage.cardTitle')}
          </CardTitle>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('userPage.searchPlaceholder')}
              className={`h-11 rounded-xl border-slate-200 pl-10 dark:border-slate-700 dark:bg-slate-800 ${
                isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900'
              }`}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table className="table-auto min-w-full text-left">
              <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                <TableRow className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <TableHead className="w-[180px] text-left font-bold text-slate-500">
                    {t('userPage.table.username')}
                  </TableHead>
                  <TableHead className="w-[240px] text-left font-bold text-slate-500">
                    {t('userPage.table.email')}
                  </TableHead>
                  <TableHead className="w-[180px] text-left font-bold text-slate-500">
                    {t('userPage.table.fullName')}
                  </TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-slate-500">
                    {t('userPage.table.status')}
                  </TableHead>
                  <TableHead className="w-[140px] text-left font-bold text-slate-500">
                    {t('userPage.table.createdAt')}
                  </TableHead>
                  <TableHead className="w-[80px] text-right font-bold text-slate-500">
                    {t('userPage.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-4 text-center">
                      <ListSpinner variant="table" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      onClick={() => navigate(`${basePath}/users/${user.id}`)}
                      className={`cursor-pointer border-b transition-colors ${
                        isDarkMode
                          ? 'border-slate-800 hover:bg-slate-800/50'
                          : 'border-slate-100 hover:bg-slate-50/50'
                      }`}
                    >
                      <TableCell className={`w-[180px] text-left font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {user.username}
                      </TableCell>
                      <TableCell className={`w-[240px] text-left ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {user.email}
                      </TableCell>
                      <TableCell className={`w-[180px] text-left ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {user.fullName || '-'}
                      </TableCell>
                      <TableCell className="w-[100px] text-center">
                        <Badge className={`rounded-lg border-none px-2.5 py-0.5 ${getStatusBadge(user.status)}`}>
                          {t(`userPage.status.${user.status}`, user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`w-[140px] text-left text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell
                        className="w-[80px] text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className={`w-48 ${isDarkMode ? 'border-slate-700 bg-slate-800' : ''}`}
                          >
                            <DropdownMenuItem
                              onClick={() => navigate(`${basePath}/users/${user.id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4 text-blue-500" />
                              {t('userPage.viewDetail')}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(user.id, 'ACTIVE')}
                              disabled={user.status === 'ACTIVE'}
                              className="cursor-pointer"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                              {t('userPage.setActive')}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(user.id, 'INACTIVE')}
                              disabled={user.status === 'INACTIVE'}
                              className="cursor-pointer"
                            >
                              <Shield className="mr-2 h-4 w-4 text-amber-500" />
                              {t('userPage.setInactive')}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(user.id, 'BANNED')}
                              disabled={user.status === 'BANNED'}
                              className="cursor-pointer"
                            >
                              <Ban className="mr-2 h-4 w-4 text-rose-500" />
                              {t('userPage.setBanned')}
                            </DropdownMenuItem>

                            {isSuperAdminContext ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(user)}
                                  disabled={user.status === 'DELETED'}
                                  className="cursor-pointer text-rose-600 focus:text-rose-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4 text-rose-500" />
                                  {t('userManagementPage.deleteAction', 'Delete account')}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center font-medium italic text-slate-400">
                      {t('userPage.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {users.length > 0 ? (
            <AdminPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalElements={pagination.totalElements}
              pageSize={pagination.size}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isDarkMode={isDarkMode}
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent
          className={`sm:max-w-[520px] ${
            isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : ''
          }`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              {t('userManagementPage.deleteDialogTitle', 'Delete user account')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t(
                'userManagementPage.deleteDialogDescription',
                'This action is restricted to SUPER_ADMIN and will be recorded in the audit log. The account will be marked as DELETED and the email or username will be anonymized.',
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget ? (
            <div className="space-y-4">
              <div
                className={`rounded-xl border p-3 text-sm ${
                  isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div>
                  <span className="font-semibold">
                    {t('userManagementPage.deleteUsernameLabel', 'Username')}:
                  </span>{' '}
                  {deleteTarget.username}
                </div>
                <div>
                  <span className="font-semibold">
                    {t('userManagementPage.deleteEmailLabel', 'Email')}:
                  </span>{' '}
                  {deleteTarget.email}
                </div>
                <div>
                  <span className="font-semibold">
                    {t('userManagementPage.deleteIdLabel', 'ID')}:
                  </span>{' '}
                  {deleteTarget.id}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  {t('userManagementPage.deleteConfirmPrefix', 'Type exactly ')}
                  <code className="rounded bg-rose-100 px-1 py-0.5 text-rose-700">
                    {DELETE_PHRASE}
                  </code>
                  {t('userManagementPage.deleteConfirmSuffix', ' to confirm')}
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder={DELETE_PHRASE}
                  disabled={isDeleting}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  {t('userManagementPage.deleteReasonLabel', 'Deletion reason (10-500 characters)')}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={t(
                    'userManagementPage.deleteReasonPlaceholder',
                    'Describe the reason for the audit log',
                  )}
                  disabled={isDeleting}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-rose-400 ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-slate-200 bg-white'
                  }`}
                />
                <div className="text-right text-xs text-slate-400">{deleteReason.trim().length}/500</div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
              className="rounded-xl"
            >
              {t('userManagementPage.deleteCancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={!canSubmitDelete || isDeleting}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {isDeleting
                ? t('userManagementPage.deleting', 'Deleting...')
                : t('userManagementPage.deleteSubmit', 'Delete permanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default UserManagement;
