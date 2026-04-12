import { ClipboardList } from 'lucide-react';
import {
  FeedbackEmptyState,
  FeedbackSectionCard,
  FeedbackSummaryCard,
  FeedbackSurveyCard,
  useFeedbackSystem,
} from '@/Pages/Users/Feedback/components/FeedbackSystemShared';
import { cn } from '@/lib/utils';

function FeedbackSurveyPage() {
  const {
    currentLang,
    isDarkMode,
    isEnglish,
    locale,
    loading,
    openRequestDialog,
    requests,
  } = useFeedbackSystem();

  return (
    <div className="space-y-6">
      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex items-center gap-3">
          <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-violet-500/10 text-violet-300' : 'bg-violet-50 text-violet-700')}>
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{isEnglish ? 'Survey queue' : 'Khu survey feedback'}</h2>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {isEnglish
                ? 'Scheduled feedback forms are separated from support tickets so they can be managed independently.'
                : 'Các form survey theo lịch được tách riêng khỏi ticket hỗ trợ để quản lý độc lập và rõ ràng hơn.'}
            </p>
          </div>
        </div>
      </FeedbackSectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <FeedbackSummaryCard
          title={isEnglish ? 'Pending surveys' : 'Survey đang chờ'}
          value={requests.length}
          helper={isEnglish ? 'Requests that still need your answers' : 'Những yêu cầu vẫn đang chờ bạn trả lời'}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={isEnglish ? 'Survey flow' : 'Luồng survey'}
          value={isEnglish ? 'Separate' : 'Tách riêng'}
          helper={isEnglish ? 'Survey forms stay out of the product/system ticket queues' : 'Survey không còn bị trộn vào hàng đợi ticket product/system'}
          isDarkMode={isDarkMode}
        />
      </div>

      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{isEnglish ? 'Pending survey requests' : 'Danh sách survey đang chờ'}</h2>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {isEnglish
                ? 'Answer these structured forms separately from support conversations.'
                : 'Trả lời các form phản hồi có cấu trúc này ở một khu riêng, tách biệt với luồng support.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {loading ? (
            <div className={cn('rounded-[24px] border px-6 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
              {isEnglish ? 'Loading surveys...' : 'Đang tải survey...'}
            </div>
          ) : null}

          {!loading && requests.length === 0 ? (
            <FeedbackEmptyState
              title={isEnglish ? 'No pending survey right now' : 'Hiện chưa có survey nào đang chờ'}
              description={isEnglish ? 'When a survey is created for you, it will appear in this dedicated queue.' : 'Khi có survey mới dành cho bạn, nội dung sẽ xuất hiện trong khu riêng này.'}
              icon={ClipboardList}
              isDarkMode={isDarkMode}
            />
          ) : null}

          {!loading && requests.map((request) => (
            <FeedbackSurveyCard
              key={request.requestId}
              request={request}
              currentLang={currentLang}
              locale={locale}
              isDarkMode={isDarkMode}
              onOpen={openRequestDialog}
            />
          ))}
        </div>
      </FeedbackSectionCard>
    </div>
  );
}

export default FeedbackSurveyPage;
