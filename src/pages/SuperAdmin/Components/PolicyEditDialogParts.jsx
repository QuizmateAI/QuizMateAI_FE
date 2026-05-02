import * as LucideIcons from 'lucide-react';
import { Check, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// 12 named accents. Adding a new color here also requires adding the matching
// Tailwind classes in PolicyCard.jsx and PolicyDetailPage.jsx maps so the
// public-facing pages render the color the admin picks here.
export const ACCENT_COLORS = [
  'indigo', 'emerald', 'amber', 'violet', 'rose', 'sky',
  'blue', 'teal', 'pink', 'orange', 'lime', 'fuchsia',
];

export const ACCENT_SWATCHES = {
  indigo: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  amber: 'bg-gradient-to-br from-amber-400 to-amber-600',
  violet: 'bg-gradient-to-br from-violet-400 to-violet-600',
  rose: 'bg-gradient-to-br from-rose-400 to-rose-600',
  sky: 'bg-gradient-to-br from-sky-400 to-sky-600',
  blue: 'bg-gradient-to-br from-blue-400 to-blue-600',
  teal: 'bg-gradient-to-br from-teal-400 to-teal-600',
  pink: 'bg-gradient-to-br from-pink-400 to-pink-600',
  orange: 'bg-gradient-to-br from-orange-400 to-orange-600',
  lime: 'bg-gradient-to-br from-lime-400 to-lime-600',
  fuchsia: 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600',
};

// Curated quick-picks for the icon field. Admin can still type any Lucide
// icon name; these are just one-click shortcuts for the most common cases.
export const ICON_QUICK_PICKS = [
  'FileText', 'Shield', 'ShieldCheck', 'Lock',
  'Users', 'Sparkles', 'Wallet', 'Copyright',
  'Scale', 'Gavel', 'BookOpen', 'Globe',
];

// Tone presets for SectionHeader. Kept small + opinionated rather than a
// generic color prop so each section reads consistently across edits.
const TONE_CLASSES = {
  indigo: 'text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 ring-indigo-500/20',
  emerald: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
  amber: 'text-amber-600 dark:text-amber-300 bg-amber-500/10 ring-amber-500/20',
  violet: 'text-violet-600 dark:text-violet-300 bg-violet-500/10 ring-violet-500/20',
};

export function SectionHeader({ icon, tone, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md ring-1 ${TONE_CLASSES[tone] || TONE_CLASSES.indigo}`}
      >
        {icon}
      </span>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
        {title}
      </h3>
      <span className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800" />
    </div>
  );
}

export function Field({ icon, label, children, className = '', badge }) {
  return (
    <div className={className}>
      <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <span>{label}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// Live preview + free-form text + quick-pick row.
// Admin can type any Lucide icon name; the preview tile resolves it on the fly
// and falls back to a HelpCircle when the name doesn't match a known icon.
export function IconPicker({ value, onChange, accent = 'indigo', typeHint }) {
  const ResolvedIcon = (value && LucideIcons[value]) || null;
  const isValid = Boolean(ResolvedIcon);
  const PreviewIcon = ResolvedIcon || HelpCircle;

  return (
    <div className="space-y-2.5">
      <div className="flex items-stretch gap-2">
        <div
          className={`relative shrink-0 h-9 w-9 rounded-md flex items-center justify-center ring-1 transition-all duration-200 ${
            isValid
              ? `${ACCENT_SWATCHES[accent] || ACCENT_SWATCHES.indigo} ring-slate-900/10 dark:ring-white/10 text-white shadow-sm`
              : 'bg-slate-100 dark:bg-slate-800/60 ring-slate-200 dark:ring-slate-700 text-slate-400'
          }`}
          aria-hidden
        >
          <PreviewIcon className="h-4 w-4" strokeWidth={2} />
          {!isValid && value && (
            <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </div>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value.replace(/\s+/g, ''))}
          placeholder="FileText, Shield, ShieldCheck, ..."
          className="font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ICON_QUICK_PICKS.map((name) => {
          const Icon = LucideIcons[name];
          if (!Icon) return null;
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={`group h-8 w-8 rounded-md flex items-center justify-center ring-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 ${
                selected
                  ? `${ACCENT_SWATCHES[accent] || ACCENT_SWATCHES.indigo} ring-slate-900/10 dark:ring-white/15 text-white shadow-sm`
                  : 'bg-slate-50 dark:bg-slate-800/40 ring-slate-200/70 dark:ring-slate-700/70 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:ring-slate-300 dark:hover:ring-slate-600'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          );
        })}
      </div>
      {typeHint && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{typeHint}</p>
      )}
    </div>
  );
}

// Swatch grid replaces the old <select>. Selected color gets a check + ring.
export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCENT_COLORS.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            aria-label={c}
            aria-pressed={selected}
            className={`relative h-9 w-9 rounded-md ${ACCENT_SWATCHES[c]} ring-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 ${
              selected
                ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-950 shadow-md'
                : 'ring-slate-900/10 dark:ring-white/10 hover:ring-slate-900/30 dark:hover:ring-white/30'
            }`}
          >
            {selected && (
              <span className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 fade-in duration-200">
                <Check className="h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
