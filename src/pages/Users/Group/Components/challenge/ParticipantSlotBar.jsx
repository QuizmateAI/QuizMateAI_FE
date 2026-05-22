import { Users } from 'lucide-react';

function pickFillPalette(ratio, isDarkMode) {
  // Full = green, near-full = orange, mid = sky, low = teal
  if (ratio >= 0.95) return isDarkMode ? 'bg-rose-500' : 'bg-rose-500';
  if (ratio >= 0.75) return isDarkMode ? 'bg-orange-500' : 'bg-orange-500';
  if (ratio >= 0.4) return isDarkMode ? 'bg-sky-500' : 'bg-sky-500';
  return isDarkMode ? 'bg-teal-500' : 'bg-teal-500';
}

export default function ParticipantSlotBar({
  used = 0,
  total = null,
  isDarkMode = false,
  size = 'md',
  showLabel = true,
  className = '',
}) {
  const safeUsed = Math.max(0, Number(used) || 0);
  const hasCap = total != null && Number(total) > 0;
  const safeTotal = hasCap ? Math.max(safeUsed, Number(total)) : null;
  const ratio = hasCap ? Math.min(1, safeUsed / safeTotal) : 0;

  // Nothing useful to show: no capacity AND no participants yet.
  if (!hasCap && safeUsed === 0) return null;

  const trackHeight = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const labelSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs';
  const trackBg = isDarkMode ? 'bg-slate-700/60' : 'bg-slate-200';
  const fillPalette = pickFillPalette(ratio, isDarkMode);

  return (
    <div className={`flex w-full flex-col gap-1 ${className}`}>
      {showLabel && (
        <div className={`flex items-center justify-between ${labelSize} ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          <span className="inline-flex items-center gap-1 font-medium">
            <Users className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            <span>{safeUsed}{hasCap ? `/${safeTotal}` : ''}</span>
          </span>
          {hasCap && (
            <span className={`font-mono tabular-nums ${ratio >= 0.95 ? 'text-rose-500' : ''}`}>
              {Math.round(ratio * 100)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full ${trackBg} ${trackHeight}`} role="progressbar" aria-valuemin={0} aria-valuemax={hasCap ? safeTotal : safeUsed} aria-valuenow={safeUsed}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillPalette}`}
          style={{ width: hasCap ? `${ratio * 100}%` : safeUsed > 0 ? '100%' : '0%' }}
        />
      </div>
    </div>
  );
}
