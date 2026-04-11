import { Activity, FileText, Ticket } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';

const FEEDBACK_MANAGEMENT_NAV = [
  {
    to: '/super-admin/feedbacks/forms',
    icon: FileText,
    labelEn: 'Forms',
    labelVi: 'Forms',
  },
  {
    to: '/super-admin/feedbacks/tickets',
    icon: Ticket,
    labelEn: 'Tickets',
    labelVi: 'Tickets',
  },
  {
    to: '/super-admin/feedbacks/activity',
    icon: Activity,
    labelEn: 'Activity',
    labelVi: 'Activity',
  },
];

function FeedbackManagementLayout() {
  const { i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const currentLang = i18n.language || 'vi';
  const isEnglish = currentLang.startsWith('en');

  return (
    <div className="px-5 pb-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div
          className={cn(
            'rounded-[28px] border px-5 py-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.2)] sm:px-6',
            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900',
          )}
        >
          <h1 className="text-2xl font-bold tracking-tight">
            {isEnglish ? 'Feedback System Management' : 'Quản trị Feedback System'}
          </h1>
          <p className={cn('mt-2 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
            {isEnglish
              ? 'Manage survey forms, user tickets, and response activity in separate screens.'
              : 'Tách riêng màn quản lý form survey, ticket user và activity phản hồi để dễ vận hành hơn.'}
          </p>
        </div>

        <div
          className={cn(
            'rounded-[28px] border p-3 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]',
            isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
          )}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {FEEDBACK_MANAGEMENT_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
                  <p className="text-sm font-semibold">{isEnglish ? item.labelEn : item.labelVi}</p>
                </div>
              </NavLink>
            ))}
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}

export default FeedbackManagementLayout;
