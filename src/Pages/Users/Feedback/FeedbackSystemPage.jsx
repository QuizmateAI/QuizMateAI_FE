import { Cpu, Ticket } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
  FeedbackEmptyState,
  FeedbackSectionCard,
  FeedbackSummaryCard,
  FeedbackTicketCard,
  useFeedbackSystem,
} from '@/Pages/Users/Feedback/components/FeedbackSystemShared';
import { cn } from '@/lib/utils';

function FeedbackSystemPage() {
  const {
    currentLang,
    isDarkMode,
    isEnglish,
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
                <h2 className="text-lg font-semibold">{isEnglish ? 'System queue' : 'Khu feedback system'}</h2>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {isEnglish
                    ? 'Use this queue for outages, service instability, infrastructure issues, and other platform incidents.'
                    : 'Dùng khu này cho các sự cố outage, dịch vụ không ổn định, lỗi hạ tầng và các vấn đề vận hành nền tảng.'}
                </p>
              </div>
            </div>
          </div>

          <Button type="button" onClick={() => openTicketDialog('SYSTEM')}>
            <Ticket className="h-4 w-4" />
            <span>{isEnglish ? 'Send system ticket' : 'Gửi ticket system'}</span>
          </Button>
        </div>
      </FeedbackSectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <FeedbackSummaryCard
          title={isEnglish ? 'Total tickets' : 'Tổng ticket'}
          value={systemTickets.length}
          helper={isEnglish ? 'All system-related requests from your account' : 'Tất cả yêu cầu liên quan đến system từ tài khoản của bạn'}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={isEnglish ? 'Open / In progress' : 'Mới / Đang xử lý'}
          value={openCount}
          helper={isEnglish ? 'Incidents still under handling' : 'Các sự cố vẫn đang trong quá trình xử lý'}
          isDarkMode={isDarkMode}
        />
        <FeedbackSummaryCard
          title={isEnglish ? 'Resolved / Closed' : 'Đã giải quyết / Đã đóng'}
          value={resolvedCount}
          helper={isEnglish ? 'Incidents that already have a final status' : 'Các sự cố đã có trạng thái cuối cùng'}
          isDarkMode={isDarkMode}
        />
      </div>

      <FeedbackSectionCard isDarkMode={isDarkMode}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{isEnglish ? 'System tickets list' : 'Danh sách ticket system'}</h2>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {isEnglish
                ? 'Keep infrastructure and service incidents in a separate list from product requests.'
                : 'Tách riêng sự cố hạ tầng và dịch vụ khỏi các yêu cầu product để dễ theo dõi hơn.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {loading ? (
            <div className={cn('rounded-[24px] border px-6 py-10 text-center text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
              {isEnglish ? 'Loading system tickets...' : 'Đang tải ticket system...'}
            </div>
          ) : null}

          {!loading && systemTickets.length === 0 ? (
            <FeedbackEmptyState
              title={isEnglish ? 'No system ticket yet' : 'Bạn chưa gửi ticket system nào'}
              description={isEnglish ? 'Report platform incidents here when the issue is not limited to a single product flow.' : 'Báo ở đây khi sự cố thuộc về nền tảng hoặc vận hành hệ thống, không chỉ là một flow sản phẩm đơn lẻ.'}
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
