import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Route,
  ScrollText,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function readText(value, fallback = '') {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(', ');
    return normalized || fallback;
  }

  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  return fallback;
}

function formatProfileValue(value, fallback) {
  const normalized = readText(value, '');
  return normalized || fallback;
}

function getOverviewTone(tone, isDarkMode) {
  const tones = {
    scope: isDarkMode
      ? {
        section: 'border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,47,73,0.5),rgba(2,6,23,0.84))] ring-1 ring-cyan-400/10',
        field: 'border-cyan-400/18 bg-slate-950/55 ring-1 ring-cyan-400/10',
        label: 'text-cyan-200/80',
      }
      : {
        section: 'border-cyan-200/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] ring-1 ring-cyan-100/80',
        field: 'border-cyan-200/85 bg-white/90 ring-1 ring-cyan-100/80',
        label: 'text-cyan-700/75',
      },
    roadmap: isDarkMode
      ? {
        section: 'border-violet-400/20 bg-[linear-gradient(180deg,rgba(46,16,101,0.42),rgba(2,6,23,0.84))] ring-1 ring-violet-400/10',
        field: 'border-violet-400/18 bg-slate-950/55 ring-1 ring-violet-400/10',
        label: 'text-violet-200/80',
      }
      : {
        section: 'border-violet-200/90 bg-[linear-gradient(180deg,rgba(245,243,255,0.96),rgba(255,255,255,0.98))] ring-1 ring-violet-100/80',
        field: 'border-violet-200/85 bg-white/90 ring-1 ring-violet-100/80',
        label: 'text-violet-700/75',
      },
    personal: isDarkMode
      ? {
        section: 'border-sky-400/20 bg-[linear-gradient(180deg,rgba(12,74,110,0.44),rgba(2,6,23,0.84))] ring-1 ring-sky-400/10',
        field: 'border-sky-400/18 bg-slate-950/55 ring-1 ring-sky-400/10',
        label: 'text-sky-200/80',
      }
      : {
        section: 'border-sky-200/90 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] ring-1 ring-sky-100/80',
        field: 'border-sky-200/85 bg-white/90 ring-1 ring-sky-100/80',
        label: 'text-sky-700/75',
      },
    summary: isDarkMode
      ? {
        section: 'border-emerald-400/20 bg-[linear-gradient(180deg,rgba(6,78,59,0.44),rgba(2,6,23,0.84))] ring-1 ring-emerald-400/10',
        field: 'border-emerald-400/18 bg-slate-950/55 ring-1 ring-emerald-400/10',
        label: 'text-emerald-200/80',
      }
      : {
        section: 'border-emerald-200/90 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] ring-1 ring-emerald-100/80',
        field: 'border-emerald-200/85 bg-white/90 ring-1 ring-emerald-100/80',
        label: 'text-emerald-700/75',
      },
    mock: isDarkMode
      ? {
        section: 'border-amber-400/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.42),rgba(2,6,23,0.84))] ring-1 ring-amber-400/10',
        field: 'border-amber-400/18 bg-slate-950/55 ring-1 ring-amber-400/10',
        label: 'text-amber-200/80',
      }
      : {
        section: 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] ring-1 ring-amber-100/80',
        field: 'border-amber-200/85 bg-white/90 ring-1 ring-amber-100/80',
        label: 'text-amber-700/75',
      },
    neutral: isDarkMode
      ? {
        section: 'border-white/15 bg-white/[0.05] ring-1 ring-white/5',
        field: 'border-white/15 bg-slate-950/50 ring-1 ring-white/5',
        label: 'text-slate-400',
      }
      : {
        section: 'border-slate-300/80 bg-white ring-1 ring-slate-200/70',
        field: 'border-slate-300/85 bg-white ring-1 ring-slate-200/70',
        label: 'text-slate-400',
      },
  };

  return tones[tone] || tones.neutral;
}

