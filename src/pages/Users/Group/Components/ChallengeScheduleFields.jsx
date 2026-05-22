import { Calendar, Clock } from 'lucide-react';
import i18n from '@/i18n';
import {
  CHALLENGE_MIN_DURATION_HOURS,
  minDateStringPlusDays,
} from '@/lib/challengeSchedule';

function currentTimeStringRoundedUp() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5 - (d.getMinutes() % 5 || 5), 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ChallengeScheduleFields({
  isDarkMode,
  startDate,
  startTime,
  endDate,
  endTime,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  validationIssues = [],
}) {
  const t = i18n.getFixedT(i18n.language?.startsWith('en') ? 'en' : 'vi');
  const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
    isDarkMode
      ? 'border-slate-600 bg-slate-700 text-white [color-scheme:dark] focus:border-orange-500'
      : 'border-gray-300 bg-white text-slate-900 focus:border-orange-500'
  }`;

  const minStart = minDateStringPlusDays(0);
  // Nếu user đang chọn ngày = hôm nay → time min = giờ hiện tại; ngược lại 00:00.
  const startTimeMin = startDate === minStart ? currentTimeStringRoundedUp() : '00:00';
  const endTimeMin = (endDate && endDate === startDate) ? (startTime || '00:00') : '00:00';

  return (
    <div className="flex flex-col gap-4">
      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        {t('challengeScheduleFields.helper', {
          defaultValue: 'Only choose future times. The window from start to end must be at least {{hours}} hours; bracket matches need a longer window depending on the number of rounds.',
          hours: CHALLENGE_MIN_DURATION_HOURS,
        })}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" />
            {t('challengeScheduleFields.startDate', {
              defaultValue: 'Start - date *',
            })}
          </span>
          <input
            type="date"
            value={startDate}
            min={minStart}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
            {t('challengeScheduleFields.startTime', {
              defaultValue: 'Start - time *',
            })}
          </span>
          <input
            type="time"
            value={startTime}
            min={startTimeMin}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" />
            {t('challengeScheduleFields.endDate', {
              defaultValue: 'End - date *',
            })}
          </span>
          <input
            type="date"
            value={endDate}
            min={startDate || minStart}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
            {t('challengeScheduleFields.endTime', {
              defaultValue: 'End - time *',
            })}
          </span>
          <input
            type="time"
            value={endTime}
            min={endTimeMin}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {validationIssues.includes('endBeforeStart') && (
        <p className="text-xs text-red-500">
          {t('challengeScheduleFields.errors.endBeforeStart', {
            defaultValue: 'End time must be after start time.',
          })}
        </p>
      )}
      {validationIssues.includes('shortWindow') && (
        <p className="text-xs text-red-500">
          {t('challengeScheduleFields.errors.shortWindow', {
            defaultValue: 'The window from start to end must be at least {{hours}} hours.',
            hours: CHALLENGE_MIN_DURATION_HOURS,
          })}
        </p>
      )}
      {(validationIssues.includes('pastStart') || validationIssues.includes('pastEnd')) && (
        <p className="text-xs text-red-500">
          {t('challengeScheduleFields.errors.pastDate', {
            defaultValue: 'Do not choose a date or time in the past.',
          })}
        </p>
      )}
      {validationIssues.includes('invalid') && (
        <p className="text-xs text-red-500">
          {t('challengeScheduleFields.errors.invalid', {
            defaultValue: 'The selected time is invalid.',
          })}
        </p>
      )}
    </div>
  );
}
