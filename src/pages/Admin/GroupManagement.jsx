import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
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
import ListSpinner from "@/components/ui/ListSpinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAllGroups } from '@/api/ManagementSystemAPI';
import AdminPagination from './components/AdminPagination';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from '@/pages/SuperAdmin/Components/SuperAdminSurface';

const GROUP_NAME_PLACEHOLDERS = ['group name null', 'name null', 'null', 'undefined'];
const GROUP_DESCRIPTION_PLACEHOLDERS = ['group description null', 'description null', 'null', 'undefined'];

function normalizeText(value) {
  if (value == null) return '';

  const trimmed = String(value).trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed || normalized === 'null' || normalized === 'undefined') {
    return '';
  }

  return trimmed;
}

const ADMIN_GROUPS_QUERY_KEY = ['admin', 'groups'];

function normalizeGroupListResponse(response, requestedSize) {
  const responseData = response?.data || {};
  if (Array.isArray(responseData)) {
    return {
      groups: responseData,
      page: 0,
      size: responseData.length || requestedSize,
      totalPages: 1,
      totalElements: responseData.length,
    };
  }
  if (responseData.content && Array.isArray(responseData.content)) {
    return {
      groups: responseData.content,
      page: responseData.page ?? responseData.number ?? 0,
      size: responseData.size || requestedSize,
      totalPages: responseData.totalPages || 0,
      totalElements: responseData.totalElements || 0,
    };
  }
  return { groups: [], page: 0, size: requestedSize, totalPages: 0, totalElements: 0 };
}

function GroupManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const basePath = location.pathname.includes('super-admin') ? '/super-admin' : '/admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

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
    queryKey: [...ADMIN_GROUPS_QUERY_KEY, page, size],
    queryFn: async () => normalizeGroupListResponse(await getAllGroups(page, size), size),
    placeholderData: (previous) => previous,
  });

  const groups = data?.groups ?? [];
  const pagination = {
    page: data?.page ?? page,
    size: data?.size ?? size,
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
  };
  const error = queryError ? getFriendlyError(queryError, 'Không thể tải danh sách nhóm') : '';

  const getGroupName = (group) => {
    const rawName = normalizeText(group?.groupName || group?.name);
    if (!rawName || GROUP_NAME_PLACEHOLDERS.includes(rawName.toLowerCase())) {
      return t('groupPage.untitledGroup');
    }
    return rawName;
  };

  const getGroupDescription = (group) => {
    const rawDescription = normalizeText(group?.description);
    if (!rawDescription || GROUP_DESCRIPTION_PLACEHOLDERS.includes(rawDescription.toLowerCase())) {
      return t('groupPage.noDescription');
    }
    return rawDescription;
  };

  const getLeaderName = (group) => {
    return normalizeText(group?.createdByFullName || group?.createdByUsername || group?.leaderName)
      || t('groupPage.unknownLeader');
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setSize(newSize);
    setPage(0);
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
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        title={t('groupPage.title')}
        actions={(
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t('groupPage.refresh')}
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
            <Table className="table-fixed min-w-[960px]">
              <TableHeader className={`${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
                <TableRow className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <TableHead className="w-[300px] font-bold text-slate-500 text-left">{t('groupPage.table.name')}</TableHead>
                  <TableHead className="w-[44%] font-bold text-slate-500 text-left">{t('groupPage.table.description')}</TableHead>
                  <TableHead className="w-[210px] font-bold text-slate-500 text-left">{t('groupPage.table.leader')}</TableHead>
                  <TableHead className="w-[132px] font-bold text-slate-500 text-left">{t('groupPage.table.createdAt')}</TableHead>
                  <TableHead className="text-right w-[84px] font-bold text-slate-500">{t('groupPage.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      <ListSpinner variant="table" />
                    </TableCell>
                  </TableRow>
                ) : filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <TableRow 
                      key={group.workspaceId ?? group.id} 
                      onClick={() => navigate(`${basePath}/groups/${group.workspaceId ?? group.id}`)}
                      className={`border-b transition-colors duration-200 cursor-pointer ${
                        isDarkMode 
                          ? 'border-slate-800 hover:bg-slate-800/45' 
                          : 'border-slate-100 hover:bg-sky-50/60'
                      }`}
                    >
                      <TableCell className={`text-left ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'
                          }`}>
                            <Users className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              title={getGroupName(group)}
                              className="truncate whitespace-nowrap text-[15px] font-semibold leading-[1.375rem]"
                            >
                              {getGroupName(group)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={`text-left ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <p
                          title={getGroupDescription(group)}
                          className="truncate whitespace-nowrap leading-[1.375rem]"
                        >
                          {getGroupDescription(group)}
                        </p>
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge
                          variant="outline"
                          title={getLeaderName(group)}
                          className={`inline-flex max-w-[180px] rounded-lg border px-2.5 py-0.5 transition-colors duration-200 ${
                            isDarkMode
                              ? 'border-emerald-800/70 bg-emerald-950/35 text-emerald-300 hover:border-emerald-700 hover:bg-emerald-900/50'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <span className="block max-w-full truncate whitespace-nowrap">
                            {getLeaderName(group)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className={`whitespace-nowrap text-left text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDate(group.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-9 w-9 rounded-lg transition-colors ${
                                isDarkMode ? 'hover:bg-slate-700/70' : 'hover:bg-sky-50'
                              }`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={`w-48 ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
                            <DropdownMenuItem 
                              onClick={() => navigate(`${basePath}/groups/${group.workspaceId ?? group.id}`)}
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
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">
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

    </SuperAdminPage>
  );
}

export default GroupManagement;
