import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpenCheck,
  BrainCircuit,
  Compass,
  PenSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatGroupLearningMode } from '../utils/groupDisplay';

function formatToggleState(value, t, enabledLabel, disabledLabel) {
  if (value == null) return t('groupProfileOverviewPanel.toggle.notConfigured', 'Not configured');
  return value ? enabledLabel : disabledLabel;
}

function formatSeatLimit(value, t) {
  const safeValue = Number(value);
  if (Number.isFinite(safeValue) && safeValue > 0) {
    return t('groupProfileOverviewPanel.seatLimit.members', '{{count}} members', { count: safeValue });
  }
  return t('groupProfileOverviewPanel.seatLimit.basedOnPlan', 'Based on active group plan');
}

function formatCompletionState(value, t) {
  if (value == null) return t('groupProfileOverviewPanel.completion.inProgress', 'In progress');
  return value
    ? t('groupProfileOverviewPanel.completion.completed', 'Completed')
    : t('groupProfileOverviewPanel.completion.inProgress', 'In progress');
}

function MetricCard({ icon: Icon, label, value, description, toneClass, isDarkMode }) {
  return (
    <div className={cn(
      'rounded-[24px] border p-4',
      isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
    )}>
      <div className="flex items-center gap-3">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
        <p className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.18em]',
          isDarkMode ? 'text-slate-500' : 'text-slate-500'
        )}>
          {label}
        </p>
      </div>
      <p className={cn('mt-5 text-lg font-bold leading-7', isDarkMode ? 'text-white' : 'text-slate-900')}>
        {value}
      </p>
      <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
        {description}
      </p>
    </div>
  );
}

function InfoField({ label, value, isDarkMode }) {
  return (
    <div className={cn(
      'rounded-[20px] border px-4 py-3.5',
      isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
    )}>
      <p className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.18em]',
        isDarkMode ? 'text-slate-500' : 'text-slate-500'
      )}>
        {label}
      </p>
      <p className={cn('mt-2 text-sm font-semibold leading-6', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>
        {value}
      </p>
    </div>
  );
}

function NarrativeCard({ eyebrow, title, content, icon: Icon, toneClass, isDarkMode }) {
  return (
    <div className={cn(
      'rounded-[24px] border p-5',
      isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
    )}>
      <div className="flex items-center gap-2">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-2xl', toneClass)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.18em]',
            isDarkMode ? 'text-slate-500' : 'text-slate-500'
          )}>
            {eyebrow}
          </p>
          <h4 className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {title}
          </h4>
        </div>
      </div>
      <p className={cn('mt-4 whitespace-pre-line text-sm leading-7', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
        {content}
      </p>
    </div>
  );
}

