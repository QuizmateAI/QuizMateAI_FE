import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Bell,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Trash2,
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
import { useGroupAnnouncements } from '@/pages/Users/Group/hooks/useGroupAnnouncements';
import AnnouncementFormDialog from './AnnouncementFormDialog';

function formatRelativeTime(iso, t) {
  if (!iso) return '';
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return '';
  const diff = (Date.now() - target) / 1000;
  if (diff < 60) return t('groupWorkspace.announcements.relativeTime.justNow');
  if (diff < 3600) return t('groupWorkspace.announcements.relativeTime.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('groupWorkspace.announcements.relativeTime.hoursAgo', { count: Math.floor(diff / 3600) });
  if (diff < 7 * 86400) return t('groupWorkspace.announcements.relativeTime.daysAgo', { count: Math.floor(diff / 86400) });
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getAuthorInitial(name = '') {
  const trimmed = String(name || '').trim();
  return trimmed.charAt(0).toUpperCase() || '?';
}

function AnnouncementItemCard({
  item,
  isExpanded,
  onToggleExpand,
  onMarkRead,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  isDarkMode,
  t,
}) {
  const isUnread = !item?.readByMe;
  const pinned = Boolean(item?.pinned);
  const author = item?.authorName || t('groupWorkspace.announcements.unknownAuthor');
  const isLong = String(item?.content || '').length > 320;

  const handleToggle = () => {
    if (isUnread) {
      // Đọc khi user expand — track read state ngay khi user thực sự nhìn vào nội dung.
      void onMarkRead?.(item?.announcementId);
    }
    onToggleExpand?.(item?.announcementId);
  };

  return (
    <article
      className={cn(
        'rounded-2xl border transition-colors',
        isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white',
        pinned && (isDarkMode ? 'ring-1 ring-amber-500/40' : 'ring-1 ring-amber-300'),
        isUnread && (isDarkMode ? 'bg-slate-900' : 'bg-blue-50/30'),
      )}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          isDarkMode ? 'bg-slate-700 text-slate-100' : 'bg-blue-100 text-blue-700',
        )}
        >
          {item?.authorAvatar ? (
            <img src={item.authorAvatar} alt={author} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            getAuthorInitial(author)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {pinned ? (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-800',
                  )}
                  >
                    <Pin className="h-3 w-3" />
                    {t('groupWorkspace.announcements.pinned')}
                  </span>
                ) : null}
                {isUnread ? (
                  <span className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    isDarkMode ? 'bg-blue-400' : 'bg-blue-500',
                  )}
                  />
                ) : null}
                <h3 className={cn(
                  'truncate text-base',
                  isUnread ? 'font-semibold' : 'font-medium',
                  isDarkMode ? 'text-slate-100' : 'text-gray-900',
                )}
                >
                  {item?.title || t('groupWorkspace.announcements.untitledFallback')}
                </h3>
              </div>
              <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
                <span className="font-medium">{author}</span>
                <span className="mx-1.5">·</span>
                <span>{formatRelativeTime(item?.createdAt, t)}</span>
                {item?.updatedAt && item?.updatedAt !== item?.createdAt ? (
                  <span className={cn('ml-1.5 italic', isDarkMode ? 'text-slate-600' : 'text-gray-400')}>
                    ({t('groupWorkspace.announcements.edited')})
                  </span>
                ) : null}
              </p>
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
                    aria-label={t('groupWorkspace.announcements.itemActions')}
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

          <div className={cn(
            'mt-2 whitespace-pre-wrap text-sm',
            isDarkMode ? 'text-slate-300' : 'text-gray-700',
            !isExpanded && isLong ? 'line-clamp-3' : '',
          )}
          >
            {item?.content || ''}
          </div>

          {isLong || isUnread ? (
            <button
              type="button"
              onClick={handleToggle}
              className={cn(
                'mt-2 text-xs font-medium transition-colors',
                isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700',
              )}
            >
              {isExpanded
                ? t('groupWorkspace.announcements.collapse')
                : t('groupWorkspace.announcements.readMore')}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ConfirmDeleteDialog({ open, item, onCancel, onConfirm, isDarkMode, submitting, t }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel?.(); }}>
      <DialogContent className={cn('sm:max-w-[420px]', isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : '')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {t('groupWorkspace.announcements.deleteConfirmTitle')}
          </DialogTitle>
          <DialogDescription className={cn(isDarkMode ? 'text-slate-400' : '')}>
            {t('groupWorkspace.announcements.deleteConfirmBody', { title: item?.title || '' })}
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

function AnnouncementsTab({
  workspaceId,
  isDarkMode = false,
  currentUserId,
  isLeader = false,
  canManageAnnouncement = false,
  wsAnnouncementEvent = null,
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const announcements = useGroupAnnouncements(workspaceId, { enabled: true });
  const {
    items,
    unreadCount,
    totalElements,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    markAsRead,
    create,
    update,
    remove,
    handleWebSocketEvent,
  } = announcements;

  const [expandedId, setExpandedId] = useState(null);
  const [formState, setFormState] = useState({ open: false, mode: 'create', initial: null });
  const [deleteState, setDeleteState] = useState({ open: false, item: null, submitting: false });

  // Tải page 0 khi tab mount — caller chỉ render tab khi user chuyển vào nên
  // không lo fetch khi user không quan tâm.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Forward WS event từ parent xuống hook để re-sync state khi có event broadcast.
  useEffect(() => {
    if (!wsAnnouncementEvent) return;
    handleWebSocketEvent(wsAnnouncementEvent);
  }, [handleWebSocketEvent, wsAnnouncementEvent]);

  const handleToggleExpand = useCallback((announcementId) => {
    setExpandedId((prev) => (prev === announcementId ? null : announcementId));
  }, []);

  const handleMarkRead = useCallback(async (announcementId) => {
    try {
      await markAsRead(announcementId);
    } catch (err) {
      console.error('markAsRead failed:', err);
    }
  }, [markAsRead]);

  const handleOpenCreate = useCallback(() => {
    setFormState({ open: true, mode: 'create', initial: null });
  }, []);

  const handleOpenEdit = useCallback((item) => {
    setFormState({ open: true, mode: 'edit', initial: item });
  }, []);

  const handleSubmitForm = useCallback(async (values) => {
    if (formState.mode === 'edit' && formState.initial?.announcementId != null) {
      const saved = await update(formState.initial.announcementId, values);
      showSuccess(t('groupWorkspace.announcements.toasts.updated'));
      return saved;
    }
    const created = await create(values);
    showSuccess(t('groupWorkspace.announcements.toasts.created'));
    return created;
  }, [create, formState.initial, formState.mode, showSuccess, t, update]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteState.item?.announcementId) return;
    setDeleteState((prev) => ({ ...prev, submitting: true }));
    try {
      await remove(deleteState.item.announcementId);
      showSuccess(t('groupWorkspace.announcements.toasts.deleted'));
      setDeleteState({ open: false, item: null, submitting: false });
    } catch (err) {
      showError(getErrorMessage(t, err) || t('groupWorkspace.announcements.toasts.deleteFailed'));
      setDeleteState((prev) => ({ ...prev, submitting: false }));
    }
  }, [deleteState.item, remove, showError, showSuccess, t]);

  const totalLabel = useMemo(
    () => t('groupWorkspace.announcements.totalLabel', { count: Number(totalElements) || 0 }),
    [t, totalElements],
  );

  return (
    <div className={cn('h-full overflow-y-auto px-4 py-5 md:px-8', isDarkMode ? 'bg-slate-950' : 'bg-gray-50')}>
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className={cn('h-5 w-5', isDarkMode ? 'text-blue-300' : 'text-blue-600')} />
              <h2 className={cn('text-xl font-semibold', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
                {t('groupWorkspace.announcements.title')}
              </h2>
            </div>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
              {totalLabel}
              {unreadCount > 0 ? (
                <span className={cn('ml-2', isDarkMode ? 'text-blue-300' : 'text-blue-600')}>
                  · {t('groupWorkspace.announcements.unreadLabel', { count: unreadCount })}
                </span>
              ) : null}
            </p>
          </div>

          {canManageAnnouncement ? (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              {t('groupWorkspace.announcements.createButton')}
            </Button>
          ) : null}
        </header>

        {isLoading && items.length === 0 ? (
          <div className={cn('flex items-center justify-center gap-2 py-12', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('groupWorkspace.announcements.loading')}</span>
          </div>
        ) : null}

        {!isLoading && items.length === 0 && !error ? (
          <div className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-12 px-6 text-center',
            isDarkMode ? 'border-slate-700 text-slate-400' : 'border-gray-300 text-gray-500',
          )}
          >
            <Bell className="h-8 w-8" aria-hidden="true" />
            <p className={cn('font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-700')}>
              {t('groupWorkspace.announcements.empty.title')}
            </p>
            <p className="text-sm max-w-[360px]">
              {canManageAnnouncement
                ? t('groupWorkspace.announcements.empty.bodyLeader')
                : t('groupWorkspace.announcements.empty.bodyMember')}
            </p>
            {canManageAnnouncement ? (
              <Button variant="outline" onClick={handleOpenCreate} className="mt-2">
                <Plus className="h-4 w-4" />
                {t('groupWorkspace.announcements.createButton')}
              </Button>
            ) : null}
          </div>
        ) : null}

        {error && items.length === 0 ? (
          <div className={cn(
            'flex flex-col items-center gap-3 rounded-2xl border border-dashed py-10 px-6 text-center',
            isDarkMode ? 'border-red-900 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700',
          )}
          >
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">{t('groupWorkspace.announcements.error')}</p>
            <Button variant="outline" onClick={() => refresh()}>
              {t('groupWorkspace.announcements.retry')}
            </Button>
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const isAuthor = Number(item?.authorId) === Number(currentUserId);
            const canEdit = canManageAnnouncement && (isAuthor || isLeader);
            const canDelete = canEdit;
            return (
              <AnnouncementItemCard
                key={item.announcementId}
                item={item}
                isExpanded={expandedId === item.announcementId}
                onToggleExpand={handleToggleExpand}
                onMarkRead={handleMarkRead}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={handleOpenEdit}
                onDelete={(target) => setDeleteState({ open: true, item: target, submitting: false })}
                isDarkMode={isDarkMode}
                t={t}
              />
            );
          })}
        </div>

        {hasMore ? (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => loadMore()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('groupWorkspace.announcements.loadMore')}
            </Button>
          </div>
        ) : null}
      </div>

      <AnnouncementFormDialog
        open={formState.open}
        onOpenChange={(next) => setFormState((prev) => ({ ...prev, open: next, ...(next ? {} : { initial: null }) }))}
        mode={formState.mode}
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

export default AnnouncementsTab;
