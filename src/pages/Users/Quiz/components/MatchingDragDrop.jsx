import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function MatchingDragDrop({
  leftItems,
  rightOptions,
  matchedPairs,
  onPairChange,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [dragOverLeft, setDragOverLeft] = useState(null);
  const dragRef = useRef({ item: null, source: null });
  const dragCounter = useRef({});

  const matchedByLeft = useMemo(
    () => new Map((matchedPairs || []).map((p) => [p.leftKey, p.rightKey])),
    [matchedPairs],
  );

  const matchedRightKeys = useMemo(
    () => new Set([...matchedByLeft.values()]),
    [matchedByLeft],
  );

  const rightOptionsKey = JSON.stringify(Array.isArray(rightOptions) ? rightOptions : []);

  const shuffledOptions = useMemo(
    () => shuffleArray(JSON.parse(rightOptionsKey)),
    [rightOptionsKey],
  );

  const unmatchedRight = useMemo(
    () => shuffledOptions.filter((r) => !matchedRightKeys.has(r)),
    [shuffledOptions, matchedRightKeys],
  );

  const emitChange = useCallback(
    (leftKey, rightKey) => {
      const next = leftItems.reduce((pairs, lk) => {
        const existing = lk === leftKey ? rightKey : matchedByLeft.get(lk);
        if (existing) pairs.push({ leftKey: lk, rightKey: existing });
        return pairs;
      }, []);
      onPairChange?.({ matchingPairs: next });
    },
    [leftItems, matchedByLeft, onPairChange],
  );

  const handleDragStart = (e, rightKey, source) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    dragRef.current = { item: rightKey, source };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rightKey);
  };

  const handleDragEnd = () => {
    dragRef.current = { item: null, source: null };
    setDragOverLeft(null);
    dragCounter.current = {};
  };

  const handleDragEnter = (leftKey) => (e) => {
    e.preventDefault();
    dragCounter.current[leftKey] = (dragCounter.current[leftKey] || 0) + 1;
    setDragOverLeft(leftKey);
  };

  const handleDragLeave = (leftKey) => () => {
    dragCounter.current[leftKey] = (dragCounter.current[leftKey] || 0) - 1;
    if (dragCounter.current[leftKey] <= 0) {
      dragCounter.current[leftKey] = 0;
      if (dragOverLeft === leftKey) setDragOverLeft(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (leftKey) => (e) => {
    e.preventDefault();
    dragCounter.current[leftKey] = 0;
    setDragOverLeft(null);
    const draggedItem = dragRef.current.item;
    if (!draggedItem || disabled) return;

    const prevLeftForDragged = [...matchedByLeft.entries()].find(
      ([, value]) => value === draggedItem,
    )?.[0];

    if (prevLeftForDragged === leftKey) return;

    const currentRight = matchedByLeft.get(leftKey);
    const next = [];
    for (const lk of leftItems) {
      if (lk === leftKey) {
        next.push({ leftKey: lk, rightKey: draggedItem });
      } else if (lk === prevLeftForDragged && currentRight) {
        next.push({ leftKey: lk, rightKey: currentRight });
      } else if (lk === prevLeftForDragged && !currentRight) {
        // unmatched
      } else {
        const existing = matchedByLeft.get(lk);
        if (existing) next.push({ leftKey: lk, rightKey: existing });
      }
    }
    onPairChange?.({ matchingPairs: next });
    dragRef.current = { item: null, source: null };
  };

  const handleRemove = (leftKey) => () => {
    if (disabled) return;
    emitChange(leftKey, null);
  };

  const handlePoolDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePoolDrop = (e) => {
    e.preventDefault();
    const draggedItem = dragRef.current.item;
    if (!draggedItem || disabled) return;
    const prevLeft = [...matchedByLeft.entries()].find(
      ([, value]) => value === draggedItem,
    )?.[0];
    if (prevLeft) {
      emitChange(prevLeft, null);
    }
    dragRef.current = { item: null, source: null };
    setDragOverLeft(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs italic text-slate-500 dark:text-slate-400">
        {t(
          'workspace.quiz.matching.dragInstruction',
          'Drag the items below into the matching slots.',
        )}
      </p>

      {/* Matching area */}
      <div className="space-y-2.5">
        {leftItems.map((leftKey, idx) => {
          const matched = matchedByLeft.get(leftKey);
          const isOver = dragOverLeft === leftKey;

          return (
            <div
              key={leftKey}
              className={cn(
                'flex items-stretch gap-3 rounded-xl border p-3 transition-all',
                isOver
                  ? 'border-blue-400 bg-blue-50/50 shadow-sm dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40',
              )}
              onDragEnter={handleDragEnter(leftKey)}
              onDragLeave={handleDragLeave(leftKey)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(leftKey)}
            >
              {/* Left item */}
              <div className="flex min-w-0 flex-1 items-center">
                <span className="mr-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
                  {leftKey}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center px-1 text-slate-300 dark:text-slate-600">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>

              {/* Drop zone / matched item */}
              <div className="flex min-w-0 flex-1 items-center">
                {matched ? (
                  <div className="flex w-full items-center gap-2">
                    <div
                      draggable={!disabled}
                      onDragStart={(e) => handleDragStart(e, matched, `slot-${leftKey}`)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'inline-flex select-none items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium',
                        'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
                        disabled
                          ? 'cursor-default opacity-75'
                          : 'cursor-grab hover:border-blue-300 hover:shadow-md active:cursor-grabbing dark:hover:border-blue-700',
                      )}
                    >
                      {!disabled && <GripVertical className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />}
                      <span className="leading-snug">{matched}</span>
                    </div>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={handleRemove(leftKey)}
                        className="flex-shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex min-h-[40px] w-full items-center justify-center rounded-lg border-2 border-dashed text-xs transition-all',
                      isOver
                        ? 'border-blue-400 bg-blue-100/50 text-blue-500 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-400'
                        : 'border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500',
                    )}
                  >
                    {t('workspace.quiz.matching.dropHere', 'Drag an answer here')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right options pool */}
      {unmatchedRight.length > 0 && (
        <div
          className={cn(
            'rounded-xl border border-dashed p-3 transition-all',
            'border-slate-300 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/30',
          )}
          onDragOver={handlePoolDragOver}
          onDrop={handlePoolDrop}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('workspace.quiz.matching.answerPool', 'Answers')}
          </p>
          <div className="flex flex-wrap gap-2">
            {unmatchedRight.map((rightKey) => (
              <div
                key={rightKey}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, rightKey, 'pool')}
                onDragEnd={handleDragEnd}
                className={cn(
                  'inline-flex select-none items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium',
                  'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
                  disabled
                    ? 'cursor-default opacity-75'
                    : 'cursor-grab hover:border-blue-300 hover:shadow-md active:cursor-grabbing dark:hover:border-blue-700',
                )}
              >
                {!disabled && <GripVertical className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />}
                <span className="leading-snug">{rightKey}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {unmatchedRight.length === 0 && !disabled && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {t('workspace.quiz.matching.allMatched', 'Everything has been matched!')}
        </p>
      )}
    </div>
  );
}
