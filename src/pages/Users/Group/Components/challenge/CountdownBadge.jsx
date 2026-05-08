import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function formatRemaining(diff) {
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return { primary: `${days}d ${hours}h`, secondary: `${minutes}m`, totalSeconds };
  if (hours > 0) return { primary: `${hours}h ${String(minutes).padStart(2, '0')}m`, secondary: `${String(seconds).padStart(2, '0')}s`, totalSeconds };
  return { primary: `${minutes}:${String(seconds).padStart(2, '0')}`, secondary: null, totalSeconds };
}

function pickPalette(totalSeconds, isDarkMode) {
  // < 10 minutes: red urgent; < 1 hour: orange; otherwise: blue calm
  if (totalSeconds < 600) {
    return isDarkMode
      ? 'bg-red-500/15 text-red-200 ring-red-500/40'
      : 'bg-red-50 text-red-700 ring-red-300/60';
  }
  if (totalSeconds < 3600) {
    return isDarkMode
      ? 'bg-orange-500/15 text-orange-200 ring-orange-500/40'
      : 'bg-orange-50 text-orange-700 ring-orange-300/60';
  }
  return isDarkMode
    ? 'bg-sky-500/15 text-sky-200 ring-sky-500/40'
    : 'bg-sky-50 text-sky-700 ring-sky-300/60';
}

const SIZE_PRESETS = {
  sm: { wrap: 'gap-1 px-2 py-1', primary: 'text-xs', secondary: 'text-[10px]', icon: 'h-3 w-3' },
  md: { wrap: 'gap-1.5 px-3 py-1.5', primary: 'text-sm', secondary: 'text-[11px]', icon: 'h-3.5 w-3.5' },
  lg: { wrap: 'gap-2 px-4 py-2', primary: 'text-lg', secondary: 'text-xs', icon: 'h-4 w-4' },
  xl: { wrap: 'gap-2.5 px-5 py-2.5', primary: 'text-2xl', secondary: 'text-sm', icon: 'h-5 w-5' },
};

/**
 * Visual countdown that escalates color from blue (chill) → orange (warm) → red (urgent).
 * Pass `targetTime` (ISO string or Date) and choose `size` based on context:
 *   - sm/md for compact rows, lg/xl for hero cards.
 */
export default function CountdownBadge({ targetTime, isDarkMode = false, size = 'md', label, className = '' }) {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!targetTime) return undefined;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  if (!targetTime) return null;
  const diff = new Date(targetTime).getTime() - tick;
  const remaining = formatRemaining(diff);
  // Once the deadline has passed, suppress entirely — the parent already shows
  // the actual LIVE / FINISHED status badge, so a fake countdown adds noise.
  if (!remaining) return null;

  const palette = pickPalette(remaining.totalSeconds, isDarkMode);
  const sizing = SIZE_PRESETS[size] || SIZE_PRESETS.md;
  const isUrgent = remaining.totalSeconds < 600;

  return (
    <span
      className={`inline-flex items-center rounded-full ring-1 font-mono font-semibold tabular-nums ${palette} ${sizing.wrap} ${className} ${
        isUrgent ? 'animate-pulse' : ''
      }`}
    >
      <Clock className={sizing.icon} />
      <span className="flex items-baseline gap-1">
        {label && <span className="font-sans font-medium opacity-80">{label}</span>}
        <span className={sizing.primary}>{remaining.primary}</span>
        {remaining.secondary && (
          <span className={`opacity-70 ${sizing.secondary}`}>{remaining.secondary}</span>
        )}
      </span>
    </span>
  );
}
