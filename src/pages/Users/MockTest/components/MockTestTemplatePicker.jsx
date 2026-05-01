import React, { useMemo } from 'react';
import { CheckCircle2, Sparkles, BookmarkPlus, Loader2, Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

function buildMaterialNameMap(workspaceMaterials) {
  if (!Array.isArray(workspaceMaterials)) return new Map();
  const map = new Map();
  workspaceMaterials.forEach((item) => {
    const id = Number(item?.id ?? item?.materialId);
    if (!Number.isInteger(id) || id <= 0) return;
    const label = item?.name || item?.title || item?.originalFileName || `#${id}`;
    map.set(id, label);
  });
  return map;
}

/**
 * Show templates returned by the recommender.
 *
 * Props:
 *   options: list of suggestion objects
 *   selectedTemplateId: id of currently active template
 *   onSelect: callback when user picks a card
 *   onSaveTemplate: optional callback to save the AI-suggested template into user's library
 *   savedTemplateIds: Set<number> of already-saved template ids
 *   savingTemplateId: id currently being saved (to show spinner)
 *   workspaceMaterials: list of {id, name} so card can show "Dua tren: ..."
 *   isDarkMode: theme flag
 *
 * Renders even when only 1 template is returned (so user sees the matched template card).
 */
export function MockTestTemplatePicker({
  options,
  selectedTemplateId,
  onSelect,
  onSaveTemplate,
  savedTemplateIds,
  savingTemplateId,
  workspaceMaterials,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const materialNameMap = useMemo(() => buildMaterialNameMap(workspaceMaterials), [workspaceMaterials]);

  if (!Array.isArray(options) || options.length === 0) return null;

  const savedSet = savedTemplateIds instanceof Set
    ? savedTemplateIds
    : new Set(Array.isArray(savedTemplateIds) ? savedTemplateIds : []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
        <Sparkles className="h-3.5 w-3.5" />
        {options.length === 1
          ? t('mockTestForms.templatePicker.singleTitle', 'Template đã tìm thấy')
          : t('mockTestForms.templatePicker.title', 'Chọn 1 trong {{count}} template phù hợp', { count: options.length })}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const meta = option?.v2Template || {};
          const templateId = meta.mockTestTemplateId;
          const selected = templateId === selectedTemplateId;
          const isSaved = templateId != null && savedSet.has(templateId);
          const isSaving = templateId != null && savingTemplateId === templateId;
          const canSave = Boolean(onSaveTemplate) && templateId != null;
          return (
            <div
              key={templateId || meta.code}
              className={[
                'flex flex-col gap-2 rounded-lg border p-3 text-left transition-all',
                selected
                  ? (isDarkMode ? 'border-purple-500 bg-purple-950/30' : 'border-purple-300 bg-purple-50')
                  : (isDarkMode ? 'border-slate-700 bg-slate-900/40 hover:border-slate-500' : 'border-gray-200 bg-white hover:border-purple-200'),
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onSelect?.(option)}
                className="flex flex-col gap-2 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {meta.displayName || option.displayName}
                    </p>
                    <p className={`mt-1 text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {option.totalQuestion || 0} {t('mockTestForms.common.questionsShort', 'câu')}
                      {' · '}
                      {option.durationMinutes || 0} {t('mockTestForms.common.minutesShort', 'phút')}
                      {' · '}
                      {(option.sections || []).length} {t('mockTestForms.common.sectionsShort', 'phần')}
                    </p>
                  </div>
                  {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-600" />}
                </div>
                {option.description && (
                  <p className={`line-clamp-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {option.description}
                  </p>
                )}
                {Array.isArray(option.sourceMaterialIds) && option.sourceMaterialIds.length > 0 && (
                  <div className={`flex flex-wrap items-center gap-1 text-[10.5px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="font-medium">{t('mockTestForms.templatePicker.basedOn', 'Dựa trên')}:</span>
                    {option.sourceMaterialIds.map((id, idx) => {
                      const label = materialNameMap.get(Number(id)) || `#${id}`;
                      return (
                        <span
                          key={id}
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
                          title={label}
                        >
                          {label.length > 28 ? `${label.slice(0, 26)}…` : label}
                          {idx < option.sourceMaterialIds.length - 1 ? '' : ''}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
              {canSave && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isSaved && !isSaving) onSaveTemplate(option);
                    }}
                    disabled={isSaved || isSaving}
                    className={`h-7 px-2 text-[11px] ${isDarkMode ? 'border-slate-600 text-slate-200' : ''}`}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : isSaved ? (
                      <Check className="mr-1 h-3 w-3 text-emerald-500" />
                    ) : (
                      <BookmarkPlus className="mr-1 h-3 w-3" />
                    )}
                    {isSaved
                      ? t('mockTestForms.templatePicker.saved', 'Đã lưu')
                      : isSaving
                        ? t('mockTestForms.templatePicker.saving', 'Đang lưu...')
                        : t('mockTestForms.templatePicker.saveTemplate', 'Lưu template')}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
