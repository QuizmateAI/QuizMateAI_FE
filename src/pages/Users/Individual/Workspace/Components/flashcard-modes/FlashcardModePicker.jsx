import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, ListChecks, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FLASHCARD_MODES = ['flip', 'quiz', 'shuffle'];

const MODE_META = {
  flip: { icon: CreditCard, key: 'flip', fallback: 'Flip' },
  quiz: { icon: ListChecks, key: 'quiz', fallback: 'Quiz' },
  shuffle: { icon: Shuffle, key: 'shuffle', fallback: 'Shuffle' },
};

export default function FlashcardModePicker({ value, onChange, disabled = false }) {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t('workspace.flashcard.modes.label', 'Study mode')}
      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {FLASHCARD_MODES.map((mode) => {
        const Meta = MODE_META[mode];
        const Icon = Meta.icon;
        const label = t(`workspace.flashcard.modes.picker.${Meta.key}`, Meta.fallback);
        const isActive = value === mode;

        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onChange?.(mode)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70',
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
