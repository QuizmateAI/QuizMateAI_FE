import { ClipboardList, Cpu, MessageSquareHeart, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  FeedbackEmptyState,
  FeedbackSectionCard,
  FeedbackSummaryCard,
  FeedbackSurveyCard,
  FeedbackTicketCard,
  useFeedbackSystem,
} from '@/pages/Users/Feedback/components/FeedbackSystemShared';
import { buildFeedbacksPath } from '@/lib/routePaths';
import { cn } from '@/lib/utils';

function FeedbackCenterPage() {
  const { t } = useTranslation();
  const {
    currentLang,
    isDarkMode,
    locale,
    loading,
    openRequestDialog,
    openTicketDialog,
    productTickets,
    requests,
    systemTickets,
    ticketStats,
    tickets,
  } = useFeedbackSystem();

  const recentTickets = tickets.slice(0, 3);
  const recentRequests = requests.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <FeedbackSummaryCard
          title={t('feedbackCenterPage.summary.pendingSurveysTitle', 'Pending surveys')}
          value={requests.length}
          helper={t('feedbackCenterPage.summary.pendingSurveysHelper', 'Requests that still need your answers')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackCenterPage.summary.productTicketsTitle', 'Product tickets')}
          value={ticketStats.product}
          helper={t('feedbackCenterPage.summary.productTicketsHelper', 'Bug reports, support requests, product blockers')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackCenterPage.summary.systemTicketsTitle', 'System tickets')}
          value={ticketStats.system}
          helper={t('feedbackCenterPage.summary.systemTicketsHelper', 'Platform incidents and infrastructure issues')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackCenterPage.summary.openTicketsTitle', 'Open tickets')}
          value={ticketStats.active}
          helper={t('feedbackCenterPage.summary.openTicketsHelper', 'Open or in-progress product/system tickets')}
          isDarkMode={isDarkMode}
        />
      </div>

      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t('feedbackCenterPage.createSection.title', 'Create a new ticket')}</h2>
          <p className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
            {t(
              'feedbackCenterPage.createSection.description',
              'Choose the correct channel so super admin can pick up the issue in the right queue.',
            )}
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className={cn('rounded-[24px] border p-5', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
            <div className="flex items-center gap-3">
              <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700')}>
                <MessageSquareHeart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t('feedbackCenterPage.createSection.productTitle', 'Product feedback')}</h3>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {t(
                    'feedbackCenterPage.createSection.productDescription',
                    'Bugs, missing flows, support requests, or anything blocking normal product usage.',
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => openTicketDialog('PRODUCT')}>
                <Ticket className="h-4 w-4" />
                <span>{t('feedbackCenterPage.createSection.sendProductTicket', 'Send product ticket')}</span>
              </Button>
              <Button asChild type="button" variant="outline" className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                <Link to={buildFeedbacksPath('product')}>
                  {t('feedbackCenterPage.createSection.openProductQueue', 'Open product queue')}
                </Link>
              </Button>
            </div>
          </div>

          <div className={cn('rounded-[24px] border p-5', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
            <div className="flex items-center gap-3">
              <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700')}>
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t('feedbackCenterPage.createSection.systemTitle', 'System feedback')}</h3>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {t(
                    'feedbackCenterPage.createSection.systemDescription',
                    'Platform incidents, unstable service, infrastructure errors, or operational issues.',
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => openTicketDialog('SYSTEM')}>
                <Ticket className="h-4 w-4" />
                <span>{t('feedbackCenterPage.createSection.sendSystemTicket', 'Send system ticket')}</span>
              </Button>
              <Button asChild type="button" variant="outline" className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                <Link to={buildFeedbacksPath('system')}>
                  {t('feedbackCenterPage.createSection.openSystemQueue', 'Open system queue')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </FeedbackSectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FeedbackSectionCard isDarkMode={isDarkMode}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t('feedbackCenterPage.recentTickets.title', 'Recent tickets')}</h2>
              <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {t(
                  'feedbackCenterPage.recentTickets.description',
                  'The latest feedback handled inside the dedicated product and system queues.',
                )}
              </p>
            </div>
            <Badge variant="secondary">{ticketStats.total}</Badge>
          </div>

          <div className="mt-5 grid gap-4">
            {loading ? (
              <div className={cn('rounded-[24px] border px-6 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                {t('feedbackCenterPage.recentTickets.loading', 'Loading tickets...')}
              </div>
            ) : null}

            {!loading && recentTickets.length === 0 ? (
              <FeedbackEmptyState
                title={t('feedbackCenterPage.recentTickets.emptyTitle', 'No ticket yet')}
                description={t('feedbackCenterPage.recentTickets.emptyDescription', 'Create a product or system ticket to start the feedback flow.')}
                icon={Ticket}
                isDarkMode={isDarkMode}
              />
            ) : null}

            {!loading && recentTickets.map((ticket) => (
              <FeedbackTicketCard
                key={ticket.requestId}
                ticket={ticket}
                currentLang={currentLang}
                locale={locale}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>

          {!loading && tickets.length > 3 ? (
            <Button asChild type="button" variant="outline" className={cn('mt-5', isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : '')}>
              <Link to={buildFeedbacksPath(productTickets.length >= systemTickets.length ? 'product' : 'system')}>
                {t('feedbackCenterPage.recentTickets.openQueues', 'Open ticket queues')}
              </Link>
            </Button>
          ) : null}
        </FeedbackSectionCard>

        <FeedbackSectionCard isDarkMode={isDarkMode}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t('feedbackCenterPage.pendingSurveys.title', 'Pending surveys')}</h2>
              <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {t(
                  'feedbackCenterPage.pendingSurveys.description',
                  'Scheduled feedback requests are separated into their own survey queue.',
                )}
              </p>
            </div>
            <Badge variant="secondary">{requests.length}</Badge>
          </div>

          <div className="mt-5 grid gap-4">
            {!loading && recentRequests.length === 0 ? (
              <FeedbackEmptyState
                title={t('feedbackCenterPage.pendingSurveys.emptyTitle', 'No pending survey right now')}
                description={t('feedbackCenterPage.pendingSurveys.emptyDescription', 'When the system creates a scheduled survey, it will appear here.')}
                icon={ClipboardList}
                isDarkMode={isDarkMode}
              />
            ) : null}

            {!loading && recentRequests.map((request) => (
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

          {!loading && requests.length > 3 ? (
            <Button asChild type="button" variant="outline" className={cn('mt-5', isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : '')}>
              <Link to={buildFeedbacksPath('surveys')}>
                {t('feedbackCenterPage.pendingSurveys.openQueue', 'Open survey queue')}
              </Link>
            </Button>
          ) : null}
        </FeedbackSectionCard>
      </div>
    </div>
  );
}

export default FeedbackCenterPage;