function GroupProfileOverviewPanel({
  group,
  isDarkMode,
  isLeader = false,
  compact = false,
  onOpenProfileConfig,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const emptyLabel = t('groupProfileOverviewPanel.emptyLabel', 'Not configured yet');

  const learningModeLabel = formatGroupLearningMode(group?.learningMode, currentLang) || emptyLabel;
  const completionLabel = formatCompletionState(group?.onboardingCompleted, t);
  const roadmapLabel = formatToggleState(
    group?.roadmapEnabled,
    t,
    t('groupProfileOverviewPanel.toggle.enabled', 'Enabled'),
    t('groupProfileOverviewPanel.toggle.disabled', 'Disabled'),
  );
  const roadmapBadgeLabel = group?.roadmapEnabled
    ? t('groupProfileOverviewPanel.roadmapBadge.on', 'Shared roadmap on')
    : t('groupProfileOverviewPanel.roadmapBadge.off', 'Shared roadmap off');
  const preLearningLabel = formatToggleState(
    group?.preLearningRequired,
    t,
    t('groupProfileOverviewPanel.toggle.required', 'Required'),
    t('groupProfileOverviewPanel.toggle.notRequired', 'Not required'),
  );
  const profileProgressLabel = Number.isFinite(Number(group?.currentStep)) && Number.isFinite(Number(group?.totalSteps))
    ? `${group.currentStep}/${group.totalSteps}`
    : completionLabel;
  const groupGoal = group?.groupLearningGoal || group?.description || emptyLabel;
  const knowledgeScope = group?.knowledge || emptyLabel;
  const groupRules = group?.rules || emptyLabel;

  const heroTitle = t(
    'groupProfileOverviewPanel.hero.title',
    'A quick read of the group baseline before expanding the workspace',
  );
  const heroDescription = t(
    'groupProfileOverviewPanel.hero.description',
    'Everything here reflects the live profile already saved for this group: direction, baseline rules, and the shared learning setup that the team is following.',
  );
  const actionButtonLabel = t('groupProfileOverviewPanel.actionButton', 'Edit');

  const metricCards = useMemo(() => ([
    {
      label: t('groupProfileOverviewPanel.metrics.setupStatus.label', 'Setup status'),
      value: completionLabel,
      description: t('groupProfileOverviewPanel.metrics.setupStatus.description', 'Whether the baseline is ready for the team'),
      icon: Sparkles,
      toneClass: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: t('groupProfileOverviewPanel.metrics.learningMode.label', 'Learning mode'),
      value: learningModeLabel,
      description: t('groupProfileOverviewPanel.metrics.learningMode.description', 'Defines the default rhythm for roadmap and content'),
      icon: BrainCircuit,
      toneClass: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700',
    },
    {
      label: t('groupProfileOverviewPanel.metrics.seatLimit.label', 'Seat limit'),
      value: formatSeatLimit(group?.maxMemberOverride, t),
      description: t('groupProfileOverviewPanel.metrics.seatLimit.description', 'Current capacity available for this group setup'),
      icon: Users,
      toneClass: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    },
  ]), [completionLabel, t, group?.maxMemberOverride, isDarkMode, learningModeLabel]);

  const primaryFields = [
    { label: t('groupProfileOverviewPanel.fields.groupName', 'Group name'), value: group?.groupName || emptyLabel },
    { label: t('groupProfileOverviewPanel.fields.domain', 'Domain'), value: group?.domain || emptyLabel },
    { label: t('groupProfileOverviewPanel.fields.examName', 'Exam name'), value: group?.examName || emptyLabel },
    { label: t('groupProfileOverviewPanel.fields.profileProgress', 'Profile progress'), value: profileProgressLabel },
    { label: t('groupProfileOverviewPanel.fields.sharedRoadmap', 'Shared roadmap'), value: roadmapLabel },
    { label: t('groupProfileOverviewPanel.fields.entryAssessment', 'Entry assessment'), value: preLearningLabel },
  ];

  return (
    <section className={cn(
      'rounded-[30px] border',
      isDarkMode ? 'border-white/10 bg-[#08131a]/92 text-white' : 'border-slate-200 bg-white text-slate-900'
    )}>
      <div className={cn('border-b px-5 py-5 sm:px-6 sm:py-6', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
        <div className={cn(
          'flex flex-col gap-4',
          isLeader && onOpenProfileConfig ? 'sm:flex-row sm:items-start sm:justify-between' : ''
        )}>
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className={cn(
                'mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'
              )}>
                <BookOpenCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.24em]',
                  isDarkMode ? 'text-slate-500' : 'text-slate-500'
                )}>
                  {t('groupProfileOverviewPanel.hero.eyebrow', 'Group profile snapshot')}
                </p>
                <h3 className={cn('mt-2 text-xl font-bold leading-tight sm:text-2xl', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {heroTitle}
                </h3>
                <p className={cn('mt-3 max-w-3xl text-sm leading-7', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {heroDescription}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold',
                    isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  )}>
                    {completionLabel}
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold',
                    isDarkMode ? 'border-violet-400/20 bg-violet-500/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-700'
                  )}>
                    {learningModeLabel}
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold',
                    isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                  )}>
                    {roadmapBadgeLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isLeader && onOpenProfileConfig ? (
            <button
              type="button"
              onClick={onOpenProfileConfig}
              className={cn(
                'inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95',
                isDarkMode
                  ? 'border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.10]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              )}
            >
              <PenSquare className="h-4 w-4" />
              {actionButtonLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className={cn('grid gap-4', compact ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3')}>
          {metricCards.map((item) => (
            <MetricCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              description={item.description}
              toneClass={item.toneClass}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>

        <div className={cn('mt-5 grid gap-4', compact ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]')}>
          <div className="space-y-4">
            <div className={cn(
              'rounded-[26px] border p-5',
              isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
            )}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn('h-4.5 w-4.5', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')} />
                <p className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.18em]',
                  isDarkMode ? 'text-slate-500' : 'text-slate-500'
                )}>
                  {t('groupProfileOverviewPanel.coreSetup.label', 'Core setup')}
                </p>
              </div>
              <p className={cn('mt-3 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {t(
                  'groupProfileOverviewPanel.coreSetup.description',
                  'These values define how the room identifies itself and the shared baseline the team is following.',
                )}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {primaryFields.map((item) => (
                  <InfoField key={item.label} label={item.label} value={item.value} isDarkMode={isDarkMode} />
                ))}
              </div>
            </div>

            <NarrativeCard
              eyebrow={t('groupProfileOverviewPanel.knowledge.eyebrow', 'Knowledge scope')}
              title={t('groupProfileOverviewPanel.knowledge.title', 'What this group is learning together')}
              content={knowledgeScope}
              icon={Compass}
              toneClass={isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}
              isDarkMode={isDarkMode}
            />
          </div>

          <div className="space-y-4">
            <NarrativeCard
              eyebrow={t('groupProfileOverviewPanel.learningGoal.eyebrow', 'Learning goal')}
              title={t('groupProfileOverviewPanel.learningGoal.title', 'What success should look like for the group')}
              content={groupGoal}
              icon={Target}
              toneClass={isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}
              isDarkMode={isDarkMode}
            />

            <NarrativeCard
              eyebrow={t('groupProfileOverviewPanel.groupRules.eyebrow', 'Group rules')}
              title={t('groupProfileOverviewPanel.groupRules.title', 'Shared operating rules for new and current members')}
              content={groupRules}
              icon={Users}
              toneClass={isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700'}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default GroupProfileOverviewPanel;
