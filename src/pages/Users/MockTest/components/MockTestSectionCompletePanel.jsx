import { CheckCircle2, ChevronRight, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NS = 'workspace.quiz.mockTestExam';

export default function MockTestSectionCompletePanel({
  isLastSection,
  onProceed,
  answeredCount,
  totalCount,
  className,
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 border-t border-green-200 bg-green-50/95 backdrop-blur px-4 py-4',
        className,
      )}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <div className="text-sm font-semibold text-green-900">
              {t(`${NS}.complete.progressLabel`, 'Đã trả lời {{answered}} / {{total}} câu trong phần này.', {
                answered: answeredCount,
                total: totalCount,
              })}
            </div>
            <div className="text-xs text-green-700">
              {isLastSection
                ? t(`${NS}.complete.lastSectionHint`, 'Đây là phần cuối — sẵn sàng nộp bài?')
                : t(`${NS}.complete.nextSectionHint`, 'Sang phần tiếp theo? Bạn sẽ không thể quay lại sửa phần này.')}
            </div>
          </div>
        </div>
        <Button onClick={onProceed} size="lg" className="flex-shrink-0">
          {isLastSection ? (
            <>
              {t(`${NS}.complete.submitButton`, 'Nộp bài')} <Send className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              {t(`${NS}.complete.nextButton`, 'Tiếp theo')} <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
