import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronLeft,
  Flag,
  Loader2,
  Rocket,
  Route,
  Scale,
  Target,
  X,
} from 'lucide-react';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SECTION_VISUALS = {
  purpose: {
    icon: Target,
    accent: '#0EA5E9',
    lightIcon: 'bg-sky-100 text-sky-600',
    darkIcon: 'bg-sky-400/15 text-sky-200',
    lightBorder: 'border-sky-200',
    darkBorder: 'border-sky-400/25',
  },
  knowledgeDomain: {
    icon: BookMarked,
    accent: '#0455BF',
    lightIcon: 'bg-blue-100 text-blue-700',
    darkIcon: 'bg-blue-400/15 text-blue-200',
    lightBorder: 'border-blue-200',
    darkBorder: 'border-blue-400/25',
  },
  currentLevel: {
    icon: BarChart3,
    accent: '#F59E0B',
    lightIcon: 'bg-amber-100 text-amber-600',
    darkIcon: 'bg-amber-400/15 text-amber-200',
    lightBorder: 'border-amber-200',
    darkBorder: 'border-amber-400/25',
  },
  learningGoal: {
    icon: Flag,
    accent: '#10B981',
    lightIcon: 'bg-emerald-100 text-emerald-600',
    darkIcon: 'bg-emerald-400/15 text-emerald-200',
    lightBorder: 'border-emerald-200',
    darkBorder: 'border-emerald-400/25',
  },
  strengthWeakness: {
    icon: Scale,
    accent: '#FF8682',
    lightIcon: 'bg-rose-100 text-rose-500',
    darkIcon: 'bg-rose-400/15 text-rose-200',
    lightBorder: 'border-rose-200',
    darkBorder: 'border-rose-400/25',
  },
  roadmapConfig: {
    icon: Route,
    accent: '#8B5CF6',
    lightIcon: 'bg-violet-100 text-violet-600',
    darkIcon: 'bg-violet-400/15 text-violet-200',
    lightBorder: 'border-violet-200',
    darkBorder: 'border-violet-400/25',
  },
};

const DEFAULT_VISUAL = {
  icon: CheckCircle2,
  accent: '#64748B',
  lightIcon: 'bg-slate-100 text-slate-600',
  darkIcon: 'bg-white/10 text-slate-200',
  lightBorder: 'border-slate-200',
  darkBorder: 'border-white/10',
};

function translateOrFallback(t, key, fallback, options) {
  const translated = t(key, options);
  return translated === key ? fallback : translated;
}

