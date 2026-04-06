import { useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  FolderKanban,
  Info,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import ListSpinner from '@/Components/ui/ListSpinner';
import { cn } from '@/lib/utils';

const PREVIEW_LIMIT = 4;

function normalizeText(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  const normalized = trimmed.toLowerCase();
  if (
    !trimmed
    || normalized === 'null'
    || normalized === 'undefined'
    || normalized === 'description null'
    || normalized === 'description undefined'
  ) {
    return '';
  }
  return trimmed;
}

function formatEnumLabel(value) {
  if (value == null || value === '') return '-';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWorkspaceTitle(workspace, t) {
  return normalizeText(workspace?.displayTitle)
    || normalizeText(workspace?.title)
    || normalizeText(workspace?.name)
    || t('home.workspace.untitledTitle');
}

function getStatusBadgeClass(status, isDarkMode) {
  const normalizedStatus = String(status || '').toUpperCase();

  if (normalizedStatus === 'ACTIVE' || normalizedStatus === 'DONE' || normalizedStatus === 'COMPLETED') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:border-emerald-400/40 hover:bg-emerald-500/20'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100';
  }

  if (normalizedStatus === 'INACTIVE' || normalizedStatus === 'PROFILE_DONE' || normalizedStatus === 'PROCESSING') {
    return isDarkMode
      ? 'border-amber-500/30 bg-amber-500/15 text-amber-200 hover:border-amber-400/40 hover:bg-amber-500/20'
      : 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100';
  }

  if (normalizedStatus === 'DELETED' || normalizedStatus === 'FAILED' || normalizedStatus === 'ERROR') {
    return isDarkMode
      ? 'border-rose-500/30 bg-rose-500/15 text-rose-200 hover:border-rose-400/40 hover:bg-rose-500/20'
      : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100';
  }

  return isDarkMode
    ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
    : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200/80';
}

function getSoftBadgeClass(tone, isDarkMode) {
  if (tone === 'blue') {
    return isDarkMode
      ? 'border-sky-500/20 bg-sky-500/10 text-sky-200 hover:border-sky-400/30 hover:bg-sky-500/18'
      : 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100';
  }

  if (tone === 'purple') {
    return isDarkMode
      ? 'border-violet-500/20 bg-violet-500/10 text-violet-200 hover:border-violet-400/30 hover:bg-violet-500/18'
      : 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100';
  }

  if (tone === 'orange') {
    return isDarkMode
      ? 'border-orange-500/20 bg-orange-500/10 text-orange-200 hover:border-orange-400/30 hover:bg-orange-500/18'
      : 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100';
  }

  return isDarkMode
    ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
    : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200/80';
}

function getCountValue(value) {
  if (Number.isFinite(Number(value))) return String(Number(value));
  return '--';
}

function resolveProfileStatus(snapshot, t) {
  if (!snapshot || snapshot?.isLoading || (!snapshot?.loaded && !snapshot?.profile)) return '--';

  const profile = snapshot?.profile;
  if (!profile) return t('userDetail.notStarted');
  if (profile.onboardingCompleted) return t('userDetail.completed');
  if (profile.workspaceSetupStatus) return formatEnumLabel(profile.workspaceSetupStatus);
  return t('userDetail.inProgress');
}

function resolvePurposeLabel(profile, t) {
  const purpose = profile?.workspacePurpose || profile?.learningMode || '';
  if (!purpose) return '-';
  const translated = t(`workspace.profileConfig.purpose.${purpose}.title`);
  return translated === `workspace.profileConfig.purpose.${purpose}.title`
    ? formatEnumLabel(purpose)
    : translated;
}

function resolveQuestionCount(quiz) {
  const totalQuestions = Number(
    quiz?.totalQuestion
    ?? quiz?.questionCount
    ?? quiz?.totalQuestions
    ?? quiz?.questions?.length
    ?? 0
  );
  return Number.isFinite(totalQuestions) ? totalQuestions : 0;
}

function resolveMaterialCount(workspace, snapshot) {
  if (snapshot?.loaded) return snapshot.materials.length;
  const profileCount = Number(snapshot?.profile?.materialCount);
  if (Number.isFinite(profileCount) && profileCount >= 0) return profileCount;
  const workspaceCount = Number(workspace?.materialCount);
  if (Number.isFinite(workspaceCount) && workspaceCount >= 0) return workspaceCount;
  return null;
}

function resolveRoadmapCount(snapshot) {
  if (snapshot?.loaded) return snapshot.roadmaps.length;
  return null;
}

function resolveQuizCount(snapshot) {
  if (snapshot?.loaded) return snapshot.quizzes.length;
  return null;
}

function buildProfileFields(snapshot, t) {
  const profile = snapshot?.profile;
  if (!profile) return [];

  return [
    { label: t('userDetail.purpose'), value: resolvePurposeLabel(profile, t) },
    { label: t('userDetail.domain'), value: profile?.inferredDomain || profile?.domain || '' },
    { label: t('userDetail.knowledge'), value: profile?.knowledgeInput || profile?.knowledge || '' },
    { label: t('userDetail.currentLevel'), value: profile?.currentLevel || '' },
    { label: t('userDetail.learningGoal'), value: profile?.learningGoal || profile?.groupLearningGoal || '' },
    { label: t('userDetail.adaptationMode'), value: formatEnumLabel(profile?.adaptationMode) },
    { label: t('userDetail.roadmapSpeedMode'), value: formatEnumLabel(profile?.roadmapSpeedMode || profile?.speedMode) },
    {
      label: t('userDetail.setupProgress'),
      value: profile?.totalSteps
        ? `${Number(profile?.currentStep) || 0}/${Number(profile?.totalSteps) || 0}`
        : resolveProfileStatus(profile, t),
    },
    { label: t('userDetail.mockExamName'), value: profile?.mockExamName || profile?.examName || '' },
  ].filter((field) => field.value && field.value !== '-');
}

function SummaryPill({ icon: Icon, label, value, tone = 'neutral', isDarkMode }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
        getSoftBadgeClass(tone, isDarkMode)
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accentClass, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        isDarkMode ? 'border-slate-700/80 bg-slate-900/70' : 'border-white/80 bg-white/90'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={cn('text-xs font-medium uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
          {label}
        </p>
        <div className={cn('rounded-full p-2', accentClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={cn('mt-3 text-lg font-semibold leading-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
        {value}
      </p>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children, isDarkMode }) {
  return (
    <section
      className={cn(
        'rounded-[26px] border p-4',
        isDarkMode ? 'border-slate-700/80 bg-slate-900/70' : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'rounded-2xl p-2.5',
          isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-sky-50 text-sky-700'
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {title}
          </h4>
          <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptySection({ text, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed px-4 py-6 text-center text-sm',
        isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
      )}
    >
      {text}
    </div>
  );
}

function ItemMeta({ icon: Icon, text, isDarkMode }) {
  if (!text || text === '-') return null;

  return (
    <div className={cn('inline-flex items-center gap-1.5 text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
      <Icon className="h-3.5 w-3.5" />
      <span>{text}</span>
    </div>
  );
}

function MoreItemsHint({ count, t, isDarkMode }) {
  if (count <= 0) return null;

  return (
    <p className={cn('px-1 text-xs font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
      {t('userDetail.moreItems', { count })}
    </p>
  );
}

function WorkspacePreviewItem({
  title,
  description,
  badges,
  timestamp,
  isDarkMode,
}) {
  return (
    <div
      className={cn(
        'group rounded-2xl border p-4 transition-all duration-200',
        isDarkMode
          ? 'border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-900/85'
          : 'border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-[linear-gradient(180deg,_#fbfdff,_#f2f7ff)] hover:shadow-[0_18px_40px_-32px_rgba(37,99,235,0.28)]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('truncate text-sm font-semibold transition-colors', isDarkMode ? 'text-white group-hover:text-sky-100' : 'text-slate-900 group-hover:text-sky-800')}>
            {title}
          </p>
          {badges?.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {badges}
            </div>
          ) : null}
          {description ? (
            <p className={cn('mt-2 line-clamp-2 text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
              {description}
            </p>
          ) : null}
        </div>
          <div className={cn('transition-colors', isDarkMode ? 'group-hover:text-slate-300' : 'group-hover:text-sky-700')}>
            <ItemMeta icon={Clock3} text={timestamp} isDarkMode={isDarkMode} />
          </div>
      </div>
    </div>
  );
}

function UserWorkspaceExplorer({
  workspaces,
  workspaceSnapshots,
  expandedWorkspace,
  onToggleWorkspace,
  onRetryWorkspaceSnapshot,
  isDarkMode,
  t,
  formatDate,
}) {
  const overviewStats = useMemo(() => {
    const total = workspaces.length;
    const active = workspaces.filter((workspace) => String(workspace?.status || '').toUpperCase() === 'ACTIVE').length;
    const inspected = Object.values(workspaceSnapshots || {}).filter((snapshot) => snapshot?.loaded).length;

    return { total, active, inspected };
  }, [workspaceSnapshots, workspaces]);

  return (
    <div className="space-y-5">
      <section
        className={cn(
          'overflow-hidden rounded-[28px] border p-5',
          isDarkMode
            ? 'border-slate-700 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_38%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(30,41,59,0.92))]'
            : 'border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.18),_transparent_35%),linear-gradient(135deg,_#f8fbff,_#eef5ff)]'
        )}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.3em]', isDarkMode ? 'text-sky-200/80' : 'text-sky-700')}>
              {t('userDetail.workspaceExplorerTitle')}
            </p>
            <h3 className={cn('mt-2 text-2xl font-semibold tracking-[-0.03em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
              {t('userDetail.workspaceExplorerHeading')}
            </h3>
            <p className={cn('mt-3 max-w-2xl text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              {t('userDetail.workspaceExplorerDesc')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <MetricCard
              icon={FolderKanban}
              label={t('userDetail.workspacesCount')}
              value={getCountValue(overviewStats.total)}
              accentClass={isDarkMode ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-700'}
              isDarkMode={isDarkMode}
            />
            <MetricCard
              icon={ShieldCheck}
              label={t('userDetail.activeWorkspaceCount')}
              value={getCountValue(overviewStats.active)}
              accentClass={isDarkMode ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}
              isDarkMode={isDarkMode}
            />
            <MetricCard
              icon={Info}
              label={t('userDetail.inspectedWorkspaceCount')}
              value={getCountValue(overviewStats.inspected)}
              accentClass={isDarkMode ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </section>

      {workspaces.length === 0 ? (
        <p className="py-8 text-center text-slate-400">{t('userDetail.noWorkspaces')}</p>
      ) : (
        workspaces.map((workspace) => {
          const workspaceKey = String(workspace?.workspaceId);
          const snapshot = workspaceSnapshots?.[workspaceKey];
          const isExpanded = String(expandedWorkspace) === workspaceKey;
          const title = getWorkspaceTitle(workspace, t);
          const description = normalizeText(snapshot?.meta?.description)
            || normalizeText(workspace?.description)
            || normalizeText(snapshot?.profile?.learningGoal)
            || normalizeText(snapshot?.profile?.groupLearningGoal)
            || t('userDetail.inspectHint');
          const materialCount = resolveMaterialCount(workspace, snapshot);
          const roadmapCount = resolveRoadmapCount(snapshot);
          const quizCount = resolveQuizCount(snapshot);
          const profileStatus = resolveProfileStatus(snapshot, t);
          const profileFields = buildProfileFields(snapshot, t);
          const visibleMaterials = snapshot?.materials?.slice(0, PREVIEW_LIMIT) || [];
          const visibleRoadmaps = snapshot?.roadmaps?.slice(0, PREVIEW_LIMIT) || [];
          const visibleQuizzes = snapshot?.quizzes?.slice(0, PREVIEW_LIMIT) || [];

          return (
            <article
              key={workspaceKey}
              className={cn(
                'overflow-hidden rounded-[28px] border transition-all duration-300',
                isExpanded
                  ? isDarkMode
                    ? 'border-sky-500/30 bg-slate-900 shadow-[0_24px_80px_-40px_rgba(56,189,248,0.45)]'
                    : 'border-sky-200 bg-white shadow-[0_24px_70px_-42px_rgba(37,99,235,0.28)]'
                  : isDarkMode
                    ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/70'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              )}
            >
              <button
                type="button"
                onClick={() => onToggleWorkspace(workspace)}
                aria-expanded={isExpanded}
                className="flex w-full items-start justify-between gap-4 p-5 text-left"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <div
                    className={cn(
                      'mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-sky-50 text-sky-700'
                    )}
                  >
                    <FolderKanban className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cn('truncate text-lg font-semibold tracking-[-0.02em]', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {title}
                      </h3>
                      <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getSoftBadgeClass('blue', isDarkMode))}>
                        {formatEnumLabel(workspace?.workspaceKind || t('userDetail.workspaceKind'))}
                      </Badge>
                      <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getStatusBadgeClass(workspace?.status, isDarkMode))}>
                        {formatEnumLabel(workspace?.status)}
                      </Badge>
                    </div>

                    <p className={cn('mt-2 line-clamp-2 max-w-3xl text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                      {description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <SummaryPill icon={FileText} label={t('userDetail.documents')} value={getCountValue(materialCount)} tone="blue" isDarkMode={isDarkMode} />
                      <SummaryPill icon={ListChecks} label={t('userDetail.roadmaps')} value={getCountValue(roadmapCount)} tone="purple" isDarkMode={isDarkMode} />
                      <SummaryPill icon={ClipboardList} label={t('userDetail.quizzes')} value={getCountValue(quizCount)} tone="orange" isDarkMode={isDarkMode} />
                      <SummaryPill icon={Sparkles} label={t('userDetail.profile')} value={profileStatus} isDarkMode={isDarkMode} />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-start gap-3">
                  <div className={cn('hidden text-right text-xs sm:block', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                    <p>{t('userDetail.createdAt')}</p>
                    <p className="mt-1 font-medium">{formatDate(workspace?.createdAt)}</p>
                  </div>
                  <div className={cn('mt-1 rounded-full p-2', isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500')}>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className={cn('border-t p-5', isDarkMode ? 'border-slate-800' : 'border-slate-200')}>
                  {snapshot?.isLoading ? (
                    <div className={cn('rounded-[26px] border px-5 py-8', isDarkMode ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-slate-50')}>
                      <ListSpinner variant="section" />
                      <p className={cn('mt-3 text-center text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                        {t('userDetail.loadingSnapshot')}
                      </p>
                    </div>
                  ) : snapshot?.error && !snapshot?.loaded ? (
                    <div className={cn('rounded-[26px] border px-5 py-8 text-center', isDarkMode ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50')}>
                      <p className={cn('text-sm font-medium', isDarkMode ? 'text-rose-200' : 'text-rose-700')}>
                        {snapshot.error}
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={() => onRetryWorkspaceSnapshot(workspace)} className="mt-4 rounded-xl">
                        {t('userDetail.retryLoad')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <section
                        className={cn(
                          'overflow-hidden rounded-[26px] border p-5',
                          isDarkMode
                            ? 'border-slate-700 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(30,41,59,0.9))]'
                            : 'border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.18),_transparent_28%),linear-gradient(135deg,_#ffffff,_#f6faff)]'
                        )}
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="max-w-3xl">
                            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.28em]', isDarkMode ? 'text-sky-200/80' : 'text-sky-700')}>
                              {t('userDetail.workspaceExplorerTitle')}
                            </p>
                            <h4 className={cn('mt-2 text-xl font-semibold tracking-[-0.03em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                              {title}
                            </h4>
                            <p className={cn('mt-3 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                              {description}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <SummaryPill
                                icon={Clock3}
                                label={t('userDetail.updatedAt')}
                                value={formatDate(
                                  snapshot?.meta?.updatedAt
                                  || snapshot?.profile?.updatedAt
                                  || workspace?.updatedAt
                                )}
                                isDarkMode={isDarkMode}
                              />
                              <SummaryPill icon={Sparkles} label={t('userDetail.purpose')} value={resolvePurposeLabel(snapshot?.profile, t)} tone="purple" isDarkMode={isDarkMode} />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                            <MetricCard icon={FileText} label={t('userDetail.documents')} value={getCountValue(resolveMaterialCount(workspace, snapshot))} accentClass={isDarkMode ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-700'} isDarkMode={isDarkMode} />
                            <MetricCard icon={ListChecks} label={t('userDetail.roadmaps')} value={getCountValue(snapshot?.roadmaps?.length)} accentClass={isDarkMode ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'} isDarkMode={isDarkMode} />
                            <MetricCard icon={ClipboardList} label={t('userDetail.quizzes')} value={getCountValue(snapshot?.quizzes?.length)} accentClass={isDarkMode ? 'bg-orange-500/15 text-orange-200' : 'bg-orange-100 text-orange-700'} isDarkMode={isDarkMode} />
                            <MetricCard icon={ShieldCheck} label={t('userDetail.setupStatus')} value={resolveProfileStatus(snapshot, t)} accentClass={isDarkMode ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-100 text-emerald-700'} isDarkMode={isDarkMode} />
                          </div>
                        </div>
                      </section>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <SectionCard title={t('userDetail.documents')} subtitle={t('userDetail.documentsDesc')} icon={FileText} isDarkMode={isDarkMode}>
                          {visibleMaterials.length === 0 ? (
                            <EmptySection text={t('userDetail.emptyDocuments')} isDarkMode={isDarkMode} />
                          ) : (
                            <div className="space-y-3">
                              {visibleMaterials.map((material) => (
                                <WorkspacePreviewItem
                                  key={material?.materialId ?? material?.id ?? material?.title}
                                  title={material?.title || material?.name || t('home.workspace.untitledTitle')}
                                  description={null}
                                  badges={[
                                    <Badge variant="outline" key="type" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getSoftBadgeClass('blue', isDarkMode))}>
                                      {formatEnumLabel(material?.materialType || material?.type)}
                                    </Badge>,
                                    <Badge variant="outline" key="status" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getStatusBadgeClass(material?.status, isDarkMode))}>
                                      {formatEnumLabel(material?.status)}
                                    </Badge>,
                                  ]}
                                  timestamp={formatDate(material?.uploadedAt || material?.createdAt || material?.updatedAt)}
                                  isDarkMode={isDarkMode}
                                />
                              ))}
                              <MoreItemsHint count={(snapshot?.materials?.length || 0) - visibleMaterials.length} t={t} isDarkMode={isDarkMode} />
                            </div>
                          )}
                        </SectionCard>

                        <SectionCard title={t('userDetail.roadmaps')} subtitle={t('userDetail.roadmapsDesc')} icon={ListChecks} isDarkMode={isDarkMode}>
                          {visibleRoadmaps.length === 0 ? (
                            <EmptySection text={t('userDetail.noRoadmaps')} isDarkMode={isDarkMode} />
                          ) : (
                            <div className="space-y-3">
                              {visibleRoadmaps.map((roadmap) => (
                                <WorkspacePreviewItem
                                  key={roadmap?.roadmapId ?? roadmap?.id ?? roadmap?.title}
                                  title={roadmap?.title || roadmap?.roadmapName || roadmap?.name || t('userDetail.roadmaps')}
                                  description={roadmap?.description}
                                  badges={[
                                    <Badge variant="outline" key="status" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getStatusBadgeClass(roadmap?.status, isDarkMode))}>
                                      {formatEnumLabel(roadmap?.status)}
                                    </Badge>,
                                    (roadmap?.roadmapType || roadmap?.type) ? (
                                      <Badge variant="outline" key="type" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getSoftBadgeClass('purple', isDarkMode))}>
                                        {formatEnumLabel(roadmap?.roadmapType || roadmap?.type)}
                                      </Badge>
                                    ) : null,
                                    roadmap?.createVia ? (
                                      <Badge variant="outline" key="createVia" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getSoftBadgeClass('blue', isDarkMode))}>
                                        {formatEnumLabel(roadmap?.createVia)}
                                      </Badge>
                                    ) : null,
                                  ].filter(Boolean)}
                                  timestamp={formatDate(roadmap?.updatedAt || roadmap?.createdAt)}
                                  isDarkMode={isDarkMode}
                                />
                              ))}
                              <MoreItemsHint count={(snapshot?.roadmaps?.length || 0) - visibleRoadmaps.length} t={t} isDarkMode={isDarkMode} />
                            </div>
                          )}
                        </SectionCard>

                        <SectionCard title={t('userDetail.quizzes')} subtitle={t('userDetail.quizzesDesc')} icon={ClipboardList} isDarkMode={isDarkMode}>
                          {visibleQuizzes.length === 0 ? (
                            <EmptySection text={t('userDetail.emptyQuizzes')} isDarkMode={isDarkMode} />
                          ) : (
                            <div className="space-y-3">
                              {visibleQuizzes.map((quiz) => (
                                <WorkspacePreviewItem
                                  key={quiz?.quizId ?? quiz?.id ?? quiz?.title}
                                  title={quiz?.title || quiz?.quizName || t('userDetail.quizzes')}
                                  description={null}
                                  badges={[
                                    <Badge variant="outline" key="status" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getStatusBadgeClass(quiz?.status, isDarkMode))}>
                                      {formatEnumLabel(quiz?.status)}
                                    </Badge>,
                                    <Badge variant="outline" key="questions" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getSoftBadgeClass('orange', isDarkMode))}>
                                      {`${resolveQuestionCount(quiz)} ${t('userDetail.questionCount')}`}
                                    </Badge>,
                                    quiz?.difficulty ? (
                                      <Badge variant="outline" key="difficulty" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getSoftBadgeClass('purple', isDarkMode))}>
                                        {formatEnumLabel(quiz.difficulty)}
                                      </Badge>
                                    ) : null,
                                    (quiz?.quizIntent || quiz?.contextType) ? (
                                      <Badge variant="outline" key="intent" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getSoftBadgeClass('blue', isDarkMode))}>
                                        {formatEnumLabel(quiz?.quizIntent || quiz?.contextType)}
                                      </Badge>
                                    ) : null,
                                  ].filter(Boolean)}
                                  timestamp={formatDate(quiz?.updatedAt || quiz?.createdAt)}
                                  isDarkMode={isDarkMode}
                                />
                              ))}
                              <MoreItemsHint count={(snapshot?.quizzes?.length || 0) - visibleQuizzes.length} t={t} isDarkMode={isDarkMode} />
                            </div>
                          )}
                        </SectionCard>

                        <SectionCard title={t('userDetail.profile')} subtitle={t('userDetail.profileDesc')} icon={Sparkles} isDarkMode={isDarkMode}>
                          {profileFields.length === 0 ? (
                            <EmptySection text={t('userDetail.emptyProfile')} isDarkMode={isDarkMode} />
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {profileFields.map((field) => (
                                <div
                                  key={field.label}
                                  className={cn(
                                    'rounded-2xl border p-4',
                                    isDarkMode ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                                  )}
                                >
                                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                                    {field.label}
                                  </p>
                                  <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-white' : 'text-slate-900')}>
                                    {field.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </SectionCard>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}

export default UserWorkspaceExplorer;
