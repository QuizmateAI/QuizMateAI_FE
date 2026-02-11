import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, User, MoreHorizontal, Shield, Ban, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAllUsers, updateUserStatus } from '@/api/AdminAPI';

function UserManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  // Lấy danh sách người dùng từ API
  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getAllUsers();
      if (response.statusCode === 200) {
        setUsers(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách người dùng');
      console.error('Lỗi khi lấy danh sách users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Cập nhật trạng thái người dùng
  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      const response = await updateUserStatus(userId, newStatus);
      if (response.statusCode === 200) {
        // Cập nhật state local
        setUsers(users.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        ));
      }
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái');
      console.error('Lỗi khi cập nhật status:', err);
    }
  };

  // Lọc users theo search term
  const filteredUsers = users.filter(user => 
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
          onClick={fetchUsers}
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
            {t('userPage.cardTitle')} ({filteredUsers.length})
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
            <Table>
              <TableHeader className={`${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
                <TableRow className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <TableHead className="w-[60px] font-bold text-slate-500">{t('userPage.table.id')}</TableHead>
                  <TableHead className="w-[60px] font-bold text-slate-500">{t('userPage.table.avatar')}</TableHead>
                  <TableHead className="w-[180px] font-bold text-slate-500">{t('userPage.table.username')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('userPage.table.email')}</TableHead>
                  <TableHead className="w-[150px] font-bold text-slate-500">{t('userPage.table.fullName')}</TableHead>
                  <TableHead className="w-[100px] font-bold text-slate-500">{t('userPage.table.role')}</TableHead>
                  <TableHead className="w-[100px] font-bold text-slate-500">{t('userPage.table.status')}</TableHead>
                  <TableHead className="w-[160px] font-bold text-slate-500">{t('userPage.table.createdAt')}</TableHead>
                  <TableHead className="text-right w-[80px] font-bold text-slate-500">{t('userPage.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                      <p className="mt-2 text-slate-400">{t('userPage.loading')}</p>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className={`border-b transition-colors ${
                        isDarkMode 
                          ? 'border-slate-800 hover:bg-slate-800/50' 
                          : 'border-slate-100 hover:bg-slate-50/50'
                      }`}
                    >
                      <TableCell className="font-bold text-blue-600 dark:text-blue-400">{user.id}</TableCell>
                      <TableCell>
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
                      <TableCell className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {user.username}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                        {user.email}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                        {user.fullName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg px-2.5 py-0.5 border-none">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-lg px-2.5 py-0.5 border-none ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={`w-48 ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default UserManagement;
