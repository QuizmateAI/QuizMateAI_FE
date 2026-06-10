import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock4,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
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
import {
  useGroupAssignments,
  useMyAssignments,
} from '@/pages/Users/Group/hooks/useGroupAssignments';
import { useAssignmentRealtimeRefresh } from '@/pages/Users/Group/hooks/useAssignmentRealtimeRefresh';
import AssignmentFormDialog from './AssignmentFormDialog';

const RESOURCE_ICON_PREFIX = 'groupWorkspace.assignments.resourceTypes';

function formatDateTime(iso, t) {
  if (!iso) return t('groupWorkspace.assignments.noDueDate');
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString();
}

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

function ResourceBadge({ resourceType, isDarkMode, t }) {
  if (!resourceType) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700',
      )}
    >
      {t(`${RESOURCE_ICON_PREFIX}.${resourceType}`)}
    </span>
  );
}

function LeaderAssignmentRow({
  item,
  isDarkMode,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  t,
}) {
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
                <ResourceBadge resourceType={item?.resourceType} isDarkMode={isDarkMode} t={t} />
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

function MemberAssignmentRow({ item, isDarkMode, submittingIds, onSubmit, t }) {
  const target = item?.myTarget;
  const status = String(target?.status || 'PENDING').toUpperCase();
  const isDone = status === 'SUBMITTED';
  const isOverdue = Boolean(item?.overdue);
  const isPending = !isDone;
  const isSubmittingNow = submittingIds.has(Number(item?.assignmentId));

  return (
    <article
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white',
        isOverdue && isPending && (isDarkMode ? 'ring-1 ring-red-700/60' : 'ring-1 ring-red-200'),
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          isDone
            ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
            : (isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'),
        )}>
          {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Clock4 className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className={cn('truncate text-base font-semibold', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
            {item?.title || t('groupWorkspace.assignments.untitledFallback')}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <ResourceBadge resourceType={item?.resourceType} isDarkMode={isDarkMode} t={t} />
            {item?.assignedByName ? (
              <span className={cn(isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
                {t('groupWorkspace.assignments.assignedBy', { name: item.assignedByName })}
              </span>
            ) : null}
            {item?.dueAt ? (
              <span className={cn(
                'inline-flex items-center gap-1',
                isOverdue && isPending
                  ? (isDarkMode ? 'text-red-300' : 'text-red-600')
                  : (isDarkMode ? 'text-slate-500' : 'text-gray-500'),
              )}>
                <CalendarClock className="h-3 w-3" />
                {isPending ? formatRelativeDue(item.dueAt, t) : formatDateTime(item.dueAt, t)}
              </span>
            ) : null}
          </div>

          {item?.description ? (
            <p className={cn('mt-2 line-clamp-2 text-sm', isDarkMode ? 'text-slate-300' : 'text-gray-700')}>
              {item.description}
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            {isDone ? (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold',
                isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
              )}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('groupWorkspace.assignments.submitted')}
                {target?.submittedAt ? (
                  <span className={cn('ml-1 font-normal', isDarkMode ? 'text-emerald-200/70' : 'text-emerald-700/70')}>
                    · {formatDateTime(target.submittedAt, t)}
                  </span>
                ) : null}
              </span>
            ) : (
              <Button
                size="sm"
                onClick={() => onSubmit?.(item)}
                disabled={isSubmittingNow}
              >
                {isSubmittingNow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {t('groupWorkspace.assignments.markSubmitted')}
              </Button>
            )}
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

const VIEW_MODES = { manage: 'manage', mine: 'mine' };

function AssignmentsTab({
  workspaceId,
  isDarkMode = false,
  currentUserId,
  isLeader = false,
  canManageAssignment = false,
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  // Leader thấy 2 tab (Manage + Mine). Member-only thấy duy nhất Mine.
  const defaultMode = canManageAssignment ? VIEW_MODES.manage : VIEW_MODES.mine;
  const [viewMode, setViewMode] = useState(defaultMode);

  useEffect(() => {
    // Khi permission thay đổi (BE update real-time), reset về tab phù hợp.
    setViewMode(canManageAssignment ? VIEW_MODES.manage : VIEW_MODES.mine);
  }, [canManageAssignment]);

  const leaderState = useGroupAssignments(workspaceId, { enabled: canManageAssignment });
  const memberState = useMyAssignments(workspaceId, { enabled: true });

  useAssignmentRealtimeRefresh({
    workspaceId,
    enabled: Boolean(workspaceId),
    isActive: true,
    onRefresh: async () => {
      const tasks = [memberState.refresh()];
      if (canManageAssignment) tasks.unshift(leaderState.refresh());
      await Promise.allSettled(tasks);
    },
    onPatch: (event) => {
      if (canManageAssignment) leaderState.patchFromRealtimeEvent?.(event);
      memberState.patchFromRealtimeEvent?.(event);
    },
  });

  const [formState, setFormState] = useState({ open: false, mode: 'create', initial: null });
  const [deleteState, setDeleteState] = useState({ open: false, item: null, submitting: false });
  const [submittingIds, setSubmittingIds] = useState(() => new Set());

  // Refresh active list khi mount + khi đổi tab.
  useEffect(() => {
    if (viewMode === VIEW_MODES.manage && canManageAssignment) {
      void leaderState.refresh();
    }
  }, [canManageAssignment, leaderState.refresh, viewMode]);

  useEffect(() => {
    if (viewMode === VIEW_MODES.mine) {
      void memberState.refresh();
    }
  }, [memberState.refresh, viewMode]);

  const handleOpenCreate = useCallback(() => {
    setFormState({ open: true, mode: 'create', initial: null });
  }, []);

  const handleOpenEdit = useCallback((item) => {
    setFormState({ open: true, mode: 'edit', initial: item });
  }, []);

  const handleSubmitForm = useCallback(async (values) => {
    if (formState.mode === 'edit' && formState.initial?.assignmentId != null) {
      const saved = await leaderState.update(formState.initial.assignmentId, values);
      showSuccess(t('groupWorkspace.assignments.toasts.updated'));
      return saved;
    }
    const created = await leaderState.create(values);
    showSuccess(t('groupWorkspace.assignments.toasts.created'));
    return created;
  }, [formState.initial, formState.mode, leaderState, showSuccess, t]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteState.item?.assignmentId) return;
    setDeleteState((prev) => ({ ...prev, submitting: true }));
    try {
      await leaderState.remove(deleteState.item.assignmentId);
      showSuccess(t('groupWorkspace.assignments.toasts.deleted'));
      setDeleteState({ open: false, item: null, submitting: false });
    } catch (err) {
      showError(getErrorMessage(t, err) || t('groupWorkspace.assignments.toasts.deleteFailed'));
      setDeleteState((prev) => ({ ...prev, submitting: false }));
    }
  }, [deleteState.item, leaderState, showError, showSuccess, t]);

  const handleSubmitItem = useCallback(async (item) => {
    const targetId = Number(item?.assignmentId);
    if (!Number.isFinite(targetId)) return;
    setSubmittingIds((prev) => {
      if (prev.has(targetId)) return prev;
      const next = new Set(prev);
      next.add(targetId);
      return next;
    });
    try {
      await memberState.submit(targetId);
      showSuccess(t('groupWorkspace.assignments.toasts.submitted'));
    } catch (err) {
      showError(getErrorMessage(t, err) || t('groupWorkspace.assignments.toasts.submitFailed'));
    } finally {
      setSubmittingIds((prev) => {
        if (!prev.has(targetId)) return prev;
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [memberState, showError, showSuccess, t]);

  const activeState = viewMode === VIEW_MODES.manage ? leaderState : memberState;
  const showLoading = activeState.isLoading && activeState.items.length === 0;
  const showEmpty = !activeState.isLoading && activeState.items.length === 0 && !activeState.error;
  const showError_ = activeState.error && activeState.items.length === 0;

  const memberItems = useMemo(() => memberState.items, [memberState.items]);
  const leaderItems = useMemo(() => leaderState.items, [leaderState.items]);
  const mineCount = memberItems.length;
  const mineSubmitted = memberItems.filter((it) => it?.myTarget?.status === 'SUBMITTED').length;

  return (
    <div className={cn('h-full overflow-y-auto px-4 py-5 md:px-8', isDarkMode ? 'bg-slate-950' : 'bg-gray-50')}>
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className={cn('h-5 w-5', isDarkMode ? 'text-blue-300' : 'text-blue-600')} />
              <h2 className={cn('text-xl font-semibold', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
                {t('groupWorkspace.assignments.title')}
              </h2>
            </div>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
              {viewMode === VIEW_MODES.manage
                ? t('groupWorkspace.assignments.leaderSubtitle', { count: leaderState.totalElements || 0 })
                : t('groupWorkspace.assignments.memberSubtitle', { submitted: mineSubmitted, count: mineCount })}
            </p>
          </div>

          {canManageAssignment ? (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              {t('groupWorkspace.assignments.createButton')}
            </Button>
          ) : null}
        </header>

        {canManageAssignment ? (
          <div className={cn(
            'mb-4 inline-flex rounded-lg border p-1 text-sm',
            isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white',
          )} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === VIEW_MODES.manage}
              onClick={() => setViewMode(VIEW_MODES.manage)}
              className={cn(
                'rounded-md px-3 py-1.5 transition-colors',
                viewMode === VIEW_MODES.manage
                  ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white')
                  : (isDarkMode ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-gray-900'),
              )}
            >
              {t('groupWorkspace.assignments.tabs.manage')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === VIEW_MODES.mine}
              onClick={() => setViewMode(VIEW_MODES.mine)}
              className={cn(
                'rounded-md px-3 py-1.5 transition-colors',
                viewMode === VIEW_MODES.mine
                  ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white')
                  : (isDarkMode ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-gray-900'),
              )}
            >
              {t('groupWorkspace.assignments.tabs.mine')}
            </button>
          </div>
        ) : null}

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
              {viewMode === VIEW_MODES.manage
                ? t('groupWorkspace.assignments.empty.leaderTitle')
                : t('groupWorkspace.assignments.empty.memberTitle')}
            </p>
            <p className="text-sm max-w-[360px]">
              {viewMode === VIEW_MODES.manage
                ? t('groupWorkspace.assignments.empty.leaderBody')
                : t('groupWorkspace.assignments.empty.memberBody')}
            </p>
            {viewMode === VIEW_MODES.manage && canManageAssignment ? (
              <Button variant="outline" onClick={handleOpenCreate} className="mt-2">
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
            <Button variant="outline" onClick={() => activeState.refresh()}>
              {t('groupWorkspace.assignments.retry')}
            </Button>
          </div>
        ) : null}

        <div className="space-y-3">
          {viewMode === VIEW_MODES.manage
            ? leaderItems.map((item) => {
              const isAuthor = Number(item?.assignedById) === Number(currentUserId);
              const canEdit = canManageAssignment && (isAuthor || isLeader);
              return (
                <LeaderAssignmentRow
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
            })
            : memberItems.map((item) => (
              <MemberAssignmentRow
                key={item.assignmentId}
                item={item}
                isDarkMode={isDarkMode}
                submittingIds={submittingIds}
                onSubmit={handleSubmitItem}
                t={t}
              />
            ))}
        </div>

        {viewMode === VIEW_MODES.manage && leaderState.hasMore ? (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => leaderState.loadMore()}
              disabled={leaderState.isLoadingMore}
            >
              {leaderState.isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('groupWorkspace.assignments.loadMore')}
            </Button>
          </div>
        ) : null}
      </div>

      <AssignmentFormDialog
        open={formState.open}
        onOpenChange={(next) => setFormState((prev) => ({ ...prev, open: next, ...(next ? {} : { initial: null }) }))}
        mode={formState.mode}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        initialValue={formState.initial}
        isDarkMode={isDarkMode}
        onSubmit={handleSubmitForm}
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

export default AssignmentsTab;
