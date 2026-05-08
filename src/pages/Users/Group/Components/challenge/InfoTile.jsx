const TONES = {
  cyan: {
    light: 'bg-cyan-50 text-cyan-700 ring-cyan-200/60',
    dark: 'bg-cyan-500/10 text-cyan-200 ring-cyan-500/30',
  },
  orange: {
    light: 'bg-orange-50 text-orange-700 ring-orange-200/60',
    dark: 'bg-orange-500/10 text-orange-200 ring-orange-500/30',
  },
  emerald: {
    light: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    dark: 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/30',
  },
  violet: {
    light: 'bg-violet-50 text-violet-700 ring-violet-200/60',
    dark: 'bg-violet-500/10 text-violet-200 ring-violet-500/30',
  },
  slate: {
    light: 'bg-slate-100 text-slate-700 ring-slate-300/60',
    dark: 'bg-slate-700/40 text-slate-200 ring-slate-500/40',
  },
};

/**
 * Compact info tile: icon chip + label + value, used in challenge detail summary grid.
 * Pass `children` to render extra content under the headline (eg: a progress bar).
 */
export default function InfoTile({ icon: Icon, label, value, tone = 'cyan', isDarkMode, children }) {
  const palette = TONES[tone] || TONES.cyan;
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isDarkMode ? 'border-slate-700/60 bg-slate-800/30' : 'border-slate-200/80 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${
            isDarkMode ? palette.dark : palette.light
          }`}
        >
          {Icon && <Icon className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
          </div>
          <div className={`mt-0.5 truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {value}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
