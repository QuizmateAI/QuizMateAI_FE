import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  FeedbackEmptyState,
  FeedbackSectionCard,
  FeedbackSummaryCard,
  FeedbackSurveyCard,
  useFeedbackSystem,
} from '@/pages/Users/Feedback/components/FeedbackSystemShared';
import { cn } from '@/lib/utils';

function FeedbackSurveyPage() {
  const { t } = useTranslation();
  const {
    currentLang,
    isDarkMode,
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
            <h2 className="text-lg font-semibold">{t('feedbackSurveyPage.header.title', 'Survey queue')}</h2>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {t('feedbackSurveyPage.header.description', 'Scheduled feedback forms are separated from support tickets so they can be managed independently.')}
            </p>
          </div>
        </div>
      </FeedbackSectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <FeedbackSummaryCard
          title={t('feedbackSurveyPage.summary.pendingTitle', 'Pending surveys')}
          value={requests.length}
          helper={t('feedbackSurveyPage.summary.pendingHelper', 'Requests that still need your answers')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackSurveyPage.summary.flowTitle', 'Survey flow')}
          value={t('feedbackSurveyPage.summary.flowValue', 'Separate')}
          helper={t('feedbackSurveyPage.summary.flowHelper', 'Survey forms stay out of the product/system ticket queues')}
          isDarkMode={isDarkMode}
        />
      </div>

      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('feedbackSurveyPage.list.title', 'Pending survey requests')}</h2>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {t('feedbackSurveyPage.list.description', 'Answer these structured forms separately from support conversations.')}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {loading ? (
            <div className={cn('rounded-[24px] border px-6 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
              {t('feedbackSurveyPage.list.loading', 'Loading surveys...')}
            </div>
          ) : null}

          {!loading && requests.length === 0 ? (
            <FeedbackEmptyState
              title={t('feedbackSurveyPage.list.emptyTitle', 'No pending survey right now')}
              description={t('feedbackSurveyPage.list.emptyDescription', 'When a survey is created for you, it will appear in this dedicated queue.')}
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
