import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, User, MoreHorizontal, Shield, Ban, CheckCircle2, Eye } from 'lucide-react';
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import ListSpinner from "@/Components/ui/ListSpinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/Components/ui/dropdown-menu";
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAllUsers, updateUserStatus } from '@/api/ManagementSystemAPI';
import AdminPagination from './components/AdminPagination';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';

function UserManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError, showSuccess } = useToast();
  const basePath = location.pathname.includes('super-admin') ? '/super-admin' : '/admin';
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

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const getFriendlyError = (err, fallbackText) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    return fallbackText;
  };

  // Lấy danh sách người dùng từ API (có hỗ trợ phân trang)
  const fetchUsers = async (page = 0, size = 10) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getAllUsers(page, size);
      const responseData = response?.data || {};
      
      // Xử lý cấu trúc response có thể là paginated hoặc array thuần
      if (Array.isArray(responseData)) {
        setUsers(responseData);
        setPagination({ page: 0, size: responseData.length, totalPages: 1, totalElements: responseData.length });
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
        setPagination({ page: 0, size: size, totalPages: 0, totalElements: 0 });
      }
    } catch (err) {
      const msg = getFriendlyError(err, 'Không thể tải danh sách người dùng');
      setError(msg);
      showError(msg);
      console.error('Lỗi khi lấy danh sách users:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Thay đổi trang
  const handlePageChange = (newPage) => {
    fetchUsers(newPage, pagination.size);
  };

  // Thay đổi kích thước trang
  const handlePageSizeChange = (newSize) => {
    fetchUsers(0, newSize);
  };

  // Cập nhật trạng thái người dùng
  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await updateUserStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
    } catch (err) {
      const msg = getFriendlyError(err, 'Không thể cập nhật trạng thái');
      setError(msg);
      showError(msg);
      console.error('Lỗi khi cập nhật status:', err);
      return;
    }

    showSuccess('Cập nhật trạng thái người dùng thành công');
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
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('userPage.title')}
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-medium`}>
            {t('userPage.desc')}
          </p>
        </div>
        <Button 
          onClick={() => fetchUsers(pagination.page, pagination.size)}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('userPage.refresh')}
        </Button>
      </div>

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
                  <TableHead className="w-[60px] text-left font-bold text-slate-500">{t('userPage.table.id')}</TableHead>
                  <TableHead className="w-[70px] text-left font-bold text-slate-500">{t('userPage.table.avatar')}</TableHead>
                  <TableHead className="w-[100px] text-left font-bold text-slate-500">{t('userPage.table.username')}</TableHead>
                  <TableHead className="w-[180px] text-left font-bold text-slate-500">{t('userPage.table.email')}</TableHead>
                  <TableHead className="w-[160px] text-left font-bold text-slate-500">{t('userPage.table.fullName')}</TableHead>
                  <TableHead className="w-[90px] text-center font-bold text-slate-500">{t('userPage.table.role')}</TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-slate-500">{t('userPage.table.status')}</TableHead>
                  <TableHead className="w-[140px] text-left font-bold text-slate-500">{t('userPage.table.createdAt')}</TableHead>
                  <TableHead className="w-[80px] text-right font-bold text-slate-500">{t('userPage.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
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
                      <TableCell className="w-[60px] text-left font-bold text-blue-600 dark:text-blue-400">{user.id}</TableCell>
                      <TableCell className="w-[70px] text-left">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username} 
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                          }`}>
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={`w-[100px] text-left font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {user.username}
                      </TableCell>
                      <TableCell className={`w-[180px] text-left ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {user.email}
                      </TableCell>
                      <TableCell className={`w-[160px] text-left ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {user.fullName || '-'}
                      </TableCell>
                      <TableCell className="w-[90px] text-center">
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg px-2.5 py-0.5 border-none">
                          {user.role}
                        </Badge>
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
                            <DropdownMenuSeparator />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20 text-slate-400 font-medium italic">
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
    </div>
  );
}

export default UserManagement;
