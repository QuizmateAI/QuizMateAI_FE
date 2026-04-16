import { Calendar, Clock } from 'lucide-react';
import {
  CHALLENGE_MIN_DURATION_MINUTES,
  minDateStringPlusDays,
} from '@/lib/challengeSchedule';

/**
 * UI chọn ngày + giờ tách bạt (thay cho datetime-local).
 */
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
  const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
    isDarkMode
      ? 'border-slate-600 bg-slate-700 text-white [color-scheme:dark] focus:border-orange-500'
      : 'border-gray-300 bg-white text-slate-900 focus:border-orange-500'
  }`;

  const minStart = minDateStringPlusDays(0);

  return (
    <div className="flex flex-col gap-4">
      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        Chỉ chọn thời gian trong tương lai. Khoảng từ lúc bắt đầu đến khi kết thúc cần ít nhất {CHALLENGE_MIN_DURATION_MINUTES} phút; đấu cúp sẽ cần window dài hơn theo số vòng.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" />
            Bắt đầu — ngày *
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
            Bắt đầu — giờ *
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" />
            Kết thúc — ngày *
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
            Kết thúc — giờ *
          </span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {validationIssues.includes('endBeforeStart') && (
        <p className="text-xs text-red-500">Thời gian kết thúc phải sau thời gian bắt đầu</p>
      )}
      {validationIssues.includes('shortWindow') && (
        <p className="text-xs text-red-500">
          Khoảng từ bắt đầu đến kết thúc phải ít nhất {CHALLENGE_MIN_DURATION_MINUTES} phút
        </p>
      )}
      {(validationIssues.includes('pastStart') || validationIssues.includes('pastEnd')) && (
        <p className="text-xs text-red-500">Không chọn ngày giờ trong quá khứ</p>
      )}
      {validationIssues.includes('invalid') && (
        <p className="text-xs text-red-500">Thời gian không hợp lệ</p>
      )}
    </div>
  );
}
