import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  MessageSquareHeart,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getMyFeedbackTickets,
  getPendingFeedbackRequests,
} from '@/api/FeedbackAPI';
import FeedbackSubmitDialog from '@/components/feedback/FeedbackSubmitDialog';
import FeedbackTicketDialog from '@/components/feedback/FeedbackTicketDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/context/ToastContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { buildFeedbacksPath } from '@/lib/routePaths';
import { cn } from '@/lib/utils';
import { unwrapApiList } from '@/utils/apiResponse';
import { getErrorMessage } from '@/utils/getErrorMessage';

const FEEDBACK_NAV_ITEMS = [
  {
    segment: 'overview',
    icon: LayoutDashboard,
    labelEn: 'Overview',
    labelVi: 'Tổng quan',
  },
  {
    segment: 'product',
    icon: MessageSquareHeart,
    labelEn: 'Product',
    labelVi: 'Product',
  },
  {
    segment: 'system',
    icon: Cpu,
    labelEn: 'System',
    labelVi: 'System',
  },
  {
    segment: 'surveys',
    icon: ClipboardList,
    labelEn: 'Surveys',
    labelVi: 'Survey',
  },
];

function normalizeTicketsByDate(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function FeedbackSystemLayout() {
  const { i18n, t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError } = useToast();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'vi';
  const isEnglish = currentLang.startsWith('en');
  const fontClass = isEnglish ? 'font-poppins' : 'font-sans';
  const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';

  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketDialogChannel, setTicketDialogChannel] = useState('PRODUCT');

  const loadFeedbackSystem = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingResponse, ticketsResponse] = await Promise.all([
        getPendingFeedbackRequests(),
        getMyFeedbackTickets(),
      ]);
      setRequests(unwrapApiList(pendingResponse));
      setTickets(normalizeTicketsByDate(unwrapApiList(ticketsResponse)));
    } catch (error) {
      showError(getErrorMessage(t, error));
      setRequests([]);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    loadFeedbackSystem();
  }, [loadFeedbackSystem]);

  const ticketStats = useMemo(() => {
    return tickets.reduce((result, ticket) => {
      const resolutionStatus = String(ticket?.resolutionStatus || '').toUpperCase();
      const channelType = String(ticket?.channelType || '').toUpperCase();

      result.total += 1;
      if (channelType === 'PRODUCT') {
        result.product += 1;
      }
      if (channelType === 'SYSTEM') {
        result.system += 1;
      }
      if (resolutionStatus === 'OPEN' || resolutionStatus === 'IN_PROGRESS') {
        result.active += 1;
      }
      if (resolutionStatus === 'RESOLVED' || resolutionStatus === 'CLOSED') {
        result.done += 1;
      }
      return result;
    }, {
      total: 0,
      product: 0,
      system: 0,
      active: 0,
      done: 0,
    });
  }, [tickets]);

  const productTickets = useMemo(
    () => tickets.filter((ticket) => String(ticket?.channelType || '').toUpperCase() === 'PRODUCT'),
    [tickets],
  );
  const systemTickets = useMemo(
    () => tickets.filter((ticket) => String(ticket?.channelType || '').toUpperCase() === 'SYSTEM'),
    [tickets],
  );

  const openTicketDialog = useCallback((channelType) => {
    setTicketDialogChannel(channelType);
    setTicketDialogOpen(true);
  }, []);

  const openRequestDialog = useCallback((request) => {
    setSelectedRequest(request);
    setRequestDialogOpen(true);
  }, []);

  const handleRequestSubmitted = async () => {
    setRequestDialogOpen(false);
    setSelectedRequest(null);
    await loadFeedbackSystem();
  };

  const outletContext = useMemo(() => ({
    currentLang,
    isDarkMode,
    isEnglish,
    locale,
    loading,
    openRequestDialog,
    openTicketDialog,
    productTickets,
    refreshFeedbackSystem: loadFeedbackSystem,
    requests,
    systemTickets,
    ticketStats,
    tickets,
  }), [
    currentLang,
    isDarkMode,
    isEnglish,
    locale,
    loading,
    openRequestDialog,
    openTicketDialog,
    productTickets,
    loadFeedbackSystem,
    requests,
    systemTickets,
    ticketStats,
    tickets,
  ]);

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-6 ${fontClass} ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div
          className={cn(
            'rounded-[28px] border px-5 py-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.2)] sm:px-6',
            isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
          )}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/home')}
                className={`mb-3 -ml-3 gap-2 ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{isEnglish ? 'Back to home' : 'Về trang chủ'}</span>
              </Button>

              <div className="flex items-center gap-3">
                <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700')}>
                  <Ticket className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {isEnglish ? 'Feedback System' : 'Feedback System'}
                  </h1>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {isEnglish
                      ? 'A dedicated area for product tickets, system incidents, and scheduled feedback surveys.'
                      : 'Khu riêng để quản lý ticket product, sự cố system và các survey phản hồi theo lịch.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{ticketStats.total} {isEnglish ? 'tickets' : 'ticket'}</Badge>
              <Badge variant="secondary">{requests.length} {isEnglish ? 'surveys' : 'survey'}</Badge>
              <Button
                type="button"
                variant="outline"
                onClick={loadFeedbackSystem}
                disabled={loading}
                className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
              >
                <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
                <span>{isEnglish ? 'Refresh' : 'Làm mới'}</span>
              </Button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'rounded-[28px] border p-3 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]',
            isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
          )}
        >
          <div className="grid gap-3 md:grid-cols-4">
            {FEEDBACK_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.segment}
                to={buildFeedbacksPath(item.segment)}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-[20px] border px-4 py-4 transition-colors',
                  isActive
                    ? (isDarkMode ? 'border-blue-400/20 bg-blue-500/10 text-white' : 'border-blue-200 bg-blue-50 text-slate-900')
                    : (isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'),
                )}
              >
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', isDarkMode ? 'bg-slate-800' : 'bg-white')}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {isEnglish ? item.labelEn : item.labelVi}
                  </p>
                </div>
              </NavLink>
            ))}
          </div>
        </div>

        <Outlet context={outletContext} />
      </div>

      <FeedbackSubmitDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        request={selectedRequest}
        isDarkMode={isDarkMode}
        onSubmitted={handleRequestSubmitted}
      />

      <FeedbackTicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        defaultChannelType={ticketDialogChannel}
        isDarkMode={isDarkMode}
        onSubmitted={loadFeedbackSystem}
      />
    </div>
  );
}

export default FeedbackSystemLayout;
