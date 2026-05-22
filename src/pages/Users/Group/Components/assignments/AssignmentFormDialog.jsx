import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/getErrorMessage';
import AssignmentResourcePicker from './AssignmentResourcePicker';
import AssignmentAudiencePicker from './AssignmentAudiencePicker';

const TITLE_MIN = 2;
const TITLE_MAX = 280;
const DESCRIPTION_MAX = 5000;

// Convert ISO chuỗi BE → giá trị `datetime-local` (YYYY-MM-DDTHH:mm).
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function AssignmentFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  workspaceId,
  initialValue = null,
  currentUserId,
  isDarkMode = false,
  onSubmit,
  lockedResource = null,
  defaultTitle = '',
}) {
  const { t } = useTranslation();
  const isEditing = mode === 'edit';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtLocal, setDueAtLocal] = useState('');
  const [resourceType, setResourceType] = useState('QUIZ');
  const [resourceId, setResourceId] = useState(null);
  const [audienceType, setAudienceType] = useState('ALL_MEMBERS');
  const [targetUserIds, setTargetUserIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(String(initialValue?.title || defaultTitle || ''));
    setDescription(String(initialValue?.description || ''));
    setDueAtLocal(isoToLocalInput(initialValue?.dueAt));
    setResourceType(
      lockedResource?.resourceType
        || initialValue?.resourceType
        || 'QUIZ',
    );
    setResourceId(
      lockedResource?.resourceId
        ?? initialValue?.resourceId
        ?? null,
    );
    setAudienceType(initialValue?.audienceType || 'ALL_MEMBERS');
    setTargetUserIds(Array.isArray(initialValue?.targetUserIds) ? [...initialValue.targetUserIds] : []);
    setSubmitting(false);
    setSubmitError('');
  }, [open, initialValue, lockedResource, defaultTitle]);

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  const titleError = useMemo(() => {
    if (!trimmedTitle) return t('groupWorkspace.assignments.form.errors.titleRequired');
    if (trimmedTitle.length < TITLE_MIN) return t('groupWorkspace.assignments.form.errors.titleTooShort', { min: TITLE_MIN });
    if (trimmedTitle.length > TITLE_MAX) return t('groupWorkspace.assignments.form.errors.titleTooLong', { max: TITLE_MAX });
    return '';
  }, [t, trimmedTitle]);

  const descriptionError = useMemo(() => {
    if (trimmedDescription.length > DESCRIPTION_MAX) {
      return t('groupWorkspace.assignments.form.errors.descriptionTooLong', { max: DESCRIPTION_MAX });
    }
    return '';
  }, [t, trimmedDescription]);

  const dueAtError = useMemo(() => {
    if (!dueAtLocal) return '';
    const iso = localInputToIso(dueAtLocal);
    if (!iso) return t('groupWorkspace.assignments.form.errors.dueAtInvalid');
    if (new Date(iso).getTime() <= Date.now()) {
      return t('groupWorkspace.assignments.form.errors.dueAtPast');
    }
    return '';
  }, [dueAtLocal, t]);

  // Resource validation: bắt buộc khi create. Khi edit, BE không cho đổi resource
  // nên picker disabled — vẫn cần resourceId để pass through nhưng đã có sẵn.
  const resourceError = useMemo(() => {
    if (isEditing) return '';
    if (!resourceType) return t('groupWorkspace.assignments.form.errors.resourceTypeRequired');
    if (!resourceId) return t('groupWorkspace.assignments.form.errors.resourceIdRequired');
    return '';
  }, [isEditing, resourceId, resourceType, t]);

  const audienceError = useMemo(() => {
    if (isEditing) return '';
    if (audienceType === 'SPECIFIC_MEMBERS' && targetUserIds.length === 0) {
      return t('groupWorkspace.assignments.form.errors.audienceEmpty');
    }
    return '';
  }, [audienceType, isEditing, t, targetUserIds]);

  const canSubmit = !titleError && !descriptionError && !dueAtError && !resourceError && !audienceError && !submitting;

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');

    const dueAtIso = localInputToIso(dueAtLocal);

    try {
      if (isEditing) {
        // BE chỉ cho phép 3 field khi update.
        await onSubmit?.({
          title: trimmedTitle,
          description: trimmedDescription || undefined,
          dueAt: dueAtIso || undefined,
        });
      } else {
        await onSubmit?.({
          title: trimmedTitle,
          description: trimmedDescription || undefined,
          dueAt: dueAtIso || undefined,
          resourceType,
          resourceId,
          audienceType,
          ...(audienceType === 'SPECIFIC_MEMBERS' ? { targetUserIds } : {}),
        });
      }
      onOpenChange?.(false);
    } catch (err) {
      setSubmitError(getErrorMessage(t, err) || t('groupWorkspace.assignments.form.errors.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange?.(next); }}>
      <DialogContent
        className={cn(
          'sm:max-w-[640px] max-h-[90vh] overflow-y-auto',
          isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900',
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('groupWorkspace.assignments.form.editTitle')
              : t('groupWorkspace.assignments.form.createTitle')}
          </DialogTitle>
          <DialogDescription className={cn(isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
            {isEditing
              ? t('groupWorkspace.assignments.form.editDescription')
              : t('groupWorkspace.assignments.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resource picker — disabled khi edit để không vô tình đổi resource.
              Khi mở từ trang resource (lockedResource) thì ẩn luôn vì context đã rõ. */}
          {!isEditing && !lockedResource ? (
            <div className="space-y-1.5">
              <label className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}>
                {t('groupWorkspace.assignments.form.resourceSection')}
                <span className="text-red-500">{' *'}</span>
              </label>
              <AssignmentResourcePicker
                workspaceId={workspaceId}
                resourceType={resourceType}
                resourceId={resourceId}
                onChange={({ resourceType: nextType, resourceId: nextId }) => {
                  setResourceType(nextType);
                  setResourceId(nextId ?? null);
                }}
                isDarkMode={isDarkMode}
                disabled={submitting}
              />
              {resourceError ? <p className="text-xs text-red-500">{resourceError}</p> : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="assignment-title"
              className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}
            >
              {t('groupWorkspace.assignments.form.titleLabel')}
              <span className="text-red-500">{' *'}</span>
            </label>
            <Input
              id="assignment-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX + 10}
              placeholder={t('groupWorkspace.assignments.form.titlePlaceholder')}
              className={cn(
                isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : '',
                titleError && trimmedTitle ? 'border-red-500 focus-visible:ring-red-500' : '',
              )}
              autoFocus
              disabled={submitting}
            />
            <div className="flex items-center justify-between text-xs">
              <span className={cn(titleError && trimmedTitle ? 'text-red-500' : 'text-transparent')}>
                {titleError && trimmedTitle ? titleError : '.'}
              </span>
              <span className={cn(isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
                {trimmedTitle.length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="assignment-description"
              className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}
            >
              {t('groupWorkspace.assignments.form.descriptionLabel')}
            </label>
            <textarea
              id="assignment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX + 50}
              placeholder={t('groupWorkspace.assignments.form.descriptionPlaceholder')}
              rows={4}
              disabled={submitting}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[100px]',
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400',
                descriptionError ? 'border-red-500 focus-visible:ring-red-500' : '',
              )}
            />
            <div className="flex items-center justify-between text-xs">
              <span className={cn(descriptionError ? 'text-red-500' : 'text-transparent')}>
                {descriptionError || '.'}
              </span>
              <span className={cn(isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
                {trimmedDescription.length}/{DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="assignment-due"
              className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}
            >
              {t('groupWorkspace.assignments.form.dueAtLabel')}
            </label>
            <Input
              id="assignment-due"
              type="datetime-local"
              value={dueAtLocal}
              onChange={(e) => setDueAtLocal(e.target.value)}
              disabled={submitting}
              className={cn(
                isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : '',
                dueAtError ? 'border-red-500 focus-visible:ring-red-500' : '',
              )}
            />
            <p className={cn('text-xs', dueAtError ? 'text-red-500' : (isDarkMode ? 'text-slate-500' : 'text-gray-500'))}>
              {dueAtError || t('groupWorkspace.assignments.form.dueAtHint')}
            </p>
          </div>

          {!isEditing ? (
            <div className="space-y-1.5">
              <label className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}>
                {t('groupWorkspace.assignments.form.audienceSection')}
                <span className="text-red-500">{' *'}</span>
              </label>
              <AssignmentAudiencePicker
                workspaceId={workspaceId}
                audienceType={audienceType}
                targetUserIds={targetUserIds}
                onChange={({ audienceType: nextType, targetUserIds: nextIds }) => {
                  setAudienceType(nextType);
                  setTargetUserIds(nextIds);
                }}
                excludeUserIds={currentUserId != null ? [Number(currentUserId)] : []}
                isDarkMode={isDarkMode}
                disabled={submitting}
              />
              {audienceError ? <p className="text-xs text-red-500">{audienceError}</p> : null}
            </div>
          ) : null}

          {submitError ? (
            <p className="text-sm text-red-500" role="alert">{submitError}</p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={submitting}
              className={cn(isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : '')}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing
                ? t('groupWorkspace.assignments.form.saveButton')
                : t('groupWorkspace.assignments.form.assignButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AssignmentFormDialog;
