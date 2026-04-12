import { ClipboardList, Cpu, MessageSquareHeart, Ticket } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Link } from 'react-router-dom';
import {
  FeedbackEmptyState,
  FeedbackSectionCard,
  FeedbackSummaryCard,
  FeedbackSurveyCard,
  FeedbackTicketCard,
  useFeedbackSystem,
} from '@/Pages/Users/Feedback/components/FeedbackSystemShared';
import { buildFeedbacksPath } from '@/lib/routePaths';
import { cn } from '@/lib/utils';

function FeedbackCenterPage() {
  const {
    currentLang,
    isDarkMode,
    isEnglish,
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
          title={isEnglish ? 'Pending surveys' : 'Survey đang chờ'}
          value={requests.length}
          helper={isEnglish ? 'Requests that still need your answers' : 'Các yêu cầu phản hồi bạn chưa trả lời'}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={isEnglish ? 'Product tickets' : 'Ticket product'}
          value={ticketStats.product}
          helper={isEnglish ? 'Bug reports, support requests, product blockers' : 'Báo lỗi, yêu cầu hỗ trợ và các vấn đề chặn luồng dùng sản phẩm'}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={isEnglish ? 'System tickets' : 'Ticket system'}
          value={ticketStats.system}
          helper={isEnglish ? 'Platform incidents and infrastructure issues' : 'Sự cố nền tảng và các vấn đề vận hành hệ thống'}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={isEnglish ? 'Open tickets' : 'Ticket đang xử lý'}
          value={ticketStats.active}
          helper={isEnglish ? 'Open or in-progress product/system tickets' : 'Các ticket sản phẩm hoặc hệ thống đang mở hoặc đang xử lý'}
          isDarkMode={isDarkMode}
        />
      </div>

      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{isEnglish ? 'Create a new ticket' : 'Tạo ticket mới'}</h2>
          <p className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
            {isEnglish
              ? 'Choose the correct channel so super admin can pick up the issue in the right queue.'
              : 'Chọn đúng kênh để super admin xử lý ở đúng hàng đợi phản hồi.'}
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className={cn('rounded-[24px] border p-5', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
            <div className="flex items-center gap-3">
              <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700')}>
                <MessageSquareHeart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{isEnglish ? 'Product feedback' : 'Feedback sản phẩm'}</h3>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {isEnglish
                    ? 'Bugs, missing flows, support requests, or anything blocking normal product usage.'
                    : 'Lỗi sản phẩm, thiếu flow, cần hỗ trợ sử dụng hoặc bất kỳ vấn đề nào chặn thao tác bình thường.'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => openTicketDialog('PRODUCT')}>
                <Ticket className="h-4 w-4" />
                <span>{isEnglish ? 'Send product ticket' : 'Gửi ticket product'}</span>
              </Button>
              <Button asChild type="button" variant="outline" className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                <Link to={buildFeedbacksPath('product')}>
                  {isEnglish ? 'Open product queue' : 'Mở khu product'}
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
                <h3 className="text-base font-semibold">{isEnglish ? 'System feedback' : 'Feedback hệ thống'}</h3>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {isEnglish
                    ? 'Platform incidents, unstable service, infrastructure errors, or operational issues.'
                    : 'Sự cố nền tảng, lỗi hạ tầng, dịch vụ không ổn định hoặc các vấn đề vận hành hệ thống.'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => openTicketDialog('SYSTEM')}>
                <Ticket className="h-4 w-4" />
                <span>{isEnglish ? 'Send system ticket' : 'Gửi ticket system'}</span>
              </Button>
              <Button asChild type="button" variant="outline" className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                <Link to={buildFeedbacksPath('system')}>
                  {isEnglish ? 'Open system queue' : 'Mở khu system'}
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
              <h2 className="text-lg font-semibold">{isEnglish ? 'Recent tickets' : 'Ticket gần đây'}</h2>
              <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {isEnglish
                  ? 'The latest feedback handled inside the dedicated product and system queues.'
                  : 'Các ticket mới nhất đang được xử lý trong hai hàng đợi product và system.'}
              </p>
            </div>
            <Badge variant="secondary">{ticketStats.total}</Badge>
          </div>

          <div className="mt-5 grid gap-4">
            {loading ? (
              <div className={cn('rounded-[24px] border px-6 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                {isEnglish ? 'Loading tickets...' : 'Đang tải ticket...'}
              </div>
            ) : null}

            {!loading && recentTickets.length === 0 ? (
              <FeedbackEmptyState
                title={isEnglish ? 'No ticket yet' : 'Chưa có ticket nào'}
                description={isEnglish ? 'Create a product or system ticket to start the feedback flow.' : 'Tạo ticket product hoặc system để bắt đầu luồng feedback.'}
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
                {isEnglish ? 'Open ticket queues' : 'Mở các hàng đợi ticket'}
              </Link>
            </Button>
          ) : null}
        </FeedbackSectionCard>

        <FeedbackSectionCard isDarkMode={isDarkMode}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{isEnglish ? 'Pending surveys' : 'Survey đang chờ'}</h2>
              <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {isEnglish
                  ? 'Scheduled feedback requests are separated into their own survey queue.'
                  : 'Các survey phản hồi theo lịch được tách riêng thành một hàng đợi riêng.'}
              </p>
            </div>
            <Badge variant="secondary">{requests.length}</Badge>
          </div>

          <div className="mt-5 grid gap-4">
            {!loading && recentRequests.length === 0 ? (
              <FeedbackEmptyState
                title={isEnglish ? 'No pending survey right now' : 'Hiện chưa có survey nào đang chờ'}
                description={isEnglish ? 'When the system creates a scheduled survey, it will appear here.' : 'Khi hệ thống tạo survey theo lịch, nội dung sẽ xuất hiện ở đây.'}
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
                {isEnglish ? 'Open survey queue' : 'Mở khu survey'}
              </Link>
            </Button>
          ) : null}
        </FeedbackSectionCard>
      </div>
    </div>
  );
}

export default FeedbackCenterPage;
