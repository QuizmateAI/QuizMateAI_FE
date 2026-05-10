import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  ClipboardList,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
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
import { useSavedMockTestTemplates } from '../hooks/useSavedMockTestTemplates';

// Khớp default của BE (mock_test.max_saved_templates_per_user). Không tune qua UI nữa
// — nếu cần thay đổi giới hạn, sửa cả ở đây và BE MockTestSavedTemplateService.
const MAX_SAVED_TEMPLATES = 100;

/**
 * Panel hien thi kho saved templates cua user TRONG workspace.
 *
 * Props:
 *   open: bool — controlled dialog visibility
 *   onClose: () => void
 *   onUseTemplate: (template) => void — user click "Dung template" de mo form Tao Mocktest pre-filled
 *   workspaceId: number — BAT BUOC ke tu BE V2026_05_14 (per-workspace scoping). Khi missing,
 *     panel hien thi empty + warning vi hook khong the fetch.
 *   isDarkMode: bool
 */
export function SavedMockTestTemplatesPanel({
  open,
  onClose,
  onUseTemplate,
  workspaceId,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const maxTemplates = MAX_SAVED_TEMPLATES;
  const {
    templates,
    isLoading,
    error,
    refetch,
    remove,
    fetchDetail,
  } = useSavedMockTestTemplates({ enabled: open, workspaceId });
  const usedTemplates = templates?.length ?? 0;
  const atLimit = usedTemplates >= maxTemplates;
  const [search, setSearch] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [usingId, setUsingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((tpl) => {
      const haystack = [tpl.displayName, tpl.examType, tpl.code, tpl.contentLanguage]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(' ');
      return haystack.includes(term);
    });
  }, [templates, search]);

  const handleUse = async (template) => {
    if (!template?.mockTestTemplateId || usingId) return;
    setUsingId(template.mockTestTemplateId);
    try {
      const detail = await fetchDetail(template.mockTestTemplateId);
      onUseTemplate?.(detail);
      onClose?.();
    } finally {
      setUsingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingDeleteId || removingId) return;
    setRemovingId(pendingDeleteId);
    try {
      await remove(pendingDeleteId);
    } finally {
      setRemovingId(null);
      setPendingDeleteId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose?.(); }}>
      <DialogContent className={`max-w-3xl ${isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-orange-500" />
            {t('mockTestForms.savedTemplates.title', 'Kho template đã lưu')}
            <span
              className={`ml-2 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                atLimit
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                  : isDarkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {usedTemplates}/{maxTemplates}
            </span>
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
            {t(
              'mockTestForms.savedTemplates.description',
              'Các template bạn đã lưu trong workspace. Bấm "Dùng template" để tạo nhanh mocktest mới từ cấu trúc đã có.',
            )}
            {atLimit && (
              <span className="mt-1 block text-xs font-semibold text-rose-600 dark:text-rose-400">
                {t(
                  'mockTestForms.savedTemplates.limitReached',
                  { max: maxTemplates, defaultValue: `Bạn đã đạt giới hạn ${maxTemplates} template. Hãy xoá bớt trước khi lưu thêm.` },
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('mockTestForms.savedTemplates.searchPlaceholder', 'Tìm theo tên hoặc kỳ thi...')}
            className="h-10 pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className={`max-h-[480px] overflow-y-auto rounded-lg border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {isLoading && (
            <div className="flex items-center justify-center px-6 py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('mockTestForms.savedTemplates.loading', 'Đang tải...')}
            </div>
          )}
          {!isLoading && error && (
            <div className="px-6 py-12 text-center text-sm text-rose-600">
              {error?.message || t('mockTestForms.savedTemplates.loadFailed', 'Không tải được danh sách template.')}
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <ClipboardList className="h-10 w-10 text-slate-300" />
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {templates.length === 0
                  ? t('mockTestForms.savedTemplates.empty', 'Bạn chưa lưu template nào. Lưu template từ form tạo mocktest để dùng lại sau.')
                  : t('mockTestForms.savedTemplates.noMatch', 'Không tìm thấy template phù hợp.')}
              </p>
            </div>
          )}
          {!isLoading && !error && filtered.length > 0 && (
            <ul className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filtered.map((template) => {
                const id = template.mockTestTemplateId;
                const isUsing = usingId === id;
                const isRemoving = removingId === id;
                return (
                  <li
                    key={id}
                    className={`flex items-start justify-between gap-3 px-4 py-3 ${isDarkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {template.displayName || template.code}
                        </p>
                      </div>
                      <p className={`mt-0.5 text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {[template.examType, template.contentLanguage?.toUpperCase()].filter(Boolean).join(' · ')}
                        {' · '}
                        {(template.totalQuestion ?? 0)} {t('mockTestForms.common.questionsShort', 'câu')}
                        {' · '}
                        {(template.durationMinutes ?? 0)} {t('mockTestForms.common.minutesShort', 'phút')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUse(template)}
                        disabled={isUsing || isRemoving}
                        className="h-8 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                      >
                        {isUsing ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        {t('mockTestForms.savedTemplates.use', 'Dùng template')}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setPendingDeleteId(id)}
                        disabled={isUsing || isRemoving}
                        className={`h-8 w-8 rounded-full ${isDarkMode ? 'text-rose-300 hover:bg-rose-950/40' : 'text-rose-600 hover:bg-rose-50'}`}
                        title={t('mockTestForms.savedTemplates.delete', 'Xóa template')}
                      >
                        {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onClose?.()}>
            {t('mockTestForms.common.close', 'Đóng')}
          </Button>
        </DialogFooter>

        <Dialog
          open={pendingDeleteId != null}
          onOpenChange={(value) => { if (!value) setPendingDeleteId(null); }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {t('mockTestForms.savedTemplates.confirmDeleteTitle', 'Xác nhận xóa template')}
              </DialogTitle>
              <DialogDescription>
                {t('mockTestForms.savedTemplates.confirmDeleteDesc', 'Template sẽ bị ẩn khỏi kho. Mocktest đã tạo từ template này vẫn giữ nguyên.')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDeleteId(null)}
                disabled={Boolean(removingId)}
              >
                {t('mockTestForms.common.cancel', 'Hủy')}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmRemove}
                disabled={Boolean(removingId)}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {removingId
                  ? t('mockTestForms.savedTemplates.deleting', 'Đang xóa...')
                  : t('mockTestForms.savedTemplates.delete', 'Xóa template')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
