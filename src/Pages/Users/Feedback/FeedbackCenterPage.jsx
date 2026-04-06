import { useEffect, useState } from 'react';
import { ArrowLeft, Clock3, MessageSquareHeart, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import FeedbackSubmitDialog from '@/Components/feedback/FeedbackSubmitDialog';
import { getPendingFeedbackRequests } from '@/api/FeedbackAPI';
import { unwrapApiList } from '@/Utils/apiResponse';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { getFeedbackTargetLabel } from '@/lib/feedback';

function formatDateTime(value, locale) {
  if (!value) return 'Just now';

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

function FeedbackCenterPage() {
  const { i18n, t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError } = useToast();
  const navigate = useNavigate();
  const currentLang = i18n.language;
  const isEnglish = currentLang.startsWith('en');
  const fontClass = isEnglish ? 'font-poppins' : 'font-sans';
  const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await getPendingFeedbackRequests();
      setRequests(unwrapApiList(response));
    } catch (error) {
      showError(getErrorMessage(t, error));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleOpenRequest = (request) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleSubmitted = async () => {
    setDialogOpen(false);
    setSelectedRequest(null);
    await loadRequests();
  };

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-6 ${fontClass} ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className={`rounded-[28px] border px-5 py-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.2)] sm:px-6 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                <div className={`rounded-2xl p-3 ${isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                  <MessageSquareHeart className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {isEnglish ? 'Feedback Center' : 'Trung tâm phản hồi'}
                  </h1>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isEnglish
                      ? 'Answer pending feedback requests so the system can learn what works and what needs improvement.'
                      : 'Trả lời các phản hồi đang chờ để hệ thống biết điểm nào đang tốt và điểm nào cần cải thiện.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`rounded-2xl border px-4 py-3 text-center ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`text-xs uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {isEnglish ? 'Pending' : 'Đang chờ'}
                </p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{requests.length}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={loadRequests}
                disabled={loading}
                className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{isEnglish ? 'Refresh' : 'Làm mới'}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className={`rounded-[24px] border px-6 py-10 text-center text-sm ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
              {isEnglish ? 'Loading pending feedback...' : 'Đang tải phản hồi đang chờ...'}
            </div>
          ) : null}

          {!loading && requests.length === 0 ? (
            <div className={`rounded-[24px] border px-6 py-12 text-center ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <div className={`mx-auto mb-4 inline-flex rounded-2xl p-4 ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <MessageSquareHeart className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold">
                {isEnglish ? 'No pending feedback right now' : 'Hiện chưa có phản hồi nào đang chờ'}
              </h2>
              <p className={`mx-auto mt-2 max-w-xl text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {isEnglish
                  ? 'When you complete a quiz, phase, roadmap milestone, or reach a scheduled study checkpoint, requests will appear here.'
                  : 'Khi bạn hoàn thành quiz, phase, milestone trong lộ trình hoặc đến một mốc học tập định kỳ, yêu cầu phản hồi sẽ xuất hiện tại đây.'}
              </p>
            </div>
          ) : null}

          {!loading && requests.map((request) => (
            <div
              key={request.requestId}
              className={`rounded-[24px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)] ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{getFeedbackTargetLabel(request.targetType, currentLang)}</Badge>
                    <span className={`inline-flex items-center gap-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(request.scheduledAt || request.createdAt, locale)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{request.form?.title || (isEnglish ? 'Feedback request' : 'Yêu cầu phản hồi')}</h2>
                  <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {request.form?.description || (isEnglish ? 'Help improve your learning experience.' : 'Giúp hệ thống cải thiện trải nghiệm học tập của bạn.')}
                  </p>
                  <p className={`mt-3 text-xs uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {(request.form?.questions || []).length} {isEnglish ? 'questions' : 'câu hỏi'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => handleOpenRequest(request)}
                    className="min-w-[160px]"
                  >
                    {isEnglish ? 'Answer now' : 'Trả lời ngay'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FeedbackSubmitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        request={selectedRequest}
        isDarkMode={isDarkMode}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}

export default FeedbackCenterPage;
