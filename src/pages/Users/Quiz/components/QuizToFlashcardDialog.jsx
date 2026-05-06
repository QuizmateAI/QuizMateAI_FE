import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/context/ToastContext';
import { createManualFlashcardBulk } from '@/api/FlashcardAPI';
import { getWorkspacesByUser } from '@/api/WorkspaceAPI';
import { unwrapApiData } from '@/utils/apiResponse';
import { buildFlashcardItemsFromAttempt } from '../utils/buildFlashcardItemsFromAttempt';

const MAX_NAME_LENGTH = 120;

function normalizeWorkspaceList(rawList) {
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((entry) => {
      const workspaceId = Number(entry?.workspaceId ?? entry?.id);
      if (!Number.isInteger(workspaceId) || workspaceId <= 0) return null;
      const name = String(entry?.name ?? entry?.title ?? entry?.workspaceName ?? '').trim()
        || `Workspace #${workspaceId}`;
      return { workspaceId, name };
    })
    .filter(Boolean);
}

function deriveDefaultName(quizTitle, t) {
  const cleanTitle = String(quizTitle || '').trim();
  const fallback = t('quizResultPage.toFlashcard.defaultNameFallback', 'Quiz flashcards');
  const base = cleanTitle || fallback;
  const suffix = t('quizResultPage.toFlashcard.defaultNameSuffix', ' — Flashcards');
  const candidate = `${base}${suffix}`;
  return candidate.length > MAX_NAME_LENGTH
    ? candidate.slice(0, MAX_NAME_LENGTH)
    : candidate;
}

export default function QuizToFlashcardDialog({
  open,
  onOpenChange,
  quizTitle,
  reviewQuestions,
  defaultWorkspaceId,
  onCreated,
}) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const { items, skippedCount } = useMemo(
    () => buildFlashcardItemsFromAttempt(reviewQuestions),
    [reviewQuestions],
  );
  const totalQuestions = Array.isArray(reviewQuestions) ? reviewQuestions.length : 0;

  // Reset form mỗi lần dialog mở lại
  useEffect(() => {
    if (!open) return;
    setName(deriveDefaultName(quizTitle, t));
    setWorkspaceId(Number.isInteger(Number(defaultWorkspaceId)) && Number(defaultWorkspaceId) > 0
      ? Number(defaultWorkspaceId)
      : null);
  }, [open, quizTitle, defaultWorkspaceId, t]);

  // Lấy danh sách workspace của user khi mở dialog (chỉ khi cần — workspace chưa cố định)
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      setWorkspacesLoading(true);
      try {
        const response = await getWorkspacesByUser(0, 50);
        const payload = unwrapApiData(response);
        const list = payload?.content || payload?.data || (Array.isArray(payload) ? payload : []);
        const normalized = normalizeWorkspaceList(list);
        if (cancelled) return;

        setWorkspaces(normalized);
        // Nếu chưa chọn workspace mặc định thì chọn cái đầu tiên
        setWorkspaceId((prev) => {
          if (Number.isInteger(prev) && prev > 0) return prev;
          return normalized[0]?.workspaceId ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load workspaces for flashcard dialog:', error);
          setWorkspaces([]);
        }
      } finally {
        if (!cancelled) setWorkspacesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const trimmedName = name.trim();
  const canSubmit = !creating
    && items.length > 0
    && trimmedName.length > 0
    && Number.isInteger(workspaceId)
    && workspaceId > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const response = await createManualFlashcardBulk({
        workspaceId,
        flashcardSetName: trimmedName,
        items,
        activate: true,
      });
      const payload = unwrapApiData(response);
      const flashcardSetId = Number(payload?.flashcardSetId ?? payload?.id) || null;

      showSuccess(t(
        'quizResultPage.toFlashcard.createSuccess',
        'Created flashcard set "{{name}}" with {{count}} cards.',
        { name: trimmedName, count: items.length },
      ));

      // Invalidate list để các view khác refetch
      queryClient.invalidateQueries({ queryKey: ['workspace-flashcards', 'WORKSPACE', workspaceId] });

      onOpenChange?.(false);
      onCreated?.({ flashcardSetId, workspaceId });
    } catch (error) {
      console.error('Failed to create flashcard set from attempt:', error);
      showError(
        error?.response?.data?.message
        || error?.message
        || t('quizResultPage.toFlashcard.createFail', 'Could not create flashcard set. Please try again.'),
      );
    } finally {
      setCreating(false);
    }
  }, [
    canSubmit,
    items,
    onCreated,
    onOpenChange,
    queryClient,
    showError,
    showSuccess,
    t,
    trimmedName,
    workspaceId,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t('quizResultPage.toFlashcard.title', 'Convert quiz into flashcards')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'quizResultPage.toFlashcard.description',
              'Generate a flashcard set from this attempt. Each question becomes a card with the correct answer on the back.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
            <p>
              {t(
                'quizResultPage.toFlashcard.summary',
                '{{ready}} of {{total}} questions ready to convert.',
                { ready: items.length, total: totalQuestions },
              )}
            </p>
            {skippedCount > 0 ? (
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                {t(
                  'quizResultPage.toFlashcard.skippedHint',
                  '{{count}} questions were skipped (missing question text or correct answer).',
                  { count: skippedCount },
                )}
              </p>
            ) : null}
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('quizResultPage.toFlashcard.nameLabel', 'Flashcard set name')}
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, MAX_NAME_LENGTH))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              placeholder={t('quizResultPage.toFlashcard.namePlaceholder', 'Enter flashcard set name')}
              maxLength={MAX_NAME_LENGTH}
            />
          </label>

          <div className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('quizResultPage.toFlashcard.workspaceLabel', 'Save to workspace')}
            </span>
            {workspacesLoading ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('quizResultPage.toFlashcard.workspaceLoading', 'Loading your workspaces...')}
              </div>
            ) : workspaces.length === 0 ? (
              <p className="mt-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                {t('quizResultPage.toFlashcard.workspaceEmpty', 'You do not have any workspaces. Create one before generating flashcards.')}
              </p>
            ) : (
              <select
                value={workspaceId ?? ''}
                onChange={(event) => setWorkspaceId(Number(event.target.value) || null)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.workspaceId} value={workspace.workspaceId}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="rounded-xl">
            {t('quizResultPage.toFlashcard.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
            {t('quizResultPage.toFlashcard.submit', 'Create flashcards')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
