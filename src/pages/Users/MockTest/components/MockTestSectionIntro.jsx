import { BookOpen, Clock, FileQuestion, Info, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NS = 'workspace.quiz.mockTestExam';

export default function MockTestSectionIntro({
  section,
  sectionIndex,
  totalSections,
  onStart,
  className,
}) {
  const { t } = useTranslation();
  if (!section) return null;
  const questionCount = Array.isArray(section.questions) ? section.questions.length : 0;
  const durationMinutes = section.durationMinutes || section.duration || null;

  return (
    <div className={cn('mx-auto w-full max-w-2xl space-y-6 px-4 py-12', className)}>
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
          <BookOpen className="h-4 w-4" />
          <span>
            {t(`${NS}.sectionPosition`, 'Phần {{index}} / {{total}}', {
              index: sectionIndex + 1,
              total: totalSections,
            })}
          </span>
        </div>

        <h2 className="mt-3 text-3xl font-bold text-gray-900">
          {section.name || t(`${NS}.sectionPosition`, 'Phần {{index}} / {{total}}', {
            index: sectionIndex + 1,
            total: totalSections,
          })}
        </h2>

        {section.description && (
          <p className="mt-3 text-base leading-relaxed text-gray-700">{section.description}</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Stat
            icon={<FileQuestion className="h-4 w-4" />}
            label={t(`${NS}.intro.questionsCountLabel`, 'Số câu')}
            value={questionCount}
          />
          {durationMinutes && (
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label={t(`${NS}.intro.durationLabel`, 'Thời gian')}
              value={t(`${NS}.intro.durationMinutesValue`, '{{minutes}} phút', {
                minutes: durationMinutes,
              })}
            />
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            {t(
              `${NS}.intro.warning`,
              'Khi đã sang phần kế tiếp, **bạn không thể quay lại** phần này. Hãy hoàn thành tất cả câu hỏi trước khi nhấn "Tiếp theo".',
            )}
          </p>
        </div>

        <Button onClick={onStart} size="lg" className="mt-6 w-full">
          {t(`${NS}.intro.startSectionButton`, 'Bắt đầu phần {{index}}', {
            index: sectionIndex + 1,
          })}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
        <div className="text-lg font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}
