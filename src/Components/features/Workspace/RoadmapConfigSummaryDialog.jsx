import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Clock3, Layers3, Route, TimerReset, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { extractRoadmapConfigValues } from '@/Components/features/Workspace/roadmapConfigUtils';

function SummaryCard({ icon: Icon, label, value, isDarkMode }) {
  return (
    <div className={`rounded-3xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/80'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-800 text-cyan-300' : 'bg-white text-cyan-700'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
          </p>
          <p className={`mt-1 text-sm font-semibold leading-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function RoadmapConfigSummaryDialog({
  open,
  onOpenChange,
  isDarkMode = false,
  values = {},
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const normalizedValues = useMemo(() => extractRoadmapConfigValues(values), [values]);
  const notConfiguredLabel = t('workspace.roadmap.configNotSet', i18n.language === 'en' ? 'Not set' : 'Chưa thiết lập');
  const closeLabel = t('common.close', i18n.language === 'en' ? 'Close' : 'Đóng');

  const knowledgeLoadLabel = normalizedValues.knowledgeLoad
    ? t(`workspace.profileConfig.knowledgeLoad.${normalizedValues.knowledgeLoad}.title`, normalizedValues.knowledgeLoad)
    : notConfiguredLabel;
  const adaptationModeLabel = normalizedValues.adaptationMode
    ? t(`workspace.profileConfig.adaptationMode.${normalizedValues.adaptationMode}.title`, normalizedValues.adaptationMode)
    : notConfiguredLabel;
  const roadmapSpeedLabel = normalizedValues.roadmapSpeedMode
    ? t(`workspace.profileConfig.roadmapSpeedMode.${normalizedValues.roadmapSpeedMode}.title`, normalizedValues.roadmapSpeedMode)
    : notConfiguredLabel;
  const estimatedDaysLabel = Number(normalizedValues.estimatedTotalDays) > 0
    ? `${Number(normalizedValues.estimatedTotalDays)} ${t('workspace.roadmap.daysUnit', i18n.language === 'en' ? 'days' : 'ngày')}`
    : notConfiguredLabel;
  const minutesPerDayLabel = Number(normalizedValues.recommendedMinutesPerDay) > 0
    ? `${Number(normalizedValues.recommendedMinutesPerDay)} ${t('workspace.roadmap.minutesPerDayUnit', i18n.language === 'en' ? 'minutes/day' : 'phút/ngày')}`
    : notConfiguredLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={`max-w-[760px] rounded-[28px] border p-0 shadow-[0_25px_70px_-20px_rgba(15,23,42,0.35)] ${
          isDarkMode
            ? 'border-slate-700 bg-slate-950 text-white'
            : 'border-slate-200 bg-white text-slate-900'
        } ${fontClass}`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange?.(false)}
          aria-label={closeLabel}
          className={`absolute right-5 top-5 z-10 h-10 w-10 rounded-2xl ${
            isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <X className="h-5 w-5" />
        </Button>

        <DialogHeader className={`border-b px-6 py-5 text-left ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <DialogTitle>
            {t('workspace.roadmap.configSummaryTitle', i18n.language === 'en' ? 'Roadmap configuration' : 'Cấu hình lộ trình')}
          </DialogTitle>
          <DialogDescription className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {t(
              'workspace.roadmap.configSummaryDescription',
              i18n.language === 'en'
                ? 'Current roadmap settings applied to this group.'
                : 'Các thiết lập lộ trình hiện đang áp dụng cho nhóm này.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
          <SummaryCard
            icon={Layers3}
            label={t('workspace.profileConfig.fields.knowledgeLoad', i18n.language === 'en' ? 'Knowledge amount' : 'Lượng kiến thức cần học')}
            value={knowledgeLoadLabel}
            isDarkMode={isDarkMode}
          />
          <SummaryCard
            icon={Route}
            label={t('workspace.profileConfig.fields.adaptationMode', i18n.language === 'en' ? 'Adaptation mode' : 'Loại Lộ trình')}
            value={adaptationModeLabel}
            isDarkMode={isDarkMode}
          />
          <SummaryCard
            icon={TimerReset}
            label={t('workspace.profileConfig.fields.roadmapSpeedMode', i18n.language === 'en' ? 'Roadmap speed mode' : 'Tốc độ Lộ trình')}
            value={roadmapSpeedLabel}
            isDarkMode={isDarkMode}
          />
          <SummaryCard
            icon={Clock3}
            label={t('workspace.profileConfig.fields.estimatedTotalDays', i18n.language === 'en' ? 'Estimated total days' : 'Số ngày dự kiến')}
            value={estimatedDaysLabel}
            isDarkMode={isDarkMode}
          />
          <SummaryCard
            icon={Clock3}
            label={t('workspace.profileConfig.fields.recommendedMinutesPerDay', i18n.language === 'en' ? 'Suggested minutes per day' : 'Số phút học gợi ý mỗi ngày')}
            value={minutesPerDayLabel}
            isDarkMode={isDarkMode}
          />
        </div>

        <DialogFooter className={`border-t px-6 py-5 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            className={`h-11 rounded-2xl px-6 text-base font-medium ${
              isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
          >
            <X className="mr-2 h-4 w-4" />
            {closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RoadmapConfigSummaryDialog;
