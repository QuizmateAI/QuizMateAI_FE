import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NS = 'workspace.quiz.mockTestExam';

export default function MockTestSectionTransition({
  completedSection,
  completedAnswered,
  upcomingSection,
  upcomingIndex,
  totalSections,
  onContinue,
  autoAdvanceSeconds = 5,
  className,
}) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(autoAdvanceSeconds || 0);

  useEffect(() => {
    if (!autoAdvanceSeconds || autoAdvanceSeconds <= 0) return undefined;
    if (secondsLeft <= 0) {
      onContinue?.();
      return undefined;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, autoAdvanceSeconds, onContinue]);

  const completedTotal = Array.isArray(completedSection?.questions)
    ? completedSection.questions.length
    : 0;
  const upcomingQuestionCount = Array.isArray(upcomingSection?.questions)
    ? upcomingSection.questions.length
    : 0;
  const completedName = completedSection?.name
    || t(`${NS}.transition.previousSectionFallback`, 'Phần trước');

  return (
    <div className={cn('mx-auto w-full max-w-2xl space-y-6 px-4 py-16', className)}>
      <div className="rounded-xl border border-green-100 bg-green-50 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">
            {t(`${NS}.transition.completedHeading`, 'Hoàn thành: {{name}}', { name: completedName })}
          </h3>
        </div>
        <p className="mt-2 text-sm text-green-800">
          <Trans
            i18nKey={`${NS}.transition.completedDetail`}
            defaults="Đã trả lời <1>{{answered}}</1> / <3>{{total}}</3> câu. Câu trả lời đã được lưu — không thể quay lại sửa."
            values={{ answered: completedAnswered, total: completedTotal }}
            components={[<strong key="a" />, <span key="sep" />, <strong key="b" />]}
          />
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
          <span>{t(`${NS}.transition.upcomingLabel`, 'Tiếp theo')}</span>
          <span className="text-gray-400">·</span>
          <span>
            {t(`${NS}.sectionPosition`, 'Phần {{index}} / {{total}}', {
              index: upcomingIndex + 1,
              total: totalSections,
            })}
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          {upcomingSection?.name
            || t(`${NS}.sectionPosition`, 'Phần {{index}} / {{total}}', {
              index: upcomingIndex + 1,
              total: totalSections,
            })}
        </h2>
        {upcomingSection?.description && (
          <p className="mt-2 text-base text-gray-700">{upcomingSection.description}</p>
        )}
        <p className="mt-4 text-sm text-gray-600">
          <Trans
            i18nKey={`${NS}.transition.upcomingQuestionCount`}
            defaults="Phần này có <1>{{count}}</1> câu hỏi."
            values={{ count: upcomingQuestionCount }}
            components={[<strong key="c" />]}
          />
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={onContinue} size="lg" className="flex-1">
            {t(`${NS}.transition.continueNowButton`, 'Sẵn sàng — bắt đầu ngay')}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          {autoAdvanceSeconds > 0 && secondsLeft > 0 && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t(`${NS}.transition.autoCountdown`, 'tự động sau {{seconds}}s', {
                seconds: secondsLeft,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
