import { Cpu, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  FeedbackEmptyState,
  FeedbackSectionCard,
  FeedbackSummaryCard,
  FeedbackTicketCard,
  useFeedbackSystem,
} from '@/pages/Users/Feedback/components/FeedbackSystemShared';
import { cn } from '@/lib/utils';

function FeedbackSystemPage() {
  const { t } = useTranslation();
  const {
    currentLang,
    isDarkMode,
    locale,
    loading,
    openTicketDialog,
    systemTickets,
  } = useFeedbackSystem();

  const openCount = systemTickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(String(ticket?.resolutionStatus || '').toUpperCase())).length;
  const resolvedCount = systemTickets.filter((ticket) => ['RESOLVED', 'CLOSED'].includes(String(ticket?.resolutionStatus || '').toUpperCase())).length;

  return (
    <div className="space-y-6">
      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700')}>
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('feedbackChannelPages.system.heroTitle', 'System queue')}</h2>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {t('feedbackChannelPages.system.heroDescription', 'Use this queue for outages, service instability, infrastructure issues, and other platform incidents.')}
                </p>
              </div>
            </div>
          </div>

          <Button type="button" onClick={() => openTicketDialog('SYSTEM')}>
            <Ticket className="h-4 w-4" />
            <span>{t('feedbackChannelPages.system.sendTicket', 'Send system ticket')}</span>
          </Button>
        </div>
      </FeedbackSectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <FeedbackSummaryCard
          title={t('feedbackChannelPages.common.totalTickets', 'Total tickets')}
          value={systemTickets.length}
          helper={t('feedbackChannelPages.system.totalHelper', 'All system-related requests from your account')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackChannelPages.common.openInProgress', 'Open / In progress')}
          value={openCount}
          helper={t('feedbackChannelPages.system.openHelper', 'Incidents still under handling')}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={t('feedbackChannelPages.common.resolvedClosed', 'Resolved / Closed')}
          value={resolvedCount}
          helper={t('feedbackChannelPages.system.resolvedHelper', 'Incidents that already have a final status')}
          isDarkMode={isDarkMode}
        />
      </div>

      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('feedbackChannelPages.system.listTitle', 'System tickets list')}</h2>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {t('feedbackChannelPages.system.listDescription', 'Keep infrastructure and service incidents in a separate list from product requests.')}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {loading ? (
            <div className={cn('rounded-[24px] border px-6 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
              {t('feedbackChannelPages.system.loading', 'Loading system tickets...')}
            </div>
          ) : null}

          {!loading && systemTickets.length === 0 ? (
            <FeedbackEmptyState
              title={t('feedbackChannelPages.system.emptyTitle', 'No system ticket yet')}
              description={t('feedbackChannelPages.system.emptyDescription', 'Report platform incidents here when the issue is not limited to a single product flow.')}
              icon={Cpu}
              isDarkMode={isDarkMode}
            />
          ) : null}

          {!loading && systemTickets.map((ticket) => (
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

export default FeedbackSystemPage;
