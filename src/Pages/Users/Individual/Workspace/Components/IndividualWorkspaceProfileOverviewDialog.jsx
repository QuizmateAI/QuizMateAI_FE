import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  FileStack,
  GraduationCap,
  Layers3,
  Route,
  ScrollText,
  ShieldCheck,
  Target,
  TimerReset,
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
import { getPublicExamById } from './WorkspaceProfileWizard/mockProfileWizardData';

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

function OverviewSection({ title, description, icon: Icon, iconClassName, children, isDarkMode }) {
  return (
    <section
      className={cn(
        'rounded-[28px] border p-5 sm:p-6',
        isDarkMode ? 'border-white/10 bg-white/[0.04] text-white' : 'border-slate-200 bg-white text-slate-900'
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
          {description ? <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OverviewField({ label, value, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-[22px] border px-4 py-4',
        isDarkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
      )}
    >
      <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>{label}</p>
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

function countMaterialsByStatus(materials, statuses) {
  return materials.filter((item) => statuses.includes((item?.status || '').toUpperCase())).length;
}

function buildSetupSteps(t, language, profile) {
  const currentStep = Number(profile?.currentStep) || 1;
  const completed = Boolean(profile?.onboardingCompleted || profile?.workspaceSetupStatus === 'DONE');
  const isEnglish = language === 'en';
  const steps = [
    {
      id: 1,
      icon: BookOpen,
      title: translateOrFallback(t, 'workspace.profileConfig.steps.1.title', isEnglish ? 'Step 1' : 'Bước 1'),
      description: translateOrFallback(t, 'workspace.profileConfig.steps.1.description', isEnglish ? 'Set the workspace intent and knowledge focus.' : 'Xác định mục đích workspace và phạm vi kiến thức.'),
    },
    {
      id: 2,
      icon: GraduationCap,
      title: translateOrFallback(t, 'workspace.profileConfig.steps.2.title', isEnglish ? 'Step 2' : 'Bước 2'),
      description: translateOrFallback(t, 'workspace.profileConfig.steps.2.description', isEnglish ? 'Complete learner context and AI exam setup.' : 'Hoàn thiện bối cảnh người học và thiết lập AI cho kỳ thi.'),
    },
    {
      id: 3,
      icon: Route,
      title: translateOrFallback(t, 'workspace.profileConfig.steps.3.title', isEnglish ? 'Step 3' : 'Bước 3'),
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
    <div className={cn('rounded-[24px] border p-4', toneClassName)}>
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
  const selectedExam = getPublicExamById(profile?.mockExamCatalogId);
  const examName = profile?.mockExamName || profile?.examName || selectedExam?.name || '';
  const roadmapEnabled = purpose === 'STUDY_NEW' ? true : Boolean(profile?.enableRoadmap ?? profile?.roadmapEnabled);
  const setupSteps = buildSetupSteps(t, i18n.language, profile);
  const onboardingCompleted = Boolean(profile?.onboardingCompleted || profile?.workspaceSetupStatus === 'DONE');
  const processingMaterials = countMaterialsByStatus(materials, ['PROCESSING', 'UPLOADING', 'PENDING', 'QUEUED']);
  const activeMaterials = countMaterialsByStatus(materials, ['ACTIVE', 'WARN', 'WARNED', 'REJECT', 'REJECTED', 'ERROR']);

  const title = translateOrFallback(
    t,
    'workspace.profileOverview.title',
    i18n.language === 'en' ? 'Workspace profile overview' : 'Tổng quan thiết lập workspace'
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
                <OverviewChip isDarkMode={isDarkMode} tone="success" label={translateOrFallback(t, 'workspace.profileOverview.done', i18n.language === 'en' ? 'Profile completed' : 'Profile đã hoàn tất')} />
                {roadmapEnabled ? <OverviewChip isDarkMode={isDarkMode} tone="warning" label={translateOrFallback(t, 'workspace.profileOverview.roadmapEnabled', i18n.language === 'en' ? 'Roadmap enabled' : 'Có roadmap')} /> : null}
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
                <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                  {translateOrFallback(
                    t,
                    'workspace.profileOverview.setupDescription',
                    i18n.language === 'en'
                      ? 'Backend and frontend now follow the same 4-step onboarding state for this workspace.'
                      : 'Backend và frontend đang dùng cùng một tiến trình 4 bước cho workspace này.'
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <OverviewChip
                    isDarkMode={isDarkMode}
                    tone={onboardingCompleted ? 'success' : 'warning'}
                    label={onboardingCompleted
                      ? (i18n.language === 'en' ? 'Completed' : 'Đã hoàn tất')
                      : (i18n.language === 'en' ? `Current step ${Math.min(Number(profile?.currentStep) || 1, 4)}/4` : `Đang ở bước ${Math.min(Number(profile?.currentStep) || 1, 4)}/4`)}
                  />
                  <OverviewChip isDarkMode={isDarkMode} label={profile?.workspaceSetupStatus || 'CREATED'} />
                  <OverviewChip isDarkMode={isDarkMode} label={profile?.profileStatus || 'IN_PROGRESS'} />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {setupSteps.map((step) => (
                <SetupStepCard key={step.id} step={step} isDarkMode={isDarkMode} />
              ))}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-6">
              <OverviewSection
                title={translateOrFallback(t, 'workspace.profileOverview.scopeTitle', i18n.language === 'en' ? 'Learning scope' : 'Phạm vi học tập')}
                description={translateOrFallback(t, 'workspace.profileOverview.scopeDescription', i18n.language === 'en' ? 'These values define what this workspace is meant to focus on.' : 'Đây là các giá trị cốt lõi cho biết workspace này được thiết kế để tập trung vào điều gì.')}
                icon={BookOpen}
                iconClassName={isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600'}
                isDarkMode={isDarkMode}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.workspacePurpose', 'Purpose')} value={purpose ? t(`workspace.profileConfig.purpose.${purpose}.title`) : fallbackEmpty} isDarkMode={isDarkMode} />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.primaryDomain', 'Domain')} value={formatProfileValue(profile?.inferredDomain || profile?.domain || profile?.customDomain, fallbackEmpty)} isDarkMode={isDarkMode} />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.knowledgeInput', 'Knowledge')} value={formatProfileValue(profile?.knowledgeInput || profile?.knowledge || profile?.customKnowledge, fallbackEmpty)} isDarkMode={isDarkMode} />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.knowledgeDescription', 'Knowledge description')} value={formatProfileValue(profile?.knowledgeDescription || profile?.customSchemeDescription, fallbackEmpty)} isDarkMode={isDarkMode} />
                </div>
              </OverviewSection>

              <OverviewSection
                title={translateOrFallback(t, 'workspace.profileOverview.personalTitle', i18n.language === 'en' ? 'Learner context' : 'Bối cảnh người học')}
                description={translateOrFallback(t, 'workspace.profileOverview.personalDescription', i18n.language === 'en' ? 'This is the learner profile used to personalize roadmap, review, or mock-test flows.' : 'Đây là hồ sơ người học mà hệ thống dùng để cá nhân hóa roadmap, ôn tập hoặc mock test.')}
                icon={GraduationCap}
                iconClassName={isDarkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'}
                isDarkMode={isDarkMode}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.currentLevel', 'Current level')} value={formatProfileValue(profile?.currentLevel || profile?.customCurrentLevel, fallbackEmpty)} isDarkMode={isDarkMode} />
                  <OverviewField label={translateOrFallback(t, `workspace.profileConfig.fields.learningGoalByPurpose.${purpose}`, translateOrFallback(t, 'workspace.profileConfig.fields.learningGoal', 'Learning goal'))} value={formatProfileValue(profile?.learningGoal, fallbackEmpty)} isDarkMode={isDarkMode} />
                  {(purpose === 'REVIEW' || purpose === 'MOCK_TEST') ? <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.strongAreas', 'Strengths')} value={formatProfileValue(profile?.strongAreas, fallbackEmpty)} isDarkMode={isDarkMode} /> : null}
                  {(purpose === 'REVIEW' || purpose === 'MOCK_TEST') ? <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.weakAreas', 'Weaknesses')} value={formatProfileValue(profile?.weakAreas, fallbackEmpty)} isDarkMode={isDarkMode} /> : null}
                </div>
              </OverviewSection>

              {purpose === 'MOCK_TEST' ? (
                <OverviewSection
                  title={translateOrFallback(t, 'workspace.profileOverview.mockTitle', i18n.language === 'en' ? 'Mock-test setup' : 'Thiết lập mock test')}
                  description={translateOrFallback(t, 'workspace.profileOverview.mockDescription', i18n.language === 'en' ? 'This workspace was configured with a target exam and template preferences.' : 'Workspace này đã được cấu hình với kỳ thi mục tiêu và các thiết lập template tương ứng.')}
                  icon={ScrollText}
                  iconClassName={isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}
                  isDarkMode={isDarkMode}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.mockExamMode', 'Exam type')} value={profile?.mockExamMode ? t(`workspace.profileConfig.mockExamMode.${profile.mockExamMode}`) : fallbackEmpty} isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.examName', i18n.language === 'en' ? 'Exam name' : 'Tên kỳ thi')} value={formatProfileValue(examName, fallbackEmpty)} isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.templateFormat', 'Template format')} value={profile?.templateFormat ? t(`workspace.profileConfig.templateFormat.${profile.templateFormat}`) : fallbackEmpty} isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.templateVolume', i18n.language === 'en' ? 'Template volume' : 'Khối lượng template')} value={
                      profile?.templateDurationMinutes || profile?.templateQuestionCount
                        ? `${profile?.templateDurationMinutes || 0} phút • ${profile?.templateQuestionCount || 0} câu`
                        : fallbackEmpty
                    } isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.templatePrompt', 'Template prompt')} value={formatProfileValue(profile?.templatePrompt, fallbackEmpty)} isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.templateNotes', 'Template notes')} value={formatProfileValue(profile?.templateNotes, fallbackEmpty)} isDarkMode={isDarkMode} />
                  </div>
                </OverviewSection>
              ) : null}
            </div>

            <div className="space-y-6">
              <OverviewSection
                title={translateOrFallback(t, 'workspace.profileOverview.roadmapTitle', i18n.language === 'en' ? 'Roadmap configuration' : 'Cấu hình roadmap')}
                description={translateOrFallback(t, 'workspace.profileOverview.roadmapDescription', i18n.language === 'en' ? 'These settings define how the workspace was scheduled and paced.' : 'Các thông số này cho biết workspace đã được lên lộ trình và nhịp học như thế nào.')}
                icon={Route}
                iconClassName={isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'}
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.adaptationMode', 'Adaptation mode')} value={profile?.adaptationMode ? t(`workspace.profileConfig.adaptationMode.${profile.adaptationMode === 'STRICT' ? 'BALANCED' : profile.adaptationMode}.title`) : (roadmapEnabled ? fallbackEmpty : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt'))} isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.roadmapSpeedMode', 'Roadmap speed')} value={profile?.roadmapSpeedMode || profile?.speedMode ? t(`workspace.profileConfig.roadmapSpeedMode.${profile?.roadmapSpeedMode || (profile?.speedMode === 'MEDIUM' ? 'STANDARD' : profile?.speedMode)}.title`) : (roadmapEnabled ? fallbackEmpty : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt'))} isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.estimatedTotalDays', 'Estimated total days')} value={profile?.estimatedTotalDays ? `${profile.estimatedTotalDays} ${i18n.language === 'en' ? 'days' : 'ngày'}` : (roadmapEnabled ? fallbackEmpty : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt'))} isDarkMode={isDarkMode} />
                    <OverviewField label={translateOrFallback(t, 'workspace.profileConfig.fields.recommendedMinutesPerDay', 'Recommended minutes per day')} value={(profile?.recommendedMinutesPerDay ?? profile?.estimatedMinutesPerDay) ? `${profile?.recommendedMinutesPerDay ?? profile?.estimatedMinutesPerDay} ${i18n.language === 'en' ? 'minutes/day' : 'phút/ngày'}` : (roadmapEnabled ? fallbackEmpty : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabled', i18n.language === 'en' ? 'Disabled' : 'Đang tắt'))} isDarkMode={isDarkMode} />
                  </div>

                  <div
                    className={cn(
                      'rounded-[22px] border p-4',
                      isDarkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <ShieldCheck className={cn('mt-0.5 h-5 w-5 shrink-0', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{translateOrFallback(t, 'workspace.profileOverview.roadmapState', i18n.language === 'en' ? 'Roadmap state' : 'Trạng thái roadmap')}</p>
                        <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                          {roadmapEnabled
                            ? translateOrFallback(t, 'workspace.profileOverview.roadmapEnabledDescription', i18n.language === 'en' ? 'This workspace was configured to run with a roadmap.' : 'Workspace này đã được cấu hình để chạy cùng roadmap.')
                            : translateOrFallback(t, 'workspace.profileOverview.roadmapDisabledDescription', i18n.language === 'en' ? 'This workspace was set up without a roadmap.' : 'Workspace này được thiết lập mà không bật roadmap.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </OverviewSection>

              <OverviewSection
                title={translateOrFallback(t, 'workspace.profileOverview.materialTitle', i18n.language === 'en' ? 'Material status' : 'Trạng thái tài liệu')}
                description={translateOrFallback(t, 'workspace.profileOverview.materialDescription', i18n.language === 'en' ? 'A quick view of how many materials are already attached to this workspace.' : 'Tóm tắt số lượng tài liệu hiện đã được gắn vào workspace này.')}
                icon={FileStack}
                iconClassName={isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600'}
                isDarkMode={isDarkMode}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.materialTotal', i18n.language === 'en' ? 'Total materials' : 'Tổng tài liệu')} value={`${materials.length}`} isDarkMode={isDarkMode} />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.materialActive', i18n.language === 'en' ? 'Processed or reviewed' : 'Đã xử lý hoặc đã duyệt')} value={`${activeMaterials}`} isDarkMode={isDarkMode} />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.materialProcessing', i18n.language === 'en' ? 'Still processing' : 'Đang xử lý')} value={`${processingMaterials}`} isDarkMode={isDarkMode} />
                  <OverviewField label={translateOrFallback(t, 'workspace.profileOverview.materialPreview', i18n.language === 'en' ? 'Recent materials' : 'Tài liệu gần đây')} value={materials.length > 0 ? materials.slice(0, 3).map((item) => item.name).join(', ') : fallbackEmpty} isDarkMode={isDarkMode} />
                </div>
              </OverviewSection>

              <section
                className={cn(
                  'overflow-hidden rounded-[28px] border',
                  isDarkMode ? 'border-cyan-400/20 bg-slate-950/70 text-white' : 'border-cyan-200 bg-cyan-50/70 text-slate-900'
                )}
              >
                <div
                  className={cn(
                    'p-5 sm:p-6',
                    isDarkMode
                      ? 'bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.22),_transparent_40%),linear-gradient(135deg,rgba(8,47,73,0.9),rgba(15,23,42,0.88))]'
                      : 'bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(135deg,rgba(240,249,255,1),rgba(236,254,255,0.72))]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Target className={cn('mt-0.5 h-5 w-5 shrink-0', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{translateOrFallback(t, 'workspace.profileOverview.summaryTitle', i18n.language === 'en' ? 'Workspace summary' : 'Tóm tắt workspace')}</p>
                      <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                        {purpose === 'MOCK_TEST'
                          ? translateOrFallback(t, 'workspace.profileOverview.summaryMock', i18n.language === 'en' ? 'This workspace is tuned for mock-test practice with exam-specific setup and materials.' : 'Workspace này được tinh chỉnh cho việc luyện mock test với cấu hình kỳ thi và tài liệu tương ứng.')
                          : purpose === 'REVIEW'
                            ? translateOrFallback(t, 'workspace.profileOverview.summaryReview', i18n.language === 'en' ? 'This workspace focuses on review, remediation, and reinforcement of the learner profile above.' : 'Workspace này tập trung vào việc ôn tập, vá lỗ hổng và củng cố theo hồ sơ người học ở trên.')
                            : translateOrFallback(t, 'workspace.profileOverview.summaryStudyNew', i18n.language === 'en' ? 'This workspace is scoped to learn a new topic from the chosen knowledge and domain.' : 'Workspace này được thiết kế để học một chủ đề mới từ knowledge và lĩnh vực đã chọn.')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {formatProfileValue(profile?.knowledgeInput || profile?.knowledge || profile?.customKnowledge, '').split(', ').filter(Boolean).slice(0, 1).map((item) => (
                      <OverviewChip key={item} isDarkMode={isDarkMode} label={item} />
                    ))}
                    {profile?.currentLevel ? <OverviewChip isDarkMode={isDarkMode} label={profile.currentLevel} tone="info" /> : null}
                    {profile?.estimatedTotalDays ? <OverviewChip isDarkMode={isDarkMode} label={<><Clock3 className="mr-1 inline h-3 w-3" />{profile.estimatedTotalDays} {i18n.language === 'en' ? 'days' : 'ngày'}</>} /> : null}
                    {(profile?.recommendedMinutesPerDay ?? profile?.estimatedMinutesPerDay) ? <OverviewChip isDarkMode={isDarkMode} label={<><TimerReset className="mr-1 inline h-3 w-3" />{profile?.recommendedMinutesPerDay ?? profile?.estimatedMinutesPerDay} {i18n.language === 'en' ? 'min/day' : 'phút/ngày'}</>} /> : null}
                    {materials.length > 0 ? <OverviewChip isDarkMode={isDarkMode} label={<><Layers3 className="mr-1 inline h-3 w-3" />{materials.length} {i18n.language === 'en' ? 'materials' : 'tài liệu'}</>} tone="warning" /> : null}
                    <OverviewChip isDarkMode={isDarkMode} label={<><CheckCircle2 className="mr-1 inline h-3 w-3" />{translateOrFallback(t, 'workspace.profileOverview.ready', i18n.language === 'en' ? 'Ready to use' : 'Sẵn sàng sử dụng')}</>} tone="success" />
                  </div>
                </div>
              </section>
            </div>
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