function SummarySection({ section, isDarkMode }) {
  const visual = SECTION_VISUALS[section.id] || DEFAULT_VISUAL;
  const Icon = visual.icon;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border shadow-[0_18px_36px_-30px_rgba(15,23,42,0.34)]',
        section.spanClass,
        isDarkMode
          ? 'bg-slate-950/70 text-slate-100'
          : 'bg-white text-slate-950',
        isDarkMode ? visual.darkBorder : visual.lightBorder
      )}
    >
      <div className="h-1 w-full" style={{ backgroundColor: visual.accent }} />
      <div className="px-4 pb-5 pt-4 sm:px-5">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              isDarkMode ? visual.darkIcon : visual.lightIcon
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <h3 className="min-w-0 flex-1 text-sm font-black leading-tight tracking-tight">
            {section.title}
          </h3>
          <span
            className={cn(
              'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-black tabular-nums',
              isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-500'
            )}
          >
            {section.items.length}
          </span>
        </div>

        <div className={cn(section.itemsGridClass || 'space-y-2.5')}>
          {section.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-xl border px-3.5 py-3',
                isDarkMode
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-slate-100 bg-slate-50/80'
              )}
            >
              {item.label ? (
                <p
                  className={cn(
                    'mb-1.5 text-[10px] font-black uppercase tracking-[0.14em]',
                    isDarkMode ? 'text-slate-400' : 'text-slate-400'
                  )}
                >
                  {item.label}
                </p>
              ) : null}
              <p className="text-sm font-bold leading-snug">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IndividualWorkspaceProfileConfirmView({
  actionCopy,
  confirmDisabled,
  confirmProfileError,
  confirmationDescription,
  confirmationSummary,
  confirmationTitle,
  fontClass,
  isApplyingConfirmedProfile,
  isDarkMode,
  isSubmitting,
  onClose,
  onConfirm,
  shellClass,
  stepLabel,
  t,
}) {
  const confirmStateLabel = isSubmitting || isApplyingConfirmedProfile
    ? translateOrFallback(
      t,
      'individualWorkspaceProfileConfigDialog.confirmProfile.applying',
      'Applying...'
    )
    : actionCopy.confirmProfileUse;
  const backLabel = translateOrFallback(
    t,
    'individualWorkspaceProfileConfigDialog.confirmProfile.backToEdit',
    'Back to wizard'
  );
  const finalReviewTitle = translateOrFallback(
    t,
    'individualWorkspaceProfileConfigDialog.confirmProfile.finalReviewTitle',
    'Are you sure you want to use this profile?'
  );
  const finalReviewDescription = translateOrFallback(
    t,
    'individualWorkspaceProfileConfigDialog.confirmProfile.finalReviewDescription',
    'Check the summary below. Once confirmed, this configuration becomes the active workspace profile.'
  );
  const summaryHelper = translateOrFallback(
    t,
    'individualWorkspaceProfileConfigDialog.confirmProfile.summaryHelper',
    'Everything below will be saved as the current learning setup for this workspace.'
  );
  const footerHelper = translateOrFallback(
    t,
    'individualWorkspaceProfileConfigDialog.confirmProfile.footerHelper',
    'You can still go back to the wizard to edit before applying.'
  );
  const closeLabel = translateOrFallback(
    t,
    'workspace.profileConfig.actions.close',
    'Close'
  );
  const badgeLabel = translateOrFallback(
    t,
    'individualWorkspaceProfileConfigDialog.confirmProfile.badge',
    'PROFILE CONFIRMATION'
  );

  return (
    <DialogContent
      hideClose
      className={cn(
        'grid h-[88vh] w-[min(1240px,calc(100vw-16px))] max-w-none grid-rows-[auto,1fr,auto] gap-0 overflow-hidden rounded-[32px] border p-0 shadow-2xl',
        shellClass,
        fontClass
      )}
    >
      <DialogHeader
        className={cn(
          'relative border-b border-inherit px-5 pb-4 pt-4 text-left sm:px-7 sm:pt-5',
          isDarkMode
            ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))]'
            : 'bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]'
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
          style={{
            background: 'linear-gradient(90deg,#10B981 0%,#0EA5E9 35%,#F59E0B 65%,#8B5CF6 100%)',
          }}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.14em]',
                isDarkMode ? 'bg-emerald-400/15 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              {badgeLabel}
            </div>

            <DialogTitle className="max-w-4xl text-[clamp(1.6rem,2vw,2rem)] font-black leading-[1.08] tracking-tight">
              {confirmationTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {confirmationDescription}
            </DialogDescription>

            <div className={cn('mt-2 flex items-center gap-2 text-sm font-bold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              <BookMarked className="h-3.5 w-3.5 text-slate-400" />
              <span>{stepLabel}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplyingConfirmedProfile}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                isDarkMode
                  ? 'border-white/10 bg-slate-950/50 text-slate-200 hover:bg-white/10'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
              aria-label={closeLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogHeader>

      <div
        className={cn(
          'min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6',
          isDarkMode ? 'bg-slate-950' : 'bg-[#f8fbff]'
        )}
      >
        <div
          className={cn(
            'mb-5 flex items-start gap-4 rounded-2xl border px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-5',
            isDarkMode ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white'
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#10B981_0%,#059669_100%)] text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4)]">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight">
              {finalReviewTitle}
            </p>
            <p className={cn('mt-1 text-[13px] font-medium leading-snug', isDarkMode ? 'text-slate-300' : 'text-slate-500')}>
              {finalReviewDescription}
            </p>
          </div>
        </div>

        {confirmationSummary.sections.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-400">
                  {confirmationSummary.summaryLabel}
                </p>
                <p className={cn('text-xs font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                  {summaryHelper}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {confirmationSummary.sections.map((section) => (
                <SummarySection
                  key={section.id}
                  section={section}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <DialogFooter
        className={cn(
          'flex-col-reverse gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:space-x-0 sm:px-7',
          isDarkMode ? 'border-white/10 bg-slate-950/95' : 'border-slate-200 bg-white'
        )}
      >
        <div className="min-w-0 flex-1">
          {confirmProfileError ? (
            <p className="flex items-center gap-1.5 text-xs font-bold text-red-500" role="alert">
              <AlertTriangle className="h-3.5 w-3.5" />
              {confirmProfileError}
            </p>
          ) : (
            <p className={cn('hidden items-center gap-1.5 text-xs font-medium lg:flex', isDarkMode ? 'text-slate-400' : 'text-slate-400')}>
              {footerHelper}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isApplyingConfirmedProfile}
          className={cn(
            'rounded-full px-5',
            isDarkMode
              ? 'border-white/10 bg-slate-950/80 text-slate-200 hover:bg-white/10'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          )}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={cn(
            'rounded-full px-6 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.45)] transition-transform hover:scale-[1.02] active:scale-[0.98]',
            isSubmitting || isApplyingConfirmedProfile
              ? 'bg-slate-600 hover:bg-slate-600'
              : 'bg-emerald-600 hover:bg-emerald-700'
          )}
        >
          {isSubmitting || isApplyingConfirmedProfile ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {confirmStateLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default IndividualWorkspaceProfileConfirmView;
