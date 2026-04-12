import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getManagementFeedbackTicketDetail,
  getManagementFeedbackTickets,
  updateManagementFeedbackTicket,
} from '@/api/FeedbackAPI';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { useToast } from '@/context/ToastContext';
import {
  getFeedbackChannelLabel,
  getFeedbackResolutionStatusBadgeClass,
  getFeedbackResolutionStatusLabel,
} from '@/lib/feedback';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { unwrapApiData, unwrapApiList } from '@/Utils/apiResponse';

const PAGE_SIZE = 8;
const CHANNEL_FILTER_OPTIONS = ['ALL', 'PRODUCT', 'SYSTEM'];
const RESOLUTION_FILTER_OPTIONS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function formatDateTime(value, language) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(language?.startsWith('en') ? 'en-US' : 'vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractPageMeta(response) {
  const payload = unwrapApiData(response);
  return {
    page: Number(payload?.page ?? 0) || 0,
    totalPages: Number(payload?.totalPages ?? 0) || 0,
    totalElements: Number(payload?.totalElements ?? 0) || 0,
  };
}

function FeedbackTicketManagementPanel({ isDarkMode = false }) {
  const { i18n, t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const currentLang = i18n.language || 'vi';

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [pageMeta, setPageMeta] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('OPEN');
  const [saving, setSaving] = useState(false);

  const fieldClass = isDarkMode
    ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500'
    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400';

  const loadTickets = async (nextPage = page) => {
    setLoading(true);
    try {
      const response = await getManagementFeedbackTickets({
        page: nextPage,
        size: PAGE_SIZE,
        keyword: searchKeyword || undefined,
        channelType: channelFilter === 'ALL' ? undefined : channelFilter,
        resolutionStatus: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setTickets(unwrapApiList(response));
      setPageMeta(extractPageMeta(response));
    } catch (error) {
      showError(getErrorMessage(t, error));
      setTickets([]);
      setPageMeta({ page: nextPage, totalPages: 0, totalElements: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(page);
  }, [page, searchKeyword, channelFilter, statusFilter]);

  useEffect(() => {
    setPage(0);
  }, [searchKeyword, channelFilter, statusFilter]);

  useEffect(() => {
    if (!selectedTicket) {
      setReplyDraft('');
      setResolutionDraft('OPEN');
      return;
    }

    setReplyDraft(selectedTicket.adminReply || '');
    setResolutionDraft(selectedTicket.resolutionStatus || 'OPEN');
  }, [selectedTicket]);

  const openTicketDetail = async (ticketId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await getManagementFeedbackTicketDetail(ticketId);
      setSelectedTicket(unwrapApiData(response));
    } catch (error) {
      setDetailOpen(false);
      setSelectedTicket(null);
      showError(getErrorMessage(t, error));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTicket) return;

    setSaving(true);
    try {
      const response = await updateManagementFeedbackTicket(selectedTicket.requestId, {
        resolutionStatus: resolutionDraft,
        adminReply: replyDraft,
      });
      const updatedTicket = unwrapApiData(response);
      setSelectedTicket(updatedTicket);
      setTickets((currentTickets) => currentTickets.map((ticket) => (
        ticket.requestId === updatedTicket.requestId ? updatedTicket : ticket
      )));
      showSuccess(t('feedbackTicketManagementPanel.toastUpdated', 'Ticket updated.'));
      await loadTickets(page);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    return tickets.reduce((result, ticket) => {
      const normalizedStatus = String(ticket?.resolutionStatus || 'OPEN').toUpperCase();
      result.total += 1;
      if (normalizedStatus === 'OPEN') result.open += 1;
      if (normalizedStatus === 'IN_PROGRESS') result.inProgress += 1;
      if (normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED') result.done += 1;
      return result;
    }, {
      total: 0,
      open: 0,
      inProgress: 0,
      done: 0,
    });
  }, [tickets]);

  const currentPageLabel = pageMeta.totalPages > 0 ? pageMeta.page + 1 : 1;
  const totalPagesLabel = Math.max(pageMeta.totalPages, 1);

  return (
    <section className={cn(
      'rounded-[28px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]',
      isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
    )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700')}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('feedbackTicketManagementPanel.headerTitle', 'User feedback tickets')}</h2>
              <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {t('feedbackTicketManagementPanel.headerDescription', 'Reply to product and system tickets, then move them through the handling workflow.')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary">{pageMeta.totalElements}</Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() => loadTickets(page)}
            disabled={loading}
            className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
          >
            <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
            <span>{t('feedbackTicketManagementPanel.refresh', 'Refresh')}</span>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className={cn('rounded-2xl border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
          <p className={cn('text-xs uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {t('feedbackTicketManagementPanel.summaryVisible', 'Visible now')}
          </p>
          <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{summary.total}</p>
        </div>
        <div className={cn('rounded-2xl border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
          <p className={cn('text-xs uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {t('feedbackTicketManagementPanel.summaryOpenInProgress', 'Open / In progress')}
          </p>
          <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{summary.open + summary.inProgress}</p>
        </div>
        <div className={cn('rounded-2xl border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
          <p className={cn('text-xs uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {t('feedbackTicketManagementPanel.summaryResolvedClosed', 'Resolved / Closed')}
          </p>
          <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{summary.done}</p>
        </div>
      </div>

      <div className={cn('mt-5 rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_220px_auto]">
          <div className="relative">
            <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', isDarkMode ? 'text-slate-500' : 'text-slate-400')} />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setSearchKeyword(searchInput.trim());
                }
              }}
              placeholder={t('feedbackTicketManagementPanel.searchPlaceholder', 'Search by title, reply, user, email...')}
              className={cn('h-11 rounded-2xl pl-9', fieldClass)}
            />
          </div>
          <select
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value)}
            className={cn('h-11 rounded-2xl border px-3 text-sm outline-none', fieldClass)}
          >
            {CHANNEL_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL'
                  ? t('feedbackTicketManagementPanel.allCategories', 'All categories')
                  : getFeedbackChannelLabel(option, currentLang)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={cn('h-11 rounded-2xl border px-3 text-sm outline-none', fieldClass)}
          >
            {RESOLUTION_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL'
                  ? t('feedbackTicketManagementPanel.allHandlingStates', 'All handling states')
                  : getFeedbackResolutionStatusLabel(option, currentLang)}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => setSearchKeyword(searchInput.trim())}>
            <Search className="h-4 w-4" />
            <span>{t('feedbackTicketManagementPanel.search', 'Search')}</span>
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className={cn('rounded-[24px] border px-5 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
            {t('feedbackTicketManagementPanel.loadingTickets', 'Loading feedback tickets...')}
          </div>
        ) : null}

        {!loading && tickets.length === 0 ? (
          <div className={cn('rounded-[24px] border px-5 py-12 text-center', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
            <div className={cn('mx-auto mb-4 inline-flex rounded-2xl p-4', isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')}>
              <Ticket className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">{t('feedbackTicketManagementPanel.noMatches', 'No tickets match the current filters')}</h3>
          </div>
        ) : null}

        {!loading && tickets.map((ticket) => (
          <button
            key={ticket.requestId}
            type="button"
            onClick={() => openTicketDetail(ticket.requestId)}
            className={cn(
              'w-full rounded-[24px] border p-5 text-left shadow-[0_18px_40px_-36px_rgba(15,23,42,0.25)] transition-colors',
              isDarkMode ? 'border-slate-800 bg-slate-950 hover:bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50',
            )}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{getFeedbackChannelLabel(ticket.channelType, currentLang)}</Badge>
                  <Badge variant="outline" className={getFeedbackResolutionStatusBadgeClass(ticket.resolutionStatus, isDarkMode)}>
                    {getFeedbackResolutionStatusLabel(ticket.resolutionStatus, currentLang)}
                  </Badge>
                </div>
                <h3 className="mt-3 text-base font-semibold">{ticket.ticketTitle}</h3>
                <p className={cn('mt-2 line-clamp-3 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {ticket.ticketDescription}
                </p>
                {ticket.adminReply ? (
                  <div className={cn('mt-3 rounded-2xl border px-4 py-3 text-sm leading-6', isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                    {ticket.adminReply}
                  </div>
                ) : null}
              </div>

              <div className={cn('shrink-0 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                <p>{ticket.user?.fullName || ticket.user?.username || ticket.user?.email || '-'}</p>
                <p className="mt-1">{ticket.user?.email || '-'}</p>
                <p className="mt-3">{formatDateTime(ticket.createdAt, currentLang)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className={cn('mt-4 flex items-center justify-between text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
        <span>{pageMeta.totalElements} {t('feedbackTicketManagementPanel.ticketsSuffix', 'tickets')}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            disabled={page <= 0}
            className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>{currentPageLabel}/{totalPagesLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => Math.min(totalPagesLabel - 1, currentPage + 1))}
            disabled={page + 1 >= totalPagesLabel}
            className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className={cn('max-h-[90vh] overflow-y-auto sm:max-w-4xl', isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : '')}>
          <DialogHeader>
            <DialogTitle>{t('feedbackTicketManagementPanel.ticketDetail', 'Ticket detail')}</DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
              {t('feedbackTicketManagementPanel.ticketDetailDescription', 'Reply to the user and keep the handling status in sync.')}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              {t('feedbackTicketManagementPanel.loadingDetail', 'Loading ticket detail...')}
            </div>
          ) : null}

          {!detailLoading && selectedTicket ? (
            <div className="space-y-4">
              <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{getFeedbackChannelLabel(selectedTicket.channelType, currentLang)}</Badge>
                  <Badge variant="outline" className={getFeedbackResolutionStatusBadgeClass(selectedTicket.resolutionStatus, isDarkMode)}>
                    {getFeedbackResolutionStatusLabel(selectedTicket.resolutionStatus, currentLang)}
                  </Badge>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{selectedTicket.ticketTitle}</h3>
                <p className={cn('mt-2 text-sm leading-7', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                  {selectedTicket.ticketDescription}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
                  <p className={cn('text-xs uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                    {t('feedbackTicketManagementPanel.requester', 'Requester')}
                  </p>
                  <p className="mt-3 text-sm font-semibold">{selectedTicket.user?.fullName || selectedTicket.user?.username || '-'}</p>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{selectedTicket.user?.email || '-'}</p>
                </div>
                <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
                  <p className={cn('text-xs uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                    {t('feedbackTicketManagementPanel.timeline', 'Timeline')}
                  </p>
                  <p className="mt-3 text-sm font-semibold">{formatDateTime(selectedTicket.createdAt, currentLang)}</p>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {selectedTicket.handledAt
                      ? `${t('feedbackTicketManagementPanel.handledLabel', 'Handled')}: ${formatDateTime(selectedTicket.handledAt, currentLang)}`
                      : t('feedbackTicketManagementPanel.notHandledYet', 'Not handled yet')}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('feedbackTicketManagementPanel.handlingStatus', 'Handling status')}</label>
                  <select
                    value={resolutionDraft}
                    onChange={(event) => setResolutionDraft(event.target.value)}
                    className={cn('h-11 w-full rounded-2xl border px-3 text-sm outline-none', fieldClass)}
                  >
                    {RESOLUTION_FILTER_OPTIONS.filter((option) => option !== 'ALL').map((option) => (
                      <option key={option} value={option}>
                        {getFeedbackResolutionStatusLabel(option, currentLang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('feedbackTicketManagementPanel.replyToUser', 'Reply to user')}</label>
                  <textarea
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value)}
                    className={cn('min-h-[180px] w-full rounded-2xl border px-4 py-3 text-sm outline-none', fieldClass)}
                    placeholder={t('feedbackTicketManagementPanel.replyPlaceholder', 'Write the response or handling note...')}
                  />
                </div>
              </div>

              {selectedTicket.handledBy ? (
                <div className={cn('rounded-[24px] border px-4 py-3 text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                  {t('feedbackTicketManagementPanel.latestHandledBy', 'Latest handled by')}:{' '}
                  <span className="font-medium">
                    {selectedTicket.handledBy.fullName || selectedTicket.handledBy.username || selectedTicket.handledBy.email}
                  </span>
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                  disabled={saving}
                  className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
                >
                  {t('feedbackTicketManagementPanel.close', 'Close')}
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>{saving ? t('feedbackTicketManagementPanel.saving', 'Saving...') : t('feedbackTicketManagementPanel.saveUpdate', 'Save update')}</span>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default FeedbackTicketManagementPanel;
