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
import { formatGroupLearningMode, formatGroupRole } from '../utils/groupDisplay';

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

function ProfileField({ label, value, isDarkMode }) {
  return (
    <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/80'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`mt-2 text-sm font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function ProfileLongField({ label, value, isDarkMode }) {
  return (
    <div className={`rounded-[24px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`mt-2 whitespace-pre-line text-sm leading-7 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
        {value}
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
  profileEditLocked = false,
}) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const emptyLabel = currentLang === 'en' ? 'Not configured yet' : 'Chưa cập nhật';

  const learningModeLabel = formatGroupLearningMode(group?.learningMode, currentLang) || emptyLabel;
  const defaultRoleLabel = formatGroupRole(group?.defaultRoleOnJoin || 'MEMBER', currentLang) || emptyLabel;
  const completionLabel = formatCompletionState(group?.onboardingCompleted, currentLang);
  const roadmapLabel = formatToggleState(
    group?.roadmapEnabled,
    currentLang,
    currentLang === 'en' ? 'Enabled' : 'Đang bật',
    currentLang === 'en' ? 'Disabled' : 'Đang tắt',
  );
  const preLearningLabel = formatToggleState(
    group?.preLearningRequired,
    currentLang,
    currentLang === 'en' ? 'Required' : 'Yêu cầu',
    currentLang === 'en' ? 'Not required' : 'Không yêu cầu',
  );

  const profileStats = useMemo(() => ([
    {
      label: currentLang === 'en' ? 'Setup status' : 'Trạng thái setup',
      value: completionLabel,
      icon: Sparkles,
      tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: currentLang === 'en' ? 'Default role' : 'Vai trò mặc định',
      value: defaultRoleLabel,
      icon: ShieldCheck,
      tone: isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700',
    },
    {
      label: currentLang === 'en' ? 'Learning mode' : 'Chế độ học',
      value: learningModeLabel,
      icon: BrainCircuit,
      tone: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700',
    },
    {
      label: currentLang === 'en' ? 'Seat limit' : 'Sức chứa',
      value: formatSeatLimit(group?.maxMemberOverride, currentLang),
      icon: Users,
      tone: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    },
  ]), [
    completionLabel,
    currentLang,
    defaultRoleLabel,
    group?.maxMemberOverride,
    isDarkMode,
    learningModeLabel,
  ]);

  const profileFields = [
    { label: currentLang === 'en' ? 'Group name' : 'Tên nhóm', value: group?.groupName || emptyLabel },
    { label: currentLang === 'en' ? 'Domain' : 'Lĩnh vực', value: group?.domain || emptyLabel },
    { label: currentLang === 'en' ? 'Exam name' : 'Kỳ thi', value: group?.examName || emptyLabel },
    { label: currentLang === 'en' ? 'Shared roadmap' : 'Roadmap chung', value: roadmapLabel },
    { label: currentLang === 'en' ? 'Entry assessment' : 'Đánh giá đầu vào', value: preLearningLabel },
    {
      label: currentLang === 'en' ? 'Profile progress' : 'Tiến độ profile',
      value: Number.isFinite(Number(group?.currentStep)) && Number.isFinite(Number(group?.totalSteps))
        ? `${group.currentStep}/${group.totalSteps}`
        : completionLabel,
    },
  ];

  return (
    <section className={`rounded-[30px] border p-6 ${isDarkMode ? 'border-white/10 bg-[#08131a]/92 text-white' : 'border-white/80 bg-white/82 text-slate-900'}`}>
      <div className={`flex flex-col gap-4 ${compact ? '' : 'xl:flex-row xl:items-start xl:justify-between'}`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}>
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {currentLang === 'en' ? 'Configured profile' : 'Profile nhóm đã setup'}
              </p>
              <h3 className={`mt-1 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {currentLang === 'en' ? 'Review the group baseline before inviting more members' : 'Xem lại mặt bằng nhóm trước khi mời thêm thành viên'}
              </h3>
            </div>
          </div>

          <p className={`mt-4 max-w-3xl text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {currentLang === 'en'
              ? 'This section shows the real profile already saved for the workspace, including learning mode, group rules, and onboarding constraints.'
              : 'Khu này hiển thị profile thật đã lưu của nhóm, gồm chế độ học, nội quy, mục tiêu và các điều kiện onboarding.'}
          </p>
        </div>

        {isLeader && onOpenProfileConfig ? (
          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={onOpenProfileConfig}
              disabled={profileEditLocked}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.10]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <PenSquare className="h-4 w-4" />
              {currentLang === 'en' ? 'Open profile wizard' : 'Mở lại form cấu hình'}
            </button>
            {profileEditLocked ? (
              <p className={`text-xs leading-5 ${isDarkMode ? 'text-amber-200/90' : 'text-amber-700'}`}>
                {currentLang === 'en'
                  ? 'Delete all workspace materials first if you want to update this profile again.'
                  : 'Muốn cập nhật lại profile, hãy xóa hết tài liệu trong workspace trước.'}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`mt-6 grid gap-3 ${compact ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
        {profileStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-[24px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/78'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </div>
              <p className={`mt-4 text-lg font-bold leading-7 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className={`mt-6 grid gap-3 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {profileFields.map((item) => (
          <ProfileField key={item.label} label={item.label} value={item.value} isDarkMode={isDarkMode} />
        ))}
      </div>

      <div className={`mt-6 grid gap-4 ${compact ? 'xl:grid-cols-2' : 'xl:grid-cols-[1.1fr_0.9fr]'}`}>
        <div className="space-y-4">
          <ProfileLongField
            label={currentLang === 'en' ? 'Knowledge scope' : 'Nội dung kiến thức'}
            value={group?.knowledge || emptyLabel}
            isDarkMode={isDarkMode}
          />
          <ProfileLongField
            label={currentLang === 'en' ? 'Group rules' : 'Nội quy nhóm'}
            value={group?.rules || emptyLabel}
            isDarkMode={isDarkMode}
          />
        </div>

        <div className="space-y-4">
          <ProfileLongField
            label={currentLang === 'en' ? 'Group learning goal' : 'Mục tiêu học tập của nhóm'}
            value={group?.groupLearningGoal || group?.description || emptyLabel}
            isDarkMode={isDarkMode}
          />

          <div className={`rounded-[24px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2">
              <Compass className={`h-4 w-4 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-700'}`} />
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {currentLang === 'en' ? 'Profile reading note' : 'Gợi ý đọc profile'}
              </p>
            </div>
            <ul className={`mt-3 space-y-2 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <li>{currentLang === 'en' ? 'Check learning mode and goal before building quizzes or roadmap.' : 'Kiểm tra chế độ học và mục tiêu trước khi tạo quiz hoặc roadmap.'}</li>
              <li>{currentLang === 'en' ? 'Use the rules block as the welcome baseline for new members.' : 'Dùng phần nội quy làm baseline chào đón thành viên mới.'}</li>
              <li>{currentLang === 'en' ? 'You can update the profile while the workspace has no materials, or after removing existing materials.' : 'Bạn có thể cập nhật profile khi workspace chưa có tài liệu, hoặc sau khi đã xóa hết tài liệu hiện có.'}</li>
            </ul>
          </div>

          <div className={`rounded-[24px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/80'}`}>
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-700'}`} />
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {currentLang === 'en' ? 'Leader action' : 'Hành động của leader'}
              </p>
            </div>
            <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {isLeader
                ? profileEditLocked
                  ? (currentLang === 'en'
                    ? 'The profile is locked because the workspace already has materials. Remove those materials first if you need to update the baseline again.'
                    : 'Profile đang bị khóa vì workspace đã có tài liệu. Nếu muốn cập nhật lại mặt bằng nhóm, hãy xóa tài liệu khỏi workspace trước.')
                  : (currentLang === 'en'
                    ? 'You can reopen the setup form any time as long as the workspace does not contain materials yet.'
                    : 'Bạn có thể mở lại form cấu hình bất cứ lúc nào miễn là workspace chưa có tài liệu.')
                : (currentLang === 'en'
                  ? 'This profile is currently managed by the group leader.'
                  : 'Profile này hiện do trưởng nhóm quản lý.')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GroupProfileOverviewPanel;
