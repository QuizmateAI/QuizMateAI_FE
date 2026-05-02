import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * Quick date range presets — click chip de set from/to instantly.
 * Dung chung cho AI Costs + AI Audit filter toolbar.
 *
 * Props:
 *   value: { from: string, to: string } — datetime-local format ("YYYY-MM-DDTHH:mm")
 *   onChange(next) — gọi với { from, to } moi (chuoi datetime-local).
 *   isDarkMode: boolean
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateTimeLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date) {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

const PRESETS = [
  {
    id: 'today',
    labelKey: 'common.dateRange.today',
    defaultLabel: 'Hôm nay',
    compute: () => {
      const now = new Date();
      return { from: formatDateTimeLocal(startOfDay(now)), to: formatDateTimeLocal(now) };
    },
  },
  {
    id: '7d',
    labelKey: 'common.dateRange.last7Days',
    defaultLabel: '7 ngày',
    compute: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    id: '30d',
    labelKey: 'common.dateRange.last30Days',
    defaultLabel: '30 ngày',
    compute: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    id: 'thisMonth',
    labelKey: 'common.dateRange.thisMonth',
    defaultLabel: 'Tháng này',
    compute: () => {
      const now = new Date();
      return { from: formatDateTimeLocal(startOfMonth(now)), to: formatDateTimeLocal(now) };
    },
  },
];

function rangesEqual(a, b) {
  if (!a || !b) return false;
  return a.from === b.from && a.to === b.to;
}

export default function DateRangeChips({ value, onChange, isDarkMode = false, className = '' }) {
  const { t } = useTranslation();

  const handleClick = (preset) => {
    onChange(preset.compute());
  };

  const handleClear = () => {
    onChange({ from: '', to: '' });
  };

  const isPresetActive = (preset) => {
    if (!value || (!value.from && !value.to)) return false;
    const range = preset.compute();
    // Ten phut sai lech (do user click sau, "now" thay doi). Match same date+hour.
    return value.from?.slice(0, 13) === range.from.slice(0, 13)
      && value.to?.slice(0, 13) === range.to.slice(0, 13);
  };

  const baseChip = 'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors';
  const inactiveChip = isDarkMode
    ? 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100';
  const activeChip = isDarkMode
    ? 'border border-sky-400/40 bg-sky-500/15 text-sky-200'
    : 'border border-[#0455BF] bg-[#0455BF] text-white';

  const hasAnyValue = Boolean(value?.from || value?.to);
  const anyPresetActive = PRESETS.some(isPresetActive);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {PRESETS.map((preset) => {
        const active = isPresetActive(preset);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleClick(preset)}
            className={cn(baseChip, active ? activeChip : inactiveChip)}
          >
            {t(preset.labelKey, preset.defaultLabel)}
          </button>
        );
      })}
      {hasAnyValue && !anyPresetActive ? (
        <span className={cn(baseChip, isDarkMode ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border border-amber-200 bg-amber-50 text-amber-700')}>
          {t('common.dateRange.custom', 'Tùy chỉnh')}
        </span>
      ) : null}
      {hasAnyValue ? (
        <button
          type="button"
          onClick={handleClear}
          className={cn(baseChip, isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}
        >
          {t('common.dateRange.clear', 'Xóa')}
        </button>
      ) : null}
    </div>
  );
}

export { formatDateTimeLocal };
