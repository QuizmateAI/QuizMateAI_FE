import { MessageSquareHeart, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/Components/ui/button';
import {
  FeedbackEmptyState,
  FeedbackSectionCard,
  FeedbackSummaryCard,
  FeedbackTicketCard,
  useFeedbackSystem,
} from '@/Pages/Users/Feedback/components/FeedbackSystemShared';
import { cn } from '@/lib/utils';

function FeedbackProductPage() {
  const { t } = useTranslation();
  const {
    currentLang,
    isDarkMode,
    locale,
    loading,
    openTicketDialog,
    productTickets,
  } = useFeedbackSystem();

  const openCount = productTickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(String(ticket?.resolutionStatus || '').toUpperCase())).length;
  const resolvedCount = productTickets.filter((ticket) => ['RESOLVED', 'CLOSED'].includes(String(ticket?.resolutionStatus || '').toUpperCase())).length;

  return (
    <div className="space-y-6">
      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700')}>
                <MessageSquareHeart className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('feedbackChannelPages.product.heroTitle', 'Product queue')}</h2>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {t('feedbackChannelPages.product.heroDescription', 'Report bugs, ask for support, or request missing product flows here.')}
                </p>
              </div>
            </div>
          </div>

          <Button type="button" onClick={() => openTicketDialog('PRODUCT')}>
            <Ticket className="h-4 w-4" />
            <span>{t('feedbackChannelPages.product.sendTicket', 'Send product ticket')}</span>
          </Button>
        </div>
      </FeedbackSectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <FeedbackSummaryCard
          title={t('feedbackChannelPages.common.totalTickets', 'Total tickets')}
          value={productTickets.length}
          helper={t('feedbackChannelPages.product.totalHelper', 'All product-related requests from your account')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackChannelPages.common.openInProgress', 'Open / In progress')}
          value={openCount}
          helper={t('feedbackChannelPages.product.openHelper', 'Issues still being handled by super admin')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackChannelPages.common.resolvedClosed', 'Resolved / Closed')}
          value={resolvedCount}
          helper={t('feedbackChannelPages.product.resolvedHelper', 'Requests that already reached a final state')}
          isDarkMode={isDarkMode}
        />
      </div>

      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('feedbackChannelPages.product.listTitle', 'Product tickets list')}</h2>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {t('feedbackChannelPages.product.listDescription', 'Track replies and handling progress without mixing in system incidents or surveys.')}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {loading ? (
            <div className={cn('rounded-[24px] border px-6 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
              {t('feedbackChannelPages.product.loading', 'Loading product tickets...')}
            </div>
          ) : null}

          {!loading && productTickets.length === 0 ? (
            <FeedbackEmptyState
              title={t('feedbackChannelPages.product.emptyTitle', 'No product ticket yet')}
              description={t('feedbackChannelPages.product.emptyDescription', 'Open a ticket when product issues block your work.')}
              icon={MessageSquareHeart}
              isDarkMode={isDarkMode}
            />
          ) : null}

          {!loading && productTickets.map((ticket) => (
            <FeedbackTicketCard
              key={ticket.requestId}
              ticket={ticket}
              currentLang={currentLang}
              locale={locale}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </FeedbackSectionCard>
    </div>
  );
}

export default FeedbackProductPage;
