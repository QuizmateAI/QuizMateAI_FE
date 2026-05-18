import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  Loader2,
  UserPlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useGroupJoinRequests } from '@/pages/Users/Group/hooks/useGroupJoinRequests';
import JoinRequestDecisionDialog from './JoinRequestDecisionDialog';

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString();
}

function getRequesterInitial(name = '') {
  return String(name || '?').trim().charAt(0).toUpperCase() || '?';
}

function JoinRequestRow({ item, isDarkMode, onApprove, onReject, busyId, t }) {
  const isBusy = busyId === item?.joinRequestId;
  const name = item?.requesterName || t('groupJoinRequest.panel.unknownRequester');

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-start',
        isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white',
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold overflow-hidden',
          isDarkMode ? 'bg-slate-700 text-slate-100' : 'bg-blue-100 text-blue-700',
        )}>
          {item?.requesterAvatar ? (
            <img src={item.requesterAvatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            getRequesterInitial(name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold truncate', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
            {name}
          </p>
          {item?.requesterEmail ? (
            <p className={cn('truncate text-xs', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
              {item.requesterEmail}
            </p>
          ) : null}
          <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
            {t('groupJoinRequest.panel.requestedAt', { time: formatDateTime(item?.createdAt) })}
          </p>
          {item?.message ? (
            <p className={cn(
              'mt-2 rounded-md border px-3 py-2 text-sm whitespace-pre-wrap',
              isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700',
            )}>
              {item.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
        <Button
          size="sm"
          onClick={() => onApprove?.(item)}
          disabled={isBusy}
        >
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {t('groupJoinRequest.panel.approveAction')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject?.(item)}
          disabled={isBusy}
          className={cn(
            'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700',
            isDarkMode ? 'border-red-900/50 text-red-300 hover:bg-red-950/40 hover:text-red-200' : '',
          )}
        >
          <X className="h-3.5 w-3.5" />
          {t('groupJoinRequest.panel.rejectAction')}
        </Button>
      </div>
    </article>
  );
}

function GroupJoinRequestsPanel({
  workspaceId,
  isDarkMode = false,
  canManageMembers = false,
  defaultExpanded = false,
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const enabled = Boolean(canManageMembers && workspaceId && workspaceId !== 'new');
  const {
    items,
    pendingCount,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    approve,
    reject,
  } = useGroupJoinRequests(workspaceId, { enabled });

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [busyId, setBusyId] = useState(null);
  const [decisionState, setDecisionState] = useState({ open: false, decision: 'approve', request: null });

  // Mount → fetch lần đầu nếu leader. User toggle expanded thoải mái, list giữ
  // cached cho lần xem tiếp theo. Tránh fetch nhiều lần khi chỉ collapse/expand.
  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  const handleOpenDecision = useCallback((nextDecision, request) => {
    setDecisionState({ open: true, decision: nextDecision, request });
  }, []);

  const handleConfirmDecision = useCallback(async ({ decisionNote }) => {
    const request = decisionState.request;
    if (!request?.joinRequestId) return;
    const targetId = Number(request.joinRequestId);
    setBusyId(targetId);
    try {
      if (decisionState.decision === 'reject') {
        await reject(targetId, { decisionNote });
        showSuccess(t('groupJoinRequest.toasts.rejected'));
      } else {
        await approve(targetId, { decisionNote });
        showSuccess(t('groupJoinRequest.toasts.approved'));
      }
    } catch (err) {
      showError(getErrorMessage(t, err) || t('groupJoinRequest.toasts.decisionFailed'));
      throw err;
    } finally {
      setBusyId(null);
    }
  }, [approve, decisionState.decision, decisionState.request, reject, showError, showSuccess, t]);

  const totalLabel = useMemo(
    () => (pendingCount > 0
      ? t('groupJoinRequest.panel.titleWithCount', { count: pendingCount })
      : t('groupJoinRequest.panel.title')),
    [pendingCount, t],
  );

  if (!enabled) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border',
        isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-gray-200 bg-white',
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3',
          isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50',
        )}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <UserPlus className={cn('h-4 w-4 shrink-0', isDarkMode ? 'text-blue-300' : 'text-blue-600')} />
          <span className={cn('text-sm font-semibold truncate', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
            {totalLabel}
          </span>
          {pendingCount > 0 ? (
            <span className={cn(
              'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
              'bg-red-500 text-white',
            )}>
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          ) : null}
        </div>
        {expanded ? (
          <ChevronUp className={cn('h-4 w-4', isDarkMode ? 'text-slate-400' : 'text-gray-500')} />
        ) : (
          <ChevronDown className={cn('h-4 w-4', isDarkMode ? 'text-slate-400' : 'text-gray-500')} />
        )}
      </button>

      {expanded ? (
        <div className={cn(
          'border-t p-4 space-y-3',
          isDarkMode ? 'border-slate-800' : 'border-gray-100',
        )}>
          {isLoading && items.length === 0 ? (
            <div className={cn('flex items-center justify-center gap-2 py-6 text-sm', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('groupJoinRequest.panel.loading')}</span>
            </div>
          ) : null}

          {!isLoading && items.length === 0 && !error ? (
            <div className={cn(
              'flex flex-col items-center gap-2 py-8 px-4 text-center rounded-md border border-dashed',
              isDarkMode ? 'border-slate-700 text-slate-400' : 'border-gray-300 text-gray-500',
            )}>
              <Inbox className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-medium">{t('groupJoinRequest.panel.empty')}</p>
            </div>
          ) : null}

          {error && items.length === 0 ? (
            <div className={cn(
              'flex flex-col items-center gap-2 py-6 px-4 text-center rounded-md border border-dashed',
              isDarkMode ? 'border-red-900 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700',
            )}>
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm">{t('groupJoinRequest.panel.error')}</p>
              <Button variant="outline" size="sm" onClick={() => refresh()}>
                {t('groupJoinRequest.panel.retry')}
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            {items.map((item) => (
              <JoinRequestRow
                key={item.joinRequestId}
                item={item}
                isDarkMode={isDarkMode}
                busyId={busyId}
                onApprove={(target) => handleOpenDecision('approve', target)}
                onReject={(target) => handleOpenDecision('reject', target)}
                t={t}
              />
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => loadMore()} disabled={isLoadingMore}>
                {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('groupJoinRequest.panel.loadMore')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <JoinRequestDecisionDialog
        open={decisionState.open}
        onOpenChange={(next) => setDecisionState((prev) => ({ ...prev, open: next }))}
        decision={decisionState.decision}
        request={decisionState.request}
        isDarkMode={isDarkMode}
        onConfirm={handleConfirmDecision}
      />
    </section>
  );
}

export default GroupJoinRequestsPanel;
