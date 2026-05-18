import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useGroupAssignments } from '@/pages/Users/Group/hooks/useGroupAssignments';
import AssignmentFormDialog from './AssignmentFormDialog';

function formatRelativeDue(iso, t) {
  if (!iso) return '';
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return '';
  const diff = (target - Date.now()) / 1000;
  if (diff < 0) {
    const absDays = Math.floor(-diff / 86400);
    if (absDays >= 1) return t('groupWorkspace.assignments.overdueDays', { count: absDays });
    return t('groupWorkspace.assignments.overdueShort');
  }
  if (diff < 3600) return t('groupWorkspace.assignments.dueInMinutes', { count: Math.max(1, Math.floor(diff / 60)) });
  if (diff < 86400) return t('groupWorkspace.assignments.dueInHours', { count: Math.floor(diff / 3600) });
  return t('groupWorkspace.assignments.dueInDays', { count: Math.floor(diff / 86400) });
}

function AssignmentRow({ item, isDarkMode, canEdit, canDelete, onEdit, onDelete, t }) {
  const isOverdue = Boolean(item?.overdue);
  const total = Number(item?.totalTargets || 0);
  const submitted = Number(item?.submittedCount || 0);
  const completionPct = total > 0 ? Math.min(100, Math.round((submitted / total) * 100)) : 0;

  return (
    <article
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        isDarkMode ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900' : 'border-gray-200 bg-white hover:bg-gray-50',
        isOverdue && (isDarkMode ? 'ring-1 ring-red-700/60' : 'ring-1 ring-red-200'),
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700',
        )}>
          <ClipboardCheck className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={cn('truncate text-base font-semibold', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
                {item?.title || t('groupWorkspace.assignments.untitledFallback')}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={cn(
                  'inline-flex items-center gap-1',
                  isDarkMode ? 'text-slate-500' : 'text-gray-500',
                )}>
                  <Users className="h-3 w-3" />
                  {t('groupWorkspace.assignments.audienceTypes.' + (item?.audienceType || 'ALL_MEMBERS') + '.short')}
                </span>
                {item?.dueAt ? (
                  <span className={cn(
                    'inline-flex items-center gap-1',
                    isOverdue
                      ? (isDarkMode ? 'text-red-300' : 'text-red-600')
                      : (isDarkMode ? 'text-slate-500' : 'text-gray-500'),
                  )}>
                    <CalendarClock className="h-3 w-3" />
                    {formatRelativeDue(item.dueAt, t)}
                  </span>
                ) : null}
              </div>
            </div>

            {(canEdit || canDelete) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'rounded-md p-1 transition-colors',
                      isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                    )}
                    aria-label={t('groupWorkspace.assignments.itemActions')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={cn(isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : '')}>
                  {canEdit ? (
                    <DropdownMenuItem onSelect={() => onEdit?.(item)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      onSelect={() => onDelete?.(item)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {item?.description ? (
            <p className={cn('mt-2 line-clamp-2 text-sm', isDarkMode ? 'text-slate-300' : 'text-gray-700')}>
              {item.description}
            </p>
          ) : null}

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={cn(isDarkMode ? 'text-slate-400' : 'text-gray-600')}>
                {t('groupWorkspace.assignments.progressLabel', { submitted, total })}
              </span>
              <span className={cn('font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-700')}>
                {completionPct}%
              </span>
            </div>
            <div className={cn('h-2 w-full rounded-full overflow-hidden', isDarkMode ? 'bg-slate-800' : 'bg-gray-200')}>
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isOverdue && submitted < total ? 'bg-red-500' : 'bg-emerald-500',
                )}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ConfirmDeleteDialog({ open, item, onCancel, onConfirm, submitting, isDarkMode, t }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel?.(); }}>
      <DialogContent className={cn('sm:max-w-[420px]', isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : '')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {t('groupWorkspace.assignments.deleteConfirmTitle')}
          </DialogTitle>
          <DialogDescription className={cn(isDarkMode ? 'text-slate-400' : '')}>
            {t('groupWorkspace.assignments.deleteConfirmBody', { title: item?.title || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hiển thị danh sách assignment thuộc về một quiz cụ thể. Dùng trong tab
 * "Bài đã giao" của QuizDetailView (leader-only).
 *
 * Lưu ý: BE chưa có endpoint filter theo resourceId, nên FE phân trang đến hết
 * rồi filter local. Group thường có dưới vài chục assignment nên acceptable;
 * khi scale lớn cần BE bổ sung query param.
 */
function QuizAssignmentsPanel({
  workspaceId,
  quizId,
  quizTitle = '',
  isDarkMode = false,
  currentUserId,
  isLeader = false,
  canManageAssignment = false,
  /** Cho phép parent (QuizDetailView) inject hành động "Giao bài" để mở dialog có lockedResource sẵn. */
  onOpenCreateDialog,
  /** Bump bởi parent sau khi tạo assignment mới → trigger refetch. */
  refreshKey = 0,
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const state = useGroupAssignments(workspaceId, { enabled: canManageAssignment });
  const [formState, setFormState] = useState({ open: false, mode: 'edit', initial: null });
  const [deleteState, setDeleteState] = useState({ open: false, item: null, submitting: false });

  // Auto-load tất cả pages còn lại để filter local đầy đủ.
  useEffect(() => {
    if (!canManageAssignment) return;
    if (state.isLoading || state.isLoadingMore) return;
    if (state.hasMore) {
      void state.loadMore();
    }
  }, [canManageAssignment, state.hasMore, state.isLoading, state.isLoadingMore, state.loadMore]);

  useEffect(() => {
    if (canManageAssignment) {
      void state.refresh();
    }
    // refresh khi mở tab (mount) hoặc khi parent bump refreshKey (sau create).
    // state.refresh ổn định theo workspaceId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageAssignment, workspaceId, refreshKey]);

  const filteredItems = useMemo(() => {
    const targetQuizId = Number(quizId);
    if (!Number.isFinite(targetQuizId)) return [];
    return state.items.filter((item) => (
      String(item?.resourceType || '').toUpperCase() === 'QUIZ'
      && Number(item?.resourceId) === targetQuizId
    ));
  }, [quizId, state.items]);

  const handleOpenEdit = useCallback((item) => {
    setFormState({ open: true, mode: 'edit', initial: item });
  }, []);

  const handleSubmitEdit = useCallback(async (values) => {
    if (formState.mode !== 'edit' || formState.initial?.assignmentId == null) return null;
    const saved = await state.update(formState.initial.assignmentId, values);
    showSuccess(t('groupWorkspace.assignments.toasts.updated'));
    return saved;
  }, [formState.initial, formState.mode, state, showSuccess, t]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteState.item?.assignmentId) return;
    setDeleteState((prev) => ({ ...prev, submitting: true }));
    try {
      await state.remove(deleteState.item.assignmentId);
      showSuccess(t('groupWorkspace.assignments.toasts.deleted'));
      setDeleteState({ open: false, item: null, submitting: false });
    } catch (err) {
      showError(getErrorMessage(t, err) || t('groupWorkspace.assignments.toasts.deleteFailed'));
      setDeleteState((prev) => ({ ...prev, submitting: false }));
    }
  }, [deleteState.item, state, showError, showSuccess, t]);

  if (!canManageAssignment) {
    return null;
  }

  const showLoading = state.isLoading && state.items.length === 0;
  const showEmpty = !state.isLoading && filteredItems.length === 0 && !state.error;
  const showError_ = state.error && state.items.length === 0;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className={cn('h-5 w-5', isDarkMode ? 'text-blue-300' : 'text-blue-600')} />
            <h2 className={cn('text-base font-semibold', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
              {t('groupWorkspace.assignments.quizPanel.title')}
            </h2>
          </div>
          <p className={cn('mt-0.5 text-xs', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
            {t('groupWorkspace.assignments.quizPanel.subtitle', { count: filteredItems.length })}
          </p>
        </div>

        {typeof onOpenCreateDialog === 'function' ? (
          <Button onClick={onOpenCreateDialog}>
            <Plus className="h-4 w-4" />
            {t('groupWorkspace.assignments.createButton')}
          </Button>
        ) : null}
      </header>

      {showLoading ? (
        <div className={cn('flex items-center justify-center gap-2 py-12', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('groupWorkspace.assignments.loading')}</span>
        </div>
      ) : null}

      {showEmpty ? (
        <div className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-12 px-6 text-center',
          isDarkMode ? 'border-slate-700 text-slate-400' : 'border-gray-300 text-gray-500',
        )}>
          <ClipboardCheck className="h-8 w-8" aria-hidden="true" />
          <p className={cn('font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-700')}>
            {t('groupWorkspace.assignments.quizPanel.emptyTitle')}
          </p>
          <p className="text-sm max-w-[360px]">
            {t('groupWorkspace.assignments.quizPanel.emptyBody')}
          </p>
          {typeof onOpenCreateDialog === 'function' ? (
            <Button variant="outline" onClick={onOpenCreateDialog} className="mt-2">
              <Plus className="h-4 w-4" />
              {t('groupWorkspace.assignments.createButton')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {showError_ ? (
        <div className={cn(
          'flex flex-col items-center gap-3 rounded-2xl border border-dashed py-10 px-6 text-center',
          isDarkMode ? 'border-red-900 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700',
        )}>
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm">{t('groupWorkspace.assignments.error')}</p>
          <Button variant="outline" onClick={() => state.refresh()}>
            {t('groupWorkspace.assignments.retry')}
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isAuthor = Number(item?.assignedById) === Number(currentUserId);
          const canEdit = canManageAssignment && (isAuthor || isLeader);
          return (
            <AssignmentRow
              key={item.assignmentId}
              item={item}
              isDarkMode={isDarkMode}
              canEdit={canEdit}
              canDelete={canEdit}
              onEdit={handleOpenEdit}
              onDelete={(target) => setDeleteState({ open: true, item: target, submitting: false })}
              t={t}
            />
          );
        })}
      </div>

      {state.isLoadingMore ? (
        <div className={cn('flex items-center justify-center gap-2 py-4 text-xs', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t('groupWorkspace.assignments.loading')}</span>
        </div>
      ) : null}

      <AssignmentFormDialog
        open={formState.open}
        onOpenChange={(next) => setFormState((prev) => ({ ...prev, open: next, ...(next ? {} : { initial: null }) }))}
        mode={formState.mode}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        initialValue={formState.initial}
        isDarkMode={isDarkMode}
        onSubmit={handleSubmitEdit}
        lockedResource={{ resourceType: 'QUIZ', resourceId: quizId }}
        defaultTitle={quizTitle}
      />

      <ConfirmDeleteDialog
        open={deleteState.open}
        item={deleteState.item}
        onCancel={() => setDeleteState({ open: false, item: null, submitting: false })}
        onConfirm={handleConfirmDelete}
        submitting={deleteState.submitting}
        isDarkMode={isDarkMode}
        t={t}
      />
    </div>
  );
}

export default QuizAssignmentsPanel;