function OverviewSection({
  title,
  description,
  icon: Icon,
  iconClassName,
  children,
  isDarkMode,
  tone = 'neutral',
  className,
}) {
  const toneClass = getOverviewTone(tone, isDarkMode);

  return (
    <section
      className={cn(
        'rounded-[28px] border p-5 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.35)] sm:p-6',
        isDarkMode ? 'text-white' : 'text-slate-900',
        toneClass.section,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            iconClassName
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description ? (
            <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-500')}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OverviewField({ label, value, isDarkMode, tone = 'neutral', className }) {
  const toneClass = getOverviewTone(tone, isDarkMode);

  return (
    <div
      className={cn(
        'h-full rounded-[22px] border px-4 py-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)]',
        toneClass.field,
        className
      )}
    >
      <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', toneClass.label)}>{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function OverviewChip({ label, isDarkMode, tone = 'default' }) {
  const toneClassName = {
    default: isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700',
    success: isDarkMode ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-50 text-emerald-700',
    info: isDarkMode ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-50 text-sky-700',
    warning: isDarkMode ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-700',
  }[tone];

  return <span className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', toneClassName)}>{label}</span>;
}

function buildSetupSteps(t, language, profile) {
  const currentStep = Number(profile?.currentStep) || 1;
  const completed = Boolean(profile?.onboardingCompleted || profile?.workspaceSetupStatus === 'DONE');
  const isEnglish = language === 'en';
  const steps = [
    {
      id: 1,
      icon: BookOpen,
      title: translateOrFallback(t, 'workspace.profileOverview.setupSteps.1.title', isEnglish ? 'Learning goal' : 'Mục tiêu học tập'),
      description: translateOrFallback(t, 'workspace.profileConfig.steps.1.description', isEnglish ? 'Set the workspace intent and knowledge focus.' : 'Xác định mục đích workspace và phạm vi kiến thức.'),
    },
    {
      id: 2,
      icon: GraduationCap,
      title: translateOrFallback(t, 'workspace.profileOverview.setupSteps.2.title', isEnglish ? 'Personal profile' : 'Hồ sơ cá nhân'),
      description: translateOrFallback(t, 'workspace.profileConfig.steps.2.description', isEnglish ? 'Complete learner context and AI exam setup.' : 'Hoàn thiện bối cảnh người học và thiết lập AI cho kỳ thi.'),
    },
    {
      id: 3,
      icon: Route,
      title: translateOrFallback(t, 'workspace.profileOverview.setupSteps.3.title', isEnglish ? 'Roadmap configuration' : 'Cấu hình lộ trình'),
      description: translateOrFallback(t, 'workspace.profileConfig.steps.3.description', isEnglish ? 'Finalize roadmap pacing and complete setup.' : 'Chốt nhịp học và hoàn tất thiết lập workspace.'),
    },
  ];

  return steps.map((step) => ({
    ...step,
    state: completed || currentStep > step.id
      ? 'done'
      : currentStep === step.id
        ? 'current'
        : 'upcoming',
  }));
}

function SetupStepCard({ step, isDarkMode }) {
  const Icon = step.icon;
  const toneClassName = step.state === 'done'
    ? (isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50')
    : step.state === 'current'
      ? (isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50')
      : (isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white');
  const badgeClassName = step.state === 'done'
    ? (isDarkMode ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-600 text-white')
    : step.state === 'current'
      ? (isDarkMode ? 'bg-cyan-300 text-slate-950' : 'bg-cyan-600 text-white')
      : (isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700');

  return (
    <div className={cn('rounded-[24px] border p-4 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.35)]', toneClassName)}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', badgeClassName)}>
          {step.state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{step.title}</p>
          <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
            {step.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function IndividualWorkspaceProfileOverviewDialog({
  open,
  onOpenChange,
  isDarkMode,
  profile,
  materials = [],
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const fallbackEmpty = translateOrFallback(t, 'workspace.profileOverview.empty', i18n.language === 'en' ? 'Not configured' : 'Chưa cấu hình');
  const purpose = profile?.workspacePurpose || profile?.learningMode || '';
  const examName = profile?.mockExamName || profile?.examName || '';
  const knowledgeDescription = readText(profile?.knowledgeDescription || profile?.customSchemeDescription, '');
  const roadmapEnabled = purpose === 'STUDY_NEW' ? true : Boolean(profile?.enableRoadmap ?? profile?.roadmapEnabled);
  const setupSteps = buildSetupSteps(t, i18n.language, profile);
  const knowledgeSummary = formatProfileValue(profile?.knowledgeInput || profile?.knowledge || profile?.customKnowledge, fallbackEmpty);
  const domainSummary = formatProfileValue(profile?.inferredDomain || profile?.domain || profile?.customDomain, fallbackEmpty);
  const currentLevelSummary = formatProfileValue(profile?.currentLevel || profile?.customCurrentLevel, fallbackEmpty);
  const learningGoalSummary = formatProfileValue(profile?.learningGoal, fallbackEmpty);
  const daysSummary = profile?.estimatedTotalDays
    ? `${profile.estimatedTotalDays} ${i18n.language === 'en' ? 'days' : 'ngày'}`
    : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt');
  const minutesSummary = (profile?.recommendedMinutesPerDay ?? profile?.estimatedMinutesPerDay)
    ? `${profile?.recommendedMinutesPerDay ?? profile?.estimatedMinutesPerDay} ${i18n.language === 'en' ? 'minutes/day' : 'phút/ngày'}`
    : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt');

  const title = translateOrFallback(
    t,
    'workspace.profileOverview.title',
    i18n.language === 'en' ? 'Workspace profile overview' : 'Tổng quan thiết lập không gian học tập'
  );
  const description = translateOrFallback(
    t,
    'workspace.profileOverview.description',
    i18n.language === 'en'
      ? 'Review what this workspace was configured to learn, how it is scoped, and how roadmap or exam settings were set up.'
      : 'Xem lại workspace này đã được cấu hình để học gì, phạm vi ra sao và roadmap hoặc kỳ thi đã được thiết lập như thế nào.'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          'grid h-[86vh] w-[min(1180px,calc(100vw-16px))] max-w-none grid-rows-[auto,1fr,auto] gap-0 overflow-hidden rounded-[32px] border p-0 shadow-2xl',
          isDarkMode ? 'border-slate-800 bg-[#020817] text-white' : 'border-slate-200 bg-[#f8fbff] text-slate-900',
          fontClass
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-20',
            isDarkMode
              ? 'bg-[linear-gradient(90deg,rgba(56,189,248,0.12),rgba(34,197,94,0.12),rgba(167,139,250,0.10))]'
              : 'bg-[linear-gradient(90deg,rgba(14,165,233,0.10),rgba(34,197,94,0.08),rgba(139,92,246,0.08))]'
          )}
        />

        <DialogHeader className="relative border-b border-inherit px-5 pb-4 pt-4 text-left sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={cn(
                  'mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.04em]',
                  isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                )}
              >
                {translateOrFallback(t, 'workspace.profileOverview.badge', i18n.language === 'en' ? 'PROFILE OVERVIEW' : 'PROFILE OVERVIEW')}
              </div>
              <DialogTitle className="text-[clamp(1.55rem,1.8vw,1.95rem)] font-bold tracking-tight">{title}</DialogTitle>
              <DialogDescription className={cn('mt-2 max-w-4xl text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {description}
              </DialogDescription>

              <div className="mt-4 flex flex-wrap gap-2">
                {purpose ? <OverviewChip isDarkMode={isDarkMode} tone="info" label={t(`workspace.profileConfig.purpose.${purpose}.title`)} /> : null}
                <OverviewChip isDarkMode={isDarkMode} tone="success" label={translateOrFallback(t, 'workspace.profileOverview.done', i18n.language === 'en' ? 'Profile completed' : 'Hồ sơ đã hoàn tất')} />
                {roadmapEnabled ? <OverviewChip isDarkMode={isDarkMode} tone="warning" label={translateOrFallback(t, 'workspace.profileOverview.roadmapEnabled', i18n.language === 'en' ? 'Roadmap enabled' : 'Có Lộ trình')} /> : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all',
                isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
              aria-label={t('workspace.profileConfig.actions.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <section
            className={cn(
              'mb-6 rounded-[28px] border p-5 sm:p-6',
              isDarkMode ? 'border-white/10 bg-white/[0.04] text-white' : 'border-slate-200 bg-white text-slate-900'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                  isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600'
                )}
              >
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {translateOrFallback(t, 'workspace.profileOverview.setupTitle', i18n.language === 'en' ? 'Setup progress' : 'Tiến trình thiết lập')}
                </h3>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {setupSteps.map((step) => (
                <SetupStepCard key={step.id} step={step} isDarkMode={isDarkMode} />
              ))}
            </div>
          </section>

          <div className="grid items-stretch gap-6 xl:grid-cols-2">
            <OverviewSection
              title={translateOrFallback(t, 'workspace.profileOverview.scopeTitle', i18n.language === 'en' ? 'Learning scope' : 'Phạm vi học tập')}
              description={translateOrFallback(t, 'workspace.profileOverview.scopeDescription', i18n.language === 'en' ? 'These values define what this workspace is meant to focus on.' : 'Đây là các giá trị cốt lõi cho biết không gian được thiết kế để tập trung vào điều gì.')}
              icon={BookOpen}
              iconClassName={isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600'}
              isDarkMode={isDarkMode}
              tone="scope"
              className="h-full"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.workspacePurpose', 'Purpose')} value={purpose ? t(`workspace.profileConfig.purpose.${purpose}.title`) : fallbackEmpty} isDarkMode={isDarkMode} tone="scope" />
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.primaryDomain', 'Domain')} value={formatProfileValue(profile?.inferredDomain || profile?.domain || profile?.customDomain, fallbackEmpty)} isDarkMode={isDarkMode} tone="scope" />
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.knowledgeInput', 'Knowledge')} value={knowledgeSummary} isDarkMode={isDarkMode} tone="scope" className={knowledgeDescription ? undefined : 'md:col-span-2'} />
                {knowledgeDescription
                  ? <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.knowledgeDescription', 'Knowledge description')} value={knowledgeDescription} isDarkMode={isDarkMode} tone="scope" className="md:col-span-2" />
                  : null}
              </div>
            </OverviewSection>

            <OverviewSection
              title={translateOrFallback(t, 'workspace.profileOverview.roadmapTitle', i18n.language === 'en' ? 'Roadmap configuration' : 'Cấu hình lộ trình')}
              description={translateOrFallback(t, 'workspace.profileOverview.roadmapDescription', i18n.language === 'en' ? 'These settings define how the workspace was scheduled and paced.' : 'Các thông số này cho biết không gian đã được lên lộ trình và nhịp học như thế nào.')}
              icon={Route}
              iconClassName={isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'}
              isDarkMode={isDarkMode}
              tone="roadmap"
              className="h-full"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.adaptationMode', 'Adaptation mode')} value={profile?.adaptationMode ? t(`workspace.profileConfig.adaptationMode.${profile.adaptationMode === 'STRICT' ? 'BALANCED' : profile.adaptationMode}.title`) : (roadmapEnabled ? fallbackEmpty : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt'))} isDarkMode={isDarkMode} tone="roadmap" />
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.roadmapSpeedMode', 'Roadmap speed')} value={profile?.roadmapSpeedMode || profile?.speedMode ? t(`workspace.profileConfig.roadmapSpeedMode.${profile?.roadmapSpeedMode || (profile?.speedMode === 'MEDIUM' ? 'STANDARD' : profile?.speedMode)}.title`) : (roadmapEnabled ? fallbackEmpty : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt'))} isDarkMode={isDarkMode} tone="roadmap" />
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.estimatedTotalDays', 'Estimated total days')} value={daysSummary} isDarkMode={isDarkMode} tone="roadmap" />
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.recommendedMinutesPerDay', 'Recommended minutes per day')} value={minutesSummary} isDarkMode={isDarkMode} tone="roadmap" />
              </div>
            </OverviewSection>

            <OverviewSection
              title={translateOrFallback(t, 'workspace.profileOverview.personalTitle', i18n.language === 'en' ? 'Your context' : 'Bối cảnh của bạn')}
              description={translateOrFallback(t, 'workspace.profileOverview.personalDescription', i18n.language === 'en' ? 'This is your learner profile used to personalize roadmap, review, or mock-test flows.' : 'Đây là hồ sơ của bạn mà hệ thống dùng để cá nhân hóa lộ trình, ôn tập hoặc mock test.')}
              icon={GraduationCap}
              iconClassName={isDarkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'}
              isDarkMode={isDarkMode}
              tone="personal"
              className="h-full"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.currentLevel', 'Current level')} value={currentLevelSummary} isDarkMode={isDarkMode} tone="personal" />
                <OverviewField label={translateOrFallback(t, `workspace.profileConfig.fields.learningGoalByPurpose.${purpose}`, translateOrFallback(t, 'workspace.profileConfig.fields.learningGoal', 'Learning goal'))} value={formatProfileValue(profile?.learningGoal, fallbackEmpty)} isDarkMode={isDarkMode} tone="personal" />
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.strongAreas', 'Strengths')} value={formatProfileValue(profile?.strongAreas, fallbackEmpty)} isDarkMode={isDarkMode} tone="personal" />
                <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.weakAreas', 'Weaknesses')} value={formatProfileValue(profile?.weakAreas, fallbackEmpty)} isDarkMode={isDarkMode} tone="personal" />
              </div>
            </OverviewSection>

            <OverviewSection
              title={translateOrFallback(t, 'workspace.profileOverview.learningSummaryTitle', i18n.language === 'en' ? 'Learning workspace summary' : 'Tóm tắt không gian học tập')}
              description={translateOrFallback(t, 'workspace.profileOverview.learningSummaryDescription', i18n.language === 'en' ? 'A quick snapshot of the key profile and roadmap settings currently applied.' : 'Nhìn nhanh các thông tin cốt lõi của hồ sơ và cấu hình đang được áp dụng.')}
              icon={CheckCircle2}
              iconClassName={isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}
              isDarkMode={isDarkMode}
              tone="summary"
              className="h-full"
            >
              <div className="space-y-4">
                <OverviewField
                  label={translateOrFallback(
                    t,
                    `workspace.profileConfig.fields.learningGoalByPurpose.${purpose}`,
                    translateOrFallback(t, 'workspace.profileConfig.fields.learningGoal', i18n.language === 'en' ? 'Learning goal' : 'Mục tiêu học tập')
                  )}
                  value={learningGoalSummary}
                  isDarkMode={isDarkMode}
                  tone="summary"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <OverviewField
                    label={translateOrFallback(t, 'workspace.profileOverview.summaryFocusLabel', i18n.language === 'en' ? 'Main focus' : 'Trọng tâm chính')}
                    value={`${domainSummary} • ${knowledgeSummary}`}
                    isDarkMode={isDarkMode}
                    tone="summary"
                  />
                  <OverviewField
                    label={translateOrFallback(t, 'workspace.profileOverview.summaryPaceLabel', i18n.language === 'en' ? 'Learning pace' : 'Nhịp học')}
                    value={`${daysSummary} • ${minutesSummary}`}
                    isDarkMode={isDarkMode}
                    tone="summary"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {purpose ? <OverviewChip isDarkMode={isDarkMode} tone="info" label={t(`workspace.profileConfig.purpose.${purpose}.title`)} /> : null}
                  {currentLevelSummary !== fallbackEmpty ? <OverviewChip isDarkMode={isDarkMode} label={currentLevelSummary} /> : null}
                  {materials.length > 0
                    ? <OverviewChip isDarkMode={isDarkMode} tone="warning" label={`${materials.length} ${i18n.language === 'en' ? 'materials' : 'tài liệu'}`} />
                    : null}
                  <OverviewChip isDarkMode={isDarkMode} tone="success" label={translateOrFallback(t, 'workspace.profileOverview.ready', i18n.language === 'en' ? 'Ready to use' : 'Sẵn sàng sử dụng')} />
                </div>
              </div>
            </OverviewSection>

            {purpose === 'MOCK_TEST' ? (
              <OverviewSection
                title={translateOrFallback(t, 'workspace.profileOverview.mockTitle', i18n.language === 'en' ? 'Mock-test setup' : 'Thiết lập mock test')}
                description={translateOrFallback(t, 'workspace.profileOverview.mockDescription', i18n.language === 'en' ? 'This workspace was configured with a target exam and template preferences.' : 'Workspace này đã được cấu hình với kỳ thi mục tiêu và các thiết lập template tương ứng.')}
                icon={ScrollText}
                iconClassName={isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600'}
                isDarkMode={isDarkMode}
                tone="mock"
                className="xl:col-span-2"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.mockExamMode', 'Exam type')} value={profile?.mockExamMode ? t(`workspace.profileConfig.mockExamMode.${profile.mockExamMode}`) : fallbackEmpty} isDarkMode={isDarkMode} tone="mock" />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.examName', i18n.language === 'en' ? 'Exam name' : 'Tên kỳ thi')} value={formatProfileValue(examName, fallbackEmpty)} isDarkMode={isDarkMode} tone="mock" />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.templateFormat', 'Template format')} value={profile?.templateFormat ? t(`workspace.profileConfig.templateFormat.${profile.templateFormat}`) : fallbackEmpty} isDarkMode={isDarkMode} tone="mock" />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.templateVolume', i18n.language === 'en' ? 'Template volume' : 'Khối lượng template')} value={
                    profile?.templateDurationMinutes || profile?.templateQuestionCount
                      ? `${profile?.templateDurationMinutes || 0} phút • ${profile?.templateQuestionCount || 0} câu`
                      : fallbackEmpty
                  } isDarkMode={isDarkMode} tone="mock" />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.templatePrompt', 'Template prompt')} value={formatProfileValue(profile?.templatePrompt, fallbackEmpty)} isDarkMode={isDarkMode} tone="mock" className="md:col-span-2 xl:col-span-1" />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.templateNotes', 'Template notes')} value={formatProfileValue(profile?.templateNotes, fallbackEmpty)} isDarkMode={isDarkMode} tone="mock" className="md:col-span-2 xl:col-span-2" />
                </div>
              </OverviewSection>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'flex items-center justify-end border-t px-5 py-4 sm:px-6',
            isDarkMode ? 'border-slate-800 bg-[#020817]/90' : 'border-slate-200 bg-white/90'
          )}
        >
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-cyan-600 px-6 text-white hover:bg-cyan-700"
          >
            {t('workspace.profileConfig.actions.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default IndividualWorkspaceProfileOverviewDialog;
