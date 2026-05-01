import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import * as LucideIcons from 'lucide-react';

const ACCENT_GRADIENTS = {
  indigo: 'from-indigo-500/15 to-indigo-500/5 dark:from-indigo-400/20 dark:to-indigo-500/5',
  emerald: 'from-emerald-500/15 to-emerald-500/5 dark:from-emerald-400/20 dark:to-emerald-500/5',
  amber: 'from-amber-500/15 to-amber-500/5 dark:from-amber-400/20 dark:to-amber-500/5',
  violet: 'from-violet-500/15 to-violet-500/5 dark:from-violet-400/20 dark:to-violet-500/5',
  rose: 'from-rose-500/15 to-rose-500/5 dark:from-rose-400/20 dark:to-rose-500/5',
  sky: 'from-sky-500/15 to-sky-500/5 dark:from-sky-400/20 dark:to-sky-500/5',
};

const ACCENT_BORDERS = {
  indigo: 'border-indigo-200 dark:border-indigo-900/50 group-hover:border-indigo-400 dark:group-hover:border-indigo-500',
  emerald: 'border-emerald-200 dark:border-emerald-900/50 group-hover:border-emerald-400 dark:group-hover:border-emerald-500',
  amber: 'border-amber-200 dark:border-amber-900/50 group-hover:border-amber-400 dark:group-hover:border-amber-500',
  violet: 'border-violet-200 dark:border-violet-900/50 group-hover:border-violet-400 dark:group-hover:border-violet-500',
  rose: 'border-rose-200 dark:border-rose-900/50 group-hover:border-rose-400 dark:group-hover:border-rose-500',
  sky: 'border-sky-200 dark:border-sky-900/50 group-hover:border-sky-400 dark:group-hover:border-sky-500',
};

const ACCENT_ICON = {
  indigo: 'text-indigo-600 dark:text-indigo-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  violet: 'text-violet-600 dark:text-violet-400',
  rose: 'text-rose-600 dark:text-rose-400',
  sky: 'text-sky-600 dark:text-sky-400',
};

export default function PolicyCard({ policy }) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

  const accent = ACCENT_GRADIENTS[policy.accentColor] ?? ACCENT_GRADIENTS.indigo;
  const border = ACCENT_BORDERS[policy.accentColor] ?? ACCENT_BORDERS.indigo;
  const iconColor = ACCENT_ICON[policy.accentColor] ?? ACCENT_ICON.indigo;

  const IconComponent =
    (policy.iconName && LucideIcons[policy.iconName]) || LucideIcons.FileText;

  const i18nKey = `policies.categories.${policy.type}`;
  const localizedTitle = t(`${i18nKey}.title`, policy.title);
  const localizedSummary = t(`${i18nKey}.summary`, policy.summary);
  const category = t(`${i18nKey}.category`, '');

  return (
    <Link
      to={`/policies/${policy.slug}`}
      className={`group relative block rounded-2xl border bg-gradient-to-br ${accent} ${border} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isDarkMode ? 'hover:shadow-slate-900/50' : 'hover:shadow-slate-200/80'
      }`}
    >
      <div className="flex items-start justify-between mb-5">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor} ${
            isDarkMode ? 'bg-slate-900/60' : 'bg-white/80'
          } shadow-sm`}
        >
          <IconComponent className="w-6 h-6" strokeWidth={1.8} />
        </div>
        {category && (
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
              isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white/70 text-slate-500'
            }`}
          >
            {category}
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2 leading-tight">
        {localizedTitle}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3 min-h-[60px]">
        {localizedSummary}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          {t('policies.version', 'v')} {policy.version}
        </span>
        <span
          className={`flex items-center gap-1 font-semibold transition-all ${iconColor} group-hover:gap-2`}
        >
          {t('policies.readPolicy', 'Read')}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
