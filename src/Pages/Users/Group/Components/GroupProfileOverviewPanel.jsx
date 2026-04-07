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

function formatToggleState(value, lang, enabledLabel, disabledLabel) {
  if (value == null) return lang === 'en' ? 'Not configured' : 'Chưa cấu hình';
  return value ? enabledLabel : disabledLabel;
}

function formatSeatLimit(value, lang) {
  const safeValue = Number(value);
  if (Number.isFinite(safeValue) && safeValue > 0) {
    return lang === 'en' ? `${safeValue} members` : `${safeValue} thành viên`;
  }
  return lang === 'en' ? 'Based on active group plan' : 'Theo gói group hiện tại';
}

function formatCompletionState(value, lang) {
  if (value == null) return lang === 'en' ? 'In progress' : 'Đang hoàn thiện';
  return value
    ? (lang === 'en' ? 'Completed' : 'Đã hoàn tất')
    : (lang === 'en' ? 'In progress' : 'Đang hoàn thiện');
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
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const emptyLabel = currentLang === 'en' ? 'Not configured yet' : 'Chưa cập nhật';

  const learningModeLabel = formatGroupLearningMode(group?.learningMode, currentLang) || emptyLabel;
  const completionLabel = formatCompletionState(group?.onboardingCompleted, currentLang);
  const roadmapLabel = formatToggleState(
    group?.roadmapEnabled,
    currentLang,
    currentLang === 'en' ? 'Enabled' : 'Đang bật',
    currentLang === 'en' ? 'Disabled' : 'Đang tắt',
  );
  const roadmapBadgeLabel = currentLang === 'en'
    ? (group?.roadmapEnabled ? 'Shared roadmap on' : 'Shared roadmap off')
    : (group?.roadmapEnabled ? 'Có lộ trình chung' : 'Không có lộ trình chung');
  const preLearningLabel = formatToggleState(
    group?.preLearningRequired,
    currentLang,
    currentLang === 'en' ? 'Required' : 'Yêu cầu',
    currentLang === 'en' ? 'Not required' : 'Không yêu cầu',
  );
  const profileProgressLabel = Number.isFinite(Number(group?.currentStep)) && Number.isFinite(Number(group?.totalSteps))
    ? `${group.currentStep}/${group.totalSteps}`
    : completionLabel;
  const groupGoal = group?.groupLearningGoal || group?.description || emptyLabel;
  const knowledgeScope = group?.knowledge || emptyLabel;
  const groupRules = group?.rules || emptyLabel;

  const heroTitle = currentLang === 'en'
    ? 'A quick read of the group baseline before expanding the workspace'
    : 'Tóm tắt mặt bằng nhóm trước khi mở rộng workspace';
  const heroDescription = currentLang === 'en'
    ? 'Everything here reflects the live profile already saved for this group: direction, baseline rules, and the shared learning setup that the team is following.'
    : 'Toàn bộ khu này phản ánh profile đang được lưu cho nhóm: hướng học, nội quy cốt lõi và cấu hình học tập chung mà cả nhóm đang đi theo.';
  const actionButtonLabel = currentLang === 'en'
    ? 'Edit'
    : 'Chỉnh sửa';

  const metricCards = useMemo(() => ([
    {
      label: currentLang === 'en' ? 'Setup status' : 'Trạng thái setup',
      value: completionLabel,
      description: currentLang === 'en' ? 'Whether the baseline is ready for the team' : 'Cho biết profile nền tảng của nhóm đã sẵn sàng hay chưa',
      icon: Sparkles,
      toneClass: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: currentLang === 'en' ? 'Learning mode' : 'Chế độ học',
      value: learningModeLabel,
      description: currentLang === 'en' ? 'Defines the default rhythm for roadmap and content' : 'Định nghĩa nhịp học mặc định của roadmap và nội dung',
      icon: BrainCircuit,
      toneClass: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700',
    },
    {
      label: currentLang === 'en' ? 'Seat limit' : 'Sức chứa',
      value: formatSeatLimit(group?.maxMemberOverride, currentLang),
      description: currentLang === 'en' ? 'Current capacity available for this group setup' : 'Sức chứa hiện tại dành cho mô hình nhóm này',
      icon: Users,
      toneClass: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    },
  ]), [completionLabel, currentLang, group?.maxMemberOverride, isDarkMode, learningModeLabel]);

  const primaryFields = [
    { label: currentLang === 'en' ? 'Group name' : 'Tên nhóm', value: group?.groupName || emptyLabel },
    { label: currentLang === 'en' ? 'Domain' : 'Lĩnh vực', value: group?.domain || emptyLabel },
    { label: currentLang === 'en' ? 'Exam name' : 'Kỳ thi', value: group?.examName || emptyLabel },
    { label: currentLang === 'en' ? 'Profile progress' : 'Tiến độ profile', value: profileProgressLabel },
    { label: currentLang === 'en' ? 'Shared roadmap' : 'Roadmap chung', value: roadmapLabel },
    { label: currentLang === 'en' ? 'Entry assessment' : 'Đánh giá đầu vào', value: preLearningLabel },
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
                  {currentLang === 'en' ? 'Group profile snapshot' : 'Profile nhóm đã setup'}
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
                  {currentLang === 'en' ? 'Core setup' : 'Thiết lập cốt lõi'}
                </p>
              </div>
              <p className={cn('mt-3 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {currentLang === 'en'
                  ? 'These values define how the room identifies itself and the shared baseline the team is following.'
                  : 'Đây là những giá trị định nghĩa nhóm này là ai và baseline học tập chung mà cả nhóm đang theo.'}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {primaryFields.map((item) => (
                  <InfoField key={item.label} label={item.label} value={item.value} isDarkMode={isDarkMode} />
                ))}
              </div>
            </div>

            <NarrativeCard
              eyebrow={currentLang === 'en' ? 'Knowledge scope' : 'Nội dung kiến thức'}
              title={currentLang === 'en' ? 'What this group is learning together' : 'Những gì nhóm đang học cùng nhau'}
              content={knowledgeScope}
              icon={Compass}
              toneClass={isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}
              isDarkMode={isDarkMode}
            />
          </div>

          <div className="space-y-4">
            <NarrativeCard
              eyebrow={currentLang === 'en' ? 'Learning goal' : 'Mục tiêu học tập'}
              title={currentLang === 'en' ? 'What success should look like for the group' : 'Đích đến mà nhóm đang hướng tới'}
              content={groupGoal}
              icon={Target}
              toneClass={isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}
              isDarkMode={isDarkMode}
            />

            <NarrativeCard
              eyebrow={currentLang === 'en' ? 'Group rules' : 'Nội quy nhóm'}
              title={currentLang === 'en' ? 'Shared operating rules for new and current members' : 'Quy ước chung cho cả thành viên mới và hiện tại'}
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
