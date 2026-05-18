import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getQuizzesByScope } from '@/api/QuizAPI';
import { getFlashcardsByScope } from '@/api/FlashcardAPI';
import { getMaterialsByWorkspace } from '@/api/MaterialAPI';

const RESOURCE_TYPES = [
  { id: 'QUIZ', icon: FileText },
  { id: 'MATERIAL', icon: BookOpen },
  { id: 'FLASHCARD_SET', icon: Layers },
];

function unwrap(response) {
  if (response && typeof response === 'object' && 'data' in response) return response.data;
  return response;
}

function pickListShape(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
}

// Trích ID + label từ payload thô tùy theo resource type.
function normalizeResourceList(resourceType, raw) {
  const list = pickListShape(raw);
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      if (resourceType === 'QUIZ') {
        const id = item.quizId ?? item.id;
        return id != null
          ? { id: Number(id), label: String(item.quizName || item.title || item.name || `Quiz #${id}`) }
          : null;
      }
      if (resourceType === 'MATERIAL') {
        const id = item.materialId ?? item.id;
        return id != null
          ? { id: Number(id), label: String(item.materialName || item.title || item.fileName || `Material #${id}`) }
          : null;
      }
      if (resourceType === 'FLASHCARD_SET') {
        const id = item.flashcardSetId ?? item.id;
        return id != null
          ? { id: Number(id), label: String(item.flashcardSetName || item.title || item.name || `Flashcard #${id}`) }
          : null;
      }
      return null;
    })
    .filter(Boolean);
}

async function fetchResourceList(resourceType, workspaceId) {
  if (resourceType === 'QUIZ') {
    return unwrap(await getQuizzesByScope('GROUP', workspaceId));
  }
  if (resourceType === 'MATERIAL') {
    return unwrap(await getMaterialsByWorkspace(workspaceId));
  }
  if (resourceType === 'FLASHCARD_SET') {
    return unwrap(await getFlashcardsByScope('GROUP', workspaceId));
  }
  return [];
}

function AssignmentResourcePicker({
  workspaceId,
  resourceType,
  resourceId,
  onChange,
  isDarkMode = false,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [resourceList, setResourceList] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Mỗi lần đổi resourceType (hoặc workspaceId) — refetch danh sách + reset
  // selection để buộc user chọn lại resource cụ thể.
  useEffect(() => {
    let cancelled = false;
    if (!workspaceId || !resourceType) {
      setResourceList([]);
      return () => { cancelled = true; };
    }
    setIsFetching(true);
    setFetchError(null);
    void (async () => {
      try {
        const raw = await fetchResourceList(resourceType, workspaceId);
        if (cancelled) return;
        setResourceList(normalizeResourceList(resourceType, raw));
      } catch (err) {
        if (!cancelled) setFetchError(err);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resourceType, workspaceId]);

  const handleSelectType = (nextType) => {
    if (disabled || nextType === resourceType) return;
    onChange?.({ resourceType: nextType, resourceId: null });
  };

  const handleSelectId = (event) => {
    const next = Number(event.target.value);
    onChange?.({ resourceType, resourceId: Number.isFinite(next) && next > 0 ? next : null });
  };

  const isEmpty = !isFetching && !fetchError && resourceList.length === 0;

  return (
    <div className="space-y-2">
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {RESOURCE_TYPES.map(({ id, icon: Icon }) => {
          const active = resourceType === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => handleSelectType(id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border px-3 py-2 text-xs transition-colors',
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : isDarkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                active && isDarkMode ? 'bg-blue-500/15 text-blue-200 border-blue-500/70' : '',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">
                {t(`groupWorkspace.assignments.resourceTypes.${id}`)}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label
          className={cn('block text-xs font-medium mb-1', isDarkMode ? 'text-slate-400' : 'text-gray-600')}
        >
          {t('groupWorkspace.assignments.form.resourcePickLabel')}
        </label>
        <div className="relative">
          <select
            value={resourceId ?? ''}
            onChange={handleSelectId}
            disabled={disabled || isFetching || isEmpty || Boolean(fetchError)}
            className={cn(
              'w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isDarkMode
                ? 'bg-slate-950 border-slate-700 text-slate-100 disabled:bg-slate-900 disabled:text-slate-500'
                : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400',
            )}
          >
            <option value="">
              {isFetching
                ? t('groupWorkspace.assignments.form.resourceLoading')
                : isEmpty
                  ? t('groupWorkspace.assignments.form.resourceEmpty')
                  : t('groupWorkspace.assignments.form.resourcePlaceholder')}
            </option>
            {resourceList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {isFetching ? (
            <Loader2 className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin',
              isDarkMode ? 'text-slate-500' : 'text-gray-400',
            )} />
          ) : null}
        </div>
        {fetchError ? (
          <p className="mt-1 text-xs text-red-500">
            {t('groupWorkspace.assignments.form.resourceLoadFailed')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default AssignmentResourcePicker;
