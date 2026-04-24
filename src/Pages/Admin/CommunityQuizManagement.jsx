import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Eye,
  Globe2,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldX,
  Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import ListSpinner from '@/Components/ui/ListSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { unwrapApiData } from '@/Utils/apiResponse';
import {
  getManagementCommunityQuizzes,
  updateManagementCommunityQuizVisibility,
} from '@/api/ManagementSystemAPI';
import CommunityQuizDetailDialog from '@/Pages/Users/Quiz/components/CommunityQuizDetailDialog';
import AdminPagination from './components/AdminPagination';
import {
  getSuperAdminStatusBadgeClass,
  SuperAdminEmptyState,
  SuperAdminMetricCard,
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminToolbar,
} from '@/Pages/SuperAdmin/Components/SuperAdminSurface';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'DRAFT'];

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRating(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : '0.00';
}

export default function CommunityQuizManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
  });
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getManagementCommunityQuizzes({
        page: pagination.page,
        size: pagination.size,
        search: searchTerm.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      const payload = unwrapApiData(response) || {};
      const content = Array.isArray(payload.content) ? payload.content : [];

      setQuizzes(content);
      setPagination((current) => ({
        ...current,
        page: payload.page ?? current.page,
        size: payload.size ?? current.size,
        totalPages: payload.totalPages ?? 0,
        totalElements: payload.totalElements ?? 0,
      }));
    } catch (error) {
      setQuizzes([]);
      setPagination((current) => ({
        ...current,
        totalPages: 0,
        totalElements: 0,
      }));
      showError(getErrorMessage(t, error));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, searchTerm, showError, statusFilter, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchQuizzes();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [fetchQuizzes]);

  const metrics = useMemo(() => {
    const totalClones = quizzes.reduce((sum, quiz) => sum + Number(quiz?.communityCloneCount || 0), 0);
    const totalComments = quizzes.reduce((sum, quiz) => sum + Number(quiz?.communityCommentCount || 0), 0);
    const totalRatings = quizzes.reduce((sum, quiz) => sum + Number(quiz?.communityRatingCount || 0), 0);
    const weightedRatingScore = quizzes.reduce(
      (sum, quiz) => sum + (Number(quiz?.communityAverageRating || 0) * Number(quiz?.communityRatingCount || 0)),
      0,
    );

    return {
      totalClones,
      totalComments,
      totalRatings,
      weightedAverageRating: totalRatings > 0 ? weightedRatingScore / totalRatings : 0,
    };
  }, [quizzes]);

  const handlePageChange = (nextPage) => {
    setPagination((current) => ({ ...current, page: nextPage }));
  };

  const handlePageSizeChange = (nextSize) => {
    setPagination((current) => ({ ...current, page: 0, size: nextSize }));
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPagination((current) => ({ ...current, page: 0 }));
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPagination((current) => ({ ...current, page: 0 }));
  };

  const handleRemoveFromCommunity = async () => {
    if (!actionTarget) return;

    setActionLoading(true);
    try {
      await updateManagementCommunityQuizVisibility(actionTarget.quizId, { shared: false });
      showSuccess(
        t('communityQuizManagement.toast.unshareSuccess', 'Đã gỡ quiz khỏi community.'),
      );
      setActionTarget(null);
      if (previewQuiz?.quizId === actionTarget.quizId) {
        setPreviewQuiz(null);
      }
      await fetchQuizzes();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SuperAdminPage className={fontClass}>
      <SuperAdminPageHeader
        eyebrow={t('communityQuizManagement.header.eyebrow', 'Community')}
        title={t('communityQuizManagement.header.title', 'Quản lý quiz cộng đồng')}
        description={t(
          'communityQuizManagement.header.description',
          'Theo dõi các quiz đã được chia sẻ lên community, xem tín hiệu tương tác và gỡ khỏi community ngay trong trang quản trị.',
        )}
        actions={(
          <Button
            type="button"
            onClick={() => fetchQuizzes()}
            disabled={loading}
            className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('communityQuizManagement.header.refresh', 'Làm mới')}
          </Button>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SuperAdminMetricCard
          label={t('communityQuizManagement.metrics.totalQuizzes', 'Quiz community')}
          value={pagination.totalElements}
          helper={t(
            'communityQuizManagement.metrics.totalQuizzesHelper',
            'Tổng số quiz đang được share',
          )}
          icon={Globe2}
          tone="blue"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('communityQuizManagement.metrics.totalClones', 'Lượt clone')}
          value={metrics.totalClones}
          helper={t(
            'communityQuizManagement.metrics.currentPageHelper',
            'Tổng hợp trên trang hiện tại',
          )}
          icon={Copy}
          tone="emerald"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('communityQuizManagement.metrics.averageRating', 'Điểm trung bình')}
          value={formatRating(metrics.weightedAverageRating)}
          helper={t('communityQuizManagement.metrics.totalRatingsHelper', {
            count: metrics.totalRatings,
            defaultValue: '{{count}} lượt đánh giá',
          })}
          icon={Star}
          tone="amber"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('communityQuizManagement.metrics.totalComments', 'Bình luận')}
          value={metrics.totalComments}
          helper={t(
            'communityQuizManagement.metrics.currentPageHelper',
            'Tổng hợp trên trang hiện tại',
          )}
          icon={MessageSquareText}
          tone="rose"
          isDarkMode={isDarkMode}
        />
      </div>

      <SuperAdminToolbar>
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t(
              'communityQuizManagement.filters.searchPlaceholder',
              'Tìm theo tên quiz, người tạo hoặc email',
            )}
            className="h-11 rounded-2xl border-slate-200 bg-white pl-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:ring-[#0455BF] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className={`h-11 rounded-2xl border px-4 text-sm outline-none transition-colors ${
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-200'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status === 'ALL'
                ? t('communityQuizManagement.filters.allStatuses', 'Tất cả trạng thái')
                : status}
            </option>
          ))}
        </select>
      </SuperAdminToolbar>

      <SuperAdminPanel
        title={t('communityQuizManagement.table.title', 'Danh sách quiz community')}
        description={t(
          'communityQuizManagement.table.description',
          'Các quiz đang hoặc đã từng được share lên community. Quiz không ở trạng thái ACTIVE sẽ không mở được preview public.',
        )}
        contentClassName="px-0 py-0"
      >
        {loading ? (
          <div className="px-6 py-20">
            <ListSpinner variant="table" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="px-6 py-6">
            <SuperAdminEmptyState
              title={t('communityQuizManagement.empty.title', 'Chưa có quiz community nào')}
              description={t(
                'communityQuizManagement.empty.description',
                'Khi người dùng chia sẻ quiz lên community, danh sách sẽ xuất hiện tại đây để admin kiểm tra và quản lý.',
              )}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={isDarkMode ? 'border-slate-800' : ''}>
                    <TableHead>{t('communityQuizManagement.table.quiz', 'Quiz')}</TableHead>
                    <TableHead>{t('communityQuizManagement.table.creator', 'Người tạo')}</TableHead>
                    <TableHead>{t('communityQuizManagement.table.status', 'Trạng thái')}</TableHead>
                    <TableHead>{t('communityQuizManagement.table.signals', 'Tín hiệu')}</TableHead>
                    <TableHead>{t('communityQuizManagement.table.createdAt', 'Ngày tạo')}</TableHead>
                    <TableHead className="text-right">{t('communityQuizManagement.table.actions', 'Thao tác')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.map((quiz) => (
                    <TableRow key={quiz.quizId} className={isDarkMode ? 'border-slate-800' : ''}>
                      <TableCell>
                        <div className="min-w-[240px]">
                          <p className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {quiz.title || t('communityQuizManagement.table.untitled', 'Quiz chưa đặt tên')}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {quiz.quizIntent ? <span>{quiz.quizIntent}</span> : null}
                            {quiz.overallDifficulty ? <span>{quiz.overallDifficulty}</span> : null}
                            <span>
                              {t('communityQuizManagement.table.questionCount', {
                                count: Number(quiz.totalQuestion || 0),
                                defaultValue: '{{count}} câu',
                              })}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[200px]">
                          <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {quiz.creatorName || '-'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {quiz.creatorEmail || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Badge
                            variant="outline"
                            className={getSuperAdminStatusBadgeClass(quiz.status, isDarkMode)}
                          >
                            {quiz.status || 'UNKNOWN'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              quiz.communityShared
                                ? (isDarkMode
                                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                                  : 'border-blue-200 bg-blue-50 text-blue-700')
                                : getSuperAdminStatusBadgeClass('INACTIVE', isDarkMode)
                            }
                          >
                            {quiz.communityShared
                              ? t('communityQuizManagement.table.shared', 'Đang share')
                              : t('communityQuizManagement.table.unshared', 'Đã gỡ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="grid min-w-[180px] grid-cols-3 gap-2 text-center">
                          <Card className={isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}>
                            <CardContent className="px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Clone</p>
                              <p className="mt-1 font-semibold">{quiz.communityCloneCount || 0}</p>
                            </CardContent>
                          </Card>
                          <Card className={isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}>
                            <CardContent className="px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Rate</p>
                              <p className="mt-1 font-semibold">{formatRating(quiz.communityAverageRating)}</p>
                            </CardContent>
                          </Card>
                          <Card className={isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}>
                            <CardContent className="px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Talk</p>
                              <p className="mt-1 font-semibold">{quiz.communityCommentCount || 0}</p>
                            </CardContent>
                          </Card>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDateTime(quiz.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewQuiz(quiz)}
                            disabled={!quiz.previewAvailable}
                            title={
                              quiz.previewAvailable
                                ? t('communityQuizManagement.actions.preview', 'Xem preview')
                                : t(
                                  'communityQuizManagement.actions.previewUnavailable',
                                  'Chỉ preview được quiz community đang ACTIVE',
                                )
                            }
                            className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            {t('communityQuizManagement.actions.preview', 'Preview')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setActionTarget(quiz)}
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            <ShieldX className="mr-1 h-4 w-4" />
                            {t('communityQuizManagement.actions.remove', 'Gỡ khỏi community')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="px-2 pb-2">
              <AdminPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalElements={pagination.totalElements}
                pageSize={pagination.size}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                isDarkMode={isDarkMode}
              />
            </div>
          </>
        )}
      </SuperAdminPanel>

      <CommunityQuizDetailDialog
        open={Boolean(previewQuiz)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewQuiz(null);
          }
        }}
        quizId={previewQuiz?.quizId}
        isDarkMode={isDarkMode}
        fontClass={fontClass}
        title={previewQuiz?.title}
        description={t(
          'communityQuizManagement.preview.description',
          'Bản xem trước read-only cho quản trị viên.',
        )}
        readOnly
      />

      <Dialog open={Boolean(actionTarget)} onOpenChange={(open) => { if (!open && !actionLoading) setActionTarget(null); }}>
        <DialogContent className={isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : ''}>
          <DialogHeader>
            <DialogTitle className="text-rose-600">
              {t('communityQuizManagement.removeDialog.title', 'Gỡ quiz khỏi community')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t(
                'communityQuizManagement.removeDialog.description',
                'Quiz sẽ không còn xuất hiện trong community explorer của người dùng. Nội dung quiz gốc vẫn được giữ lại trong workspace của người tạo.',
              )}
            </DialogDescription>
          </DialogHeader>

          {actionTarget ? (
            <div className={`rounded-2xl border p-4 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
              <p className="font-semibold">{actionTarget.title}</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {t('communityQuizManagement.removeDialog.creatorLabel', 'Người tạo')}: {actionTarget.creatorName || '-'}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Clone</p>
                  <p className="mt-1 font-semibold">{actionTarget.communityCloneCount || 0}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Rate</p>
                  <p className="mt-1 font-semibold">{formatRating(actionTarget.communityAverageRating)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Talk</p>
                  <p className="mt-1 font-semibold">{actionTarget.communityCommentCount || 0}</p>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionTarget(null)}
              disabled={actionLoading}
              className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
            >
              {t('communityQuizManagement.removeDialog.cancel', 'Huỷ')}
            </Button>
            <Button
              type="button"
              onClick={handleRemoveFromCommunity}
              disabled={actionLoading}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {actionLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldX className="mr-2 h-4 w-4" />
              )}
              {t('communityQuizManagement.removeDialog.confirm', 'Gỡ khỏi community')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
