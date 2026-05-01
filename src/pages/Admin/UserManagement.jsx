import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, MoreHorizontal, Shield, Ban, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ListSpinner from "@/components/ui/ListSpinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAllUsers, updateUserStatus, forceDeleteUser } from '@/api/ManagementSystemAPI';
import AdminPagination from './components/AdminPagination';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from '@/pages/SuperAdmin/Components/SuperAdminSurface';

const ADMIN_USERS_QUERY_KEY = ['admin', 'users'];

function normalizeUserListResponse(response, requestedSize) {
  const responseData = response?.data || {};
  if (Array.isArray(responseData)) {
    return {
      users: responseData,
      page: 0,
      size: responseData.length || requestedSize,
      totalPages: 1,
      totalElements: responseData.length,
    };
  }
  if (responseData.content && Array.isArray(responseData.content)) {
    return {
      users: responseData.content,
      page: responseData.page ?? responseData.number ?? 0,
      size: responseData.size || requestedSize,
      totalPages: responseData.totalPages || 0,
      totalElements: responseData.totalElements || 0,
    };
  }
  return { users: [], page: 0, size: requestedSize, totalPages: 0, totalElements: 0 };
}

function UserManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const basePath = location.pathname.includes('super-admin') ? '/super-admin' : '/admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const isSuperAdminContext = basePath === '/super-admin';
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const DELETE_PHRASE = 'FORCE-DELETE-USER';

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const getFriendlyError = (err, fallbackText) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    return fallbackText;
  };

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [...ADMIN_USERS_QUERY_KEY, page, size],
    queryFn: async () => normalizeUserListResponse(await getAllUsers(page, size), size),
    placeholderData: (previous) => previous,
  });

  const users = data?.users ?? [];
  const pagination = {
    page: data?.page ?? page,
    size: data?.size ?? size,
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
  };
  const error = queryError ? getFriendlyError(queryError, 'Không thể tải danh sách người dùng') : '';

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setSize(newSize);
    setPage(0);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }) => updateUserStatus(userId, status),
    onSuccess: () => {
      invalidateUsers();
      showSuccess('Cập nhật trạng thái người dùng thành công');
    },
    onError: (err) => {
      const msg = getFriendlyError(err, 'Không thể cập nhật trạng thái');
      showError(msg);
    },
  });

  const handleUpdateStatus = (userId, newStatus) => {
    updateStatusMutation.mutate({ userId, status: newStatus });
  };

  const openDeleteDialog = (user) => {
    setDeleteTarget(user);
    setDeleteConfirmText('');
    setDeleteReason('');
  };

  const deleteMutation = useMutation({
    mutationFn: ({ userId, confirmText, reason }) =>
      forceDeleteUser(userId, { confirmText, reason }),
    onSuccess: () => {
      showSuccess('Đã xoá người dùng');
      setDeleteTarget(null);
      setDeleteConfirmText('');
      setDeleteReason('');
      invalidateUsers();
    },
    onError: (err) => {
      const msg = getFriendlyError(err, 'Không thể xoá người dùng');
      showError(msg);
    },
  });

  const isDeleting = deleteMutation.isPending;

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

  const handleConfirmDelete = () => {
    if (!deleteTarget || !canSubmitDelete) return;
    deleteMutation.mutate({
      userId: deleteTarget.id,
      confirmText: deleteConfirmText,
      reason: deleteReason.trim(),
    });
  };

  // Lọc users theo search term và chỉ hiển thị role USER (ẩn ADMIN và SUPER_ADMIN)
  const filteredUsers = users
    .filter(user => user.role === 'USER')
    .filter(user => 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Format ngày tạo
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Lấy màu badge theo status
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
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t('userPage.refresh')}
          </Button>
        )}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Table Card */}
      <Card className={`border shadow-sm overflow-hidden rounded-[24px] transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <CardHeader className={`flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-b ${
          isDarkMode ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <CardTitle className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('userPage.cardTitle')}
          </CardTitle>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder={t('userPage.searchPlaceholder')} 
              className={`pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 ${
                isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table className = "table-auto min-w-full text-left">
              <TableHeader className={`${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
                <TableRow className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <TableHead className="w-[180px] text-left font-bold text-slate-500">{t('userPage.table.username')}</TableHead>
                  <TableHead className="w-[240px] text-left font-bold text-slate-500">{t('userPage.table.email')}</TableHead>
                  <TableHead className="w-[180px] text-left font-bold text-slate-500">{t('userPage.table.fullName')}</TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-slate-500">{t('userPage.table.status')}</TableHead>
                  <TableHead className="w-[140px] text-left font-bold text-slate-500">{t('userPage.table.createdAt')}</TableHead>
                  <TableHead className="w-[80px] text-right font-bold text-slate-500">{t('userPage.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      <ListSpinner variant="table" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      onClick={() => navigate(`${basePath}/users/${user.id}`)}
                      className={`border-b transition-colors cursor-pointer ${
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
                        <Badge className={`rounded-lg px-2.5 py-0.5 border-none ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`w-[140px] text-left text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="w-[80px] text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={`w-48 ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
                            <DropdownMenuItem 
                              onClick={() => navigate(`${basePath}/users/${user.id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2 text-blue-500" />
                              {t('userPage.viewDetail')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(user.id, 'ACTIVE')}
                              disabled={user.status === 'ACTIVE'}
                              className="cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                              {t('userPage.setActive')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(user.id, 'INACTIVE')}
                              disabled={user.status === 'INACTIVE'}
                              className="cursor-pointer"
                            >
                              <Shield className="w-4 h-4 mr-2 text-amber-500" />
                              {t('userPage.setInactive')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(user.id, 'BANNED')}
                              disabled={user.status === 'BANNED'}
                              className="cursor-pointer"
                            >
                              <Ban className="w-4 h-4 mr-2 text-rose-500" />
                              {t('userPage.setBanned')}
                            </DropdownMenuItem>
                            {isSuperAdminContext && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(user)}
                                  disabled={user.status === 'DELETED'}
                                  className="cursor-pointer text-rose-600 focus:text-rose-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2 text-rose-500" />
                                  Xoá tài khoản
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium italic">
                      {t('userPage.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {users.length > 0 && (
            <AdminPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalElements={pagination.totalElements}
              pageSize={pagination.size}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isDarkMode={isDarkMode}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <DialogContent className={`sm:max-w-[520px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" /> Xoá tài khoản người dùng
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Hành động chỉ dành cho SUPER_ADMIN và được ghi vào audit log. Tài khoản sẽ bị đánh dấu
              <span className="font-semibold"> DELETED</span> và email/username bị ẩn danh.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-4">
              <div className={`rounded-xl border p-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
                <div><span className="font-semibold">Username:</span> {deleteTarget.username}</div>
                <div><span className="font-semibold">Email:</span> {deleteTarget.email}</div>
                <div><span className="font-semibold">ID:</span> {deleteTarget.id}</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Gõ chính xác <code className="px-1 py-0.5 rounded bg-rose-100 text-rose-700">{DELETE_PHRASE}</code> để xác nhận
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={DELETE_PHRASE}
                  disabled={isDeleting}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Lý do xoá (10–500 ký tự) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ghi rõ lý do để lưu vào audit log"
                  disabled={isDeleting}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-rose-400 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                  }`}
                />
                <div className="text-xs text-slate-400 text-right">{deleteReason.trim().length}/500</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting} className="rounded-xl">
              Huỷ
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={!canSubmitDelete || isDeleting}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {isDeleting ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default UserManagement;
