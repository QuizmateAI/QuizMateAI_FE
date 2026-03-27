import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  LogIn,
  MailCheck,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { acceptInvitation, previewInvitation } from '@/api/GroupAPI';
import { logout } from '@/api/Authentication';
import { unwrapApiData } from '@/Utils/apiResponse';
import { useToast } from '@/context/ToastContext';
import { formatGroupLearningMode } from './utils/groupDisplay';

const WELCOME_STORAGE_PREFIX = 'group-invite-welcome';

function readCurrentUser() {
  try {
    const rawUser = window.localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error('Unable to read current user from storage:', error);
    return null;
  }
}

function formatDateTime(value) {
  if (!value) return 'Không có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không có';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function buildAuthReturnState(token, view = 'login') {
  return {
    view,
    from: {
      pathname: '/accept-invite',
      search: token ? `?token=${token}` : '',
    },
  };
}

function getWelcomeStorageKey(workspaceId) {
  return `${WELCOME_STORAGE_PREFIX}:${workspaceId}`;
}

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentUser = useMemo(() => readCurrentUser(), []);
  const isAuthenticated = useMemo(() => {
    const accessToken = window.localStorage.getItem('accessToken');
    return Boolean(accessToken && currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (!token) {
      setLoadingPreview(false);
      setErrorMessage('Liên kết mời không hợp lệ. Vui lòng kiểm tra lại email.');
      return;
    }

    let isMounted = true;

    const loadInvitation = async () => {
      setLoadingPreview(true);
      setErrorMessage('');

      try {
        const response = await previewInvitation(token);
        if (!isMounted) return;
        setPreview(unwrapApiData(response));
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Không thể tải thông tin lời mời này.');
      } finally {
        if (isMounted) {
          setLoadingPreview(false);
        }
      }
    };

    loadInvitation();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const invitationStatus = String(preview?.status || '').toUpperCase();
  const currentEmail = String(currentUser?.email || '').trim().toLowerCase();
  const invitedEmail = String(preview?.invitedEmail || '').trim().toLowerCase();
  const isEmailMismatch = Boolean(isAuthenticated && currentEmail && invitedEmail && currentEmail !== invitedEmail);
  const isExpired = invitationStatus === 'EXPIRED';
  const isAccepted = invitationStatus === 'ACCEPTED';
  const workspaceId = preview?.workspaceId;
  const groupPath = workspaceId ? `/group-workspace/${workspaceId}?welcome=1` : '/home';
  const learningModeLabel = formatGroupLearningMode(preview?.learningMode, 'vi');

  const infoRows = [
    { label: 'Nhóm', value: preview?.groupName },
    { label: 'Mô tả', value: preview?.groupDescription },
    { label: 'Leader mời', value: preview?.invitedByFullName || preview?.invitedByUsername },
    { label: 'Email được mời', value: preview?.invitedEmail },
    { label: 'Lĩnh vực', value: preview?.domain },
    { label: 'Chế độ học', value: learningModeLabel },
    { label: 'Kỳ thi', value: preview?.examName },
    { label: 'Mục tiêu nhóm', value: preview?.groupLearningGoal },
    { label: 'Hạn xác nhận', value: formatDateTime(preview?.expiredDate) },
  ].filter((row) => row.value);

  const detailRows = [
    { label: 'Nội dung kiến thức', value: preview?.knowledge },
    { label: 'Nội quy nhóm', value: preview?.rules },
  ].filter((row) => row.value);

  const handleLogin = () => {
    navigate('/login', { state: buildAuthReturnState(token, 'login') });
  };

  const handleRegister = () => {
    navigate('/login', { state: buildAuthReturnState(token, 'register') });
  };

  const handleSwitchAccount = () => {
    logout();
    navigate('/login', { state: buildAuthReturnState(token, 'login') });
  };

  const handleOpenGroup = () => {
    navigate(groupPath, { replace: true });
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;

    setActionLoading(true);
    try {
      const response = await acceptInvitation(token);
      const payload = unwrapApiData(response);

      if (payload?.workspaceId) {
        window.sessionStorage.setItem(
          getWelcomeStorageKey(payload.workspaceId),
          JSON.stringify(payload),
        );
      }

      showSuccess(response?.message || 'Chào mừng bạn đã vào nhóm!');
      navigate(`/group-workspace/${payload?.workspaceId || workspaceId}?welcome=1`, {
        replace: true,
      });
    } catch (error) {
      const nextMessage = error?.message || 'Không thể xác nhận lời mời này.';
      setErrorMessage(nextMessage);
      showError(nextMessage);
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingPreview) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef8f3_100%)] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white/95 p-10 text-center shadow-2xl shadow-slate-200/50">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-cyan-600" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Đang tải lời mời nhóm</h1>
          <p className="mt-2 text-sm text-slate-600">Thông tin nhóm sẽ hiện ra trước khi bạn xác nhận tham gia.</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !preview) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#fff 100%)] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[28px] border border-rose-100 bg-white p-10 text-center shadow-2xl shadow-rose-100/50">
          <XCircle className="mx-auto h-14 w-14 text-rose-500" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Không thể mở lời mời</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{errorMessage}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Về trang chủ
            </button>
            <button
              type="button"
              onClick={handleRegister}
              className="rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Đăng ký tài khoản
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf0_0%,#f4fbf7_46%,#eef6ff_100%)] px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-xl shadow-slate-200/50 lg:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <MailCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Lời mời vào nhóm</p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-900">
                {preview?.groupName || 'Lời mời tham gia nhóm'}
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            {preview?.groupDescription
              || 'Bạn đã được mời vào một workspace nhóm trên QuizMate AI. Xem thông tin bên dưới và xác nhận trước khi vào nhóm.'}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {infoRows.map((row) => (
              <div key={row.label} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{row.label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>

          {detailRows.length > 0 ? (
            <div className="mt-6 space-y-3">
              {detailRows.map((row) => (
                <div key={row.label} className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{row.label}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700 whitespace-pre-line">{row.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Luồng tham gia</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Xác nhận trước khi vào nhóm</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">1. Kiểm tra đúng email được mời</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Tài khoản xác nhận phải trùng với email nhận lời mời để hệ thống đưa bạn vào đúng nhóm.</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">2. Bấm xác nhận trên web</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Sau khi xác nhận, bạn sẽ vào thẳng workspace và nhìn thấy màn hình chào mừng cùng thông tin nhóm.</p>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {isExpired ? (
              <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Lời mời đã hết hạn</p>
                    <p className="mt-1 text-sm leading-6 text-amber-700">Leader cần gửi lại một lời mời mới nếu bạn vẫn cần tham gia nhóm này.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {!isAuthenticated ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-cyan-100 bg-cyan-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-700" />
                    <div>
                      <p className="text-sm font-semibold text-cyan-900">Đăng nhập để xác nhận</p>
                      <p className="mt-1 text-sm leading-6 text-cyan-800">Bạn cần đăng nhập tài khoản có email <strong>{preview?.invitedEmail}</strong> để tiếp tục.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  <LogIn className="h-4 w-4" />
                  Đăng nhập để xác nhận
                </button>

                <button
                  type="button"
                  onClick={handleRegister}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Tạo tài khoản mới
                </button>
              </div>
            ) : isEmailMismatch ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-4">
                  <p className="text-sm font-semibold text-rose-800">Bạn đang đăng nhập sai tài khoản</p>
                  <p className="mt-1 text-sm leading-6 text-rose-700">
                    Hiện tại là <strong>{currentUser?.email}</strong>, trong khi lời mời này dành cho <strong>{preview?.invitedEmail}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  Đăng nhập lại đúng email
                </button>
              </div>
            ) : isAccepted ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Bạn đã ở trong nhóm này</p>
                      <p className="mt-1 text-sm leading-6 text-emerald-800">Workspace sẵn sàng để bạn vào đọc thông tin nhóm và bắt đầu học.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenGroup}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Users className="h-4 w-4" />
                  Mở workspace nhóm
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <p className="text-sm font-semibold text-emerald-900">Tài khoản hợp lệ, sẵn sàng vào nhóm</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">Sau khi bấm xác nhận, bạn sẽ vào thẳng trang chào mừng của nhóm này.</p>
                </div>

                <button
                  type="button"
                  onClick={handleAcceptInvitation}
                  disabled={actionLoading || isExpired}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                  Xác nhận vào nhóm
                </button>

                <button
                  type="button"
                  onClick={() => showInfo('Bạn có thể quay lại email này bất cứ lúc nào để mở lại liên kết mời.')}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Để sau
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
