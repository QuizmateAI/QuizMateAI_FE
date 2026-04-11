import { Clock3, Inbox } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
  getFeedbackChannelLabel,
  getFeedbackResolutionStatusBadgeClass,
  getFeedbackResolutionStatusLabel,
  getFeedbackTargetLabel,
} from '@/lib/feedback';
import { cn } from '@/lib/utils';

export function useFeedbackSystem() {
  return useOutletContext();
}

export function formatFeedbackDateTime(value, locale) {
  if (!value) return '-';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

export function FeedbackSummaryCard({ title, value, helper, isDarkMode = false }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.18)]',
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
      )}
    >
      <p className={cn('text-xs uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
        {title}
      </p>
      <p className="mt-3 text-3xl font-black tracking-[-0.04em]">{value}</p>
      <p className={cn('mt-2 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{helper}</p>
    </div>
  );
}

export function FeedbackSectionCard({ children, isDarkMode = false, className = '' }) {
  return (
    <section
      className={cn(
        'rounded-[28px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]',
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function FeedbackEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  isDarkMode = false,
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border px-6 py-12 text-center',
        isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div
        className={cn(
          'mx-auto mb-4 inline-flex rounded-2xl p-4',
          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600',
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className={cn('mt-2 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function FeedbackTicketCard({
  ticket,
  currentLang,
  locale,
  isDarkMode = false,
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.18)]',
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {getFeedbackChannelLabel(ticket.channelType, currentLang)}
            </Badge>
            <Badge
              variant="outline"
              className={getFeedbackResolutionStatusBadgeClass(ticket.resolutionStatus, isDarkMode)}
            >
              {getFeedbackResolutionStatusLabel(ticket.resolutionStatus, currentLang)}
            </Badge>
            <span className={cn('inline-flex items-center gap-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              <Clock3 className="h-3.5 w-3.5" />
              {formatFeedbackDateTime(ticket.createdAt, locale)}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-semibold">{ticket.ticketTitle}</h3>
          <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
            {ticket.ticketDescription}
          </p>

          {ticket.adminReply ? (
            <div
              className={cn(
                'mt-4 rounded-2xl border px-4 py-3',
                isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50',
              )}
            >
              <p className={cn('text-xs uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                {currentLang.startsWith('en') ? 'Admin reply' : 'Phản hồi từ admin'}
              </p>
              <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>
                {ticket.adminReply}
              </p>
            </div>
          ) : null}
        </div>

        <div className={cn('shrink-0 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
          <p>{ticket.handledAt ? formatFeedbackDateTime(ticket.handledAt, locale) : '-'}</p>
          <p className="mt-1">
            {ticket.handledBy?.fullName || ticket.handledBy?.username || ticket.handledBy?.email || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeedbackSurveyCard({
  request,
  currentLang,
  locale,
  isDarkMode = false,
  onOpen,
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.18)]',
        isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getFeedbackTargetLabel(request.targetType, currentLang)}</Badge>
            <span className={cn('inline-flex items-center gap-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              <Clock3 className="h-3.5 w-3.5" />
              {formatFeedbackDateTime(request.scheduledAt || request.createdAt, locale)}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold">
            {request.form?.title || (currentLang.startsWith('en') ? 'Feedback request' : 'Yêu cầu phản hồi')}
          </h3>
          <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
            {request.form?.description || (
              currentLang.startsWith('en')
                ? 'Help improve your learning experience.'
                : 'Giúp hệ thống cải thiện trải nghiệm học tập của bạn.'
            )}
          </p>
          <p className={cn('mt-3 text-xs uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {(request.form?.questions || []).length} {currentLang.startsWith('en') ? 'questions' : 'câu hỏi'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={() => onOpen?.(request)} className="min-w-[160px]">
            {currentLang.startsWith('en') ? 'Answer now' : 'Trả lời ngay'}
          </Button>
        </div>
      </div>
    </div>
  );
}
