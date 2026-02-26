import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Users, Eye, MoreHorizontal } from 'lucide-react';
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
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAllGroups, getGroupDetail } from '@/api/ManagementSystemAPI';
import AdminPagination from './components/AdminPagination';

function GroupManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
  });

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  // Lấy danh sách nhóm từ API (có hỗ trợ phân trang)
  const fetchGroups = async (page = 0, size = 10) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getAllGroups(page, size);
      const responseData = response?.data || {};
      
      // Xử lý cấu trúc response có thể là paginated hoặc array thuần
      if (Array.isArray(responseData)) {
        setGroups(responseData);
        setPagination({ page: 0, size: responseData.length, totalPages: 1, totalElements: responseData.length });
      } else if (responseData.content && Array.isArray(responseData.content)) {
        setGroups(responseData.content);
        setPagination({
          page: responseData.page ?? responseData.number ?? 0,
          size: responseData.size || size,
          totalPages: responseData.totalPages || 0,
          totalElements: responseData.totalElements || 0,
        });
      } else {
        setGroups([]);
        setPagination({ page: 0, size: size, totalPages: 0, totalElements: 0 });
      }
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách nhóm');
      console.error('Lỗi khi lấy danh sách groups:', err);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Thay đổi trang
  const handlePageChange = (newPage) => {
    fetchGroups(newPage, pagination.size);
  };

  // Thay đổi kích thước trang
  const handlePageSizeChange = (newSize) => {
    fetchGroups(0, newSize);
  };

  // Xem chi tiết nhóm
  const handleViewDetail = async (groupId) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    setSelectedGroup(null);
    try {
      const response = await getGroupDetail(groupId);
      const data = response?.data ?? response;
      setSelectedGroup(data || null);
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết group:', err);
      setSelectedGroup(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Lọc groups theo search term
  const filteredGroups = groups.filter((group) => {
    const name = group.groupName || group.name || '';
    const desc = group.description || '';
    const term = searchTerm.toLowerCase();
    return name.toLowerCase().includes(term) || desc.toLowerCase().includes(term);
  });

  // Format ngày tạo
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('groupPage.title')}
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-medium`}>
            {t('groupPage.desc')}
          </p>
        </div>
        <Button 
          onClick={() => fetchGroups(pagination.page, pagination.size)}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('groupPage.refresh')}
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
            {t('groupPage.cardTitle')} ({filteredGroups.length})
          </CardTitle>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder={t('groupPage.searchPlaceholder')} 
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
                  <TableHead className="w-[60px] font-bold text-slate-500">{t('groupPage.table.id')}</TableHead>
                  <TableHead className="w-[200px] font-bold text-slate-500">{t('groupPage.table.name')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('groupPage.table.description')}</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-500">{t('groupPage.table.members')}</TableHead>
                  <TableHead className="w-[150px] font-bold text-slate-500">{t('groupPage.table.leader')}</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-500">{t('groupPage.table.createdAt')}</TableHead>
                  <TableHead className="text-right w-[80px] font-bold text-slate-500">{t('groupPage.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                      <p className="mt-2 text-slate-400">{t('groupPage.loading')}</p>
                    </TableCell>
                  </TableRow>
                ) : filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <TableRow 
                      key={group.groupId ?? group.id} 
                      className={`border-b transition-colors ${
                        isDarkMode 
                          ? 'border-slate-800 hover:bg-slate-800/50' 
                          : 'border-slate-100 hover:bg-slate-50/50'
                      }`}
                    >
                      <TableCell className="font-bold text-blue-600 dark:text-blue-400">{group.groupId ?? group.id}</TableCell>
                      <TableCell className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'
                          }`}>
                            <Users className="w-4 h-4 text-indigo-500" />
                          </div>
                          {group.groupName || group.name}
                        </div>
                      </TableCell>
                      <TableCell className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} truncate max-w-[200px]`}>
                        {group.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg px-2.5 py-0.5 border-none">
                          {group.memberCount ?? 0} {t('groupPage.members')}
                        </Badge>
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                        {group.createdByFullName || group.createdByUsername || group.leaderName || '-'}
                      </TableCell>
                      <TableCell className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDate(group.createdAt)}
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
                              onClick={() => handleViewDetail(group.groupId ?? group.id)}
                              className="cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2 text-blue-500" />
                              {t('groupPage.viewDetail')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-medium italic">
                      {t('groupPage.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {groups.length > 0 && (
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

      {/* Group Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className={`max-w-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>
              {t('groupPage.detailTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('groupPage.detailDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="py-10 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            </div>
          ) : selectedGroup ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500">{t('groupPage.table.name')}</p>
                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedGroup.groupName || selectedGroup.name}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500">{t('groupPage.table.description')}</p>
                <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                  {selectedGroup.description || '-'}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500 mb-2">Chủ nhóm / Người tạo</p>
                <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                  {selectedGroup.createdByFullName || selectedGroup.createdByUsername || '-'}
                </p>
              </div>
              {selectedGroup.topicName && (
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className="text-sm text-slate-500">Chủ đề</p>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{selectedGroup.topicName}</p>
                </div>
              )}
              {selectedGroup.members && selectedGroup.members.length > 0 && (
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className="text-sm text-slate-500 mb-3">Thành viên ({selectedGroup.members.length})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedGroup.members.map((m) => (
                      <div
                        key={m.groupMemberId ?? m.userId}
                        className={`flex items-center justify-between py-2 border-b last:border-0 ${
                          isDarkMode ? 'border-slate-700' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {m.avatar ? (
                            <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                            }`}>
                              <Users className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                              {m.fullName || m.username}
                            </p>
                            <p className="text-xs text-slate-500">{m.role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400">
              {t('groupPage.noDetail')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GroupManagement;
