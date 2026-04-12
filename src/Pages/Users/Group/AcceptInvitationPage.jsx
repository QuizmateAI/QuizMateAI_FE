import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
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
import { buildGroupWorkspacePath, withQueryParams } from '@/lib/routePaths';
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

function formatDateTime(value, t, locale = 'vi-VN') {
  const emptyLabel = t ? t('acceptInvitationPage.empty', 'N/A') : 'N/A';
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return new Intl.DateTimeFormat(locale, {
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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === 'en' ? 'en' : 'vi';
  const dateLocale = currentLang === 'en' ? 'en-US' : 'vi-VN';
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
      setErrorMessage(t('acceptInvitationPage.invalidLink', 'The invitation link is invalid. Please double-check your email.'));
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
        setErrorMessage(error?.message || t('acceptInvitationPage.loadFail', 'Unable to load this invitation.'));
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
  }, [token, t]);

  const invitationStatus = String(preview?.status || '').toUpperCase();
  const currentEmail = String(currentUser?.email || '').trim().toLowerCase();
  const invitedEmail = String(preview?.invitedEmail || '').trim().toLowerCase();
  const isEmailMismatch = Boolean(isAuthenticated && currentEmail && invitedEmail && currentEmail !== invitedEmail);
  const isExpired = invitationStatus === 'EXPIRED';
  const isAccepted = invitationStatus === 'ACCEPTED';
  const workspaceId = preview?.workspaceId;
  const groupPath = workspaceId
    ? withQueryParams(buildGroupWorkspacePath(workspaceId), { welcome: 1 })
    : '/home';
  const learningModeLabel = formatGroupLearningMode(preview?.learningMode, currentLang);

  const infoRows = [
    { label: t('acceptInvitationPage.infoLabels.group', 'Group'), value: preview?.groupName },
    { label: t('acceptInvitationPage.infoLabels.description', 'Description'), value: preview?.groupDescription },
    { label: t('acceptInvitationPage.infoLabels.invitedBy', 'Invited by'), value: preview?.invitedByFullName || preview?.invitedByUsername },
    { label: t('acceptInvitationPage.infoLabels.invitedEmail', 'Invited email'), value: preview?.invitedEmail },
    { label: t('acceptInvitationPage.infoLabels.domain', 'Domain'), value: preview?.domain },
    { label: t('acceptInvitationPage.infoLabels.learningMode', 'Learning mode'), value: learningModeLabel },
    { label: t('acceptInvitationPage.infoLabels.exam', 'Exam'), value: preview?.examName },
    { label: t('acceptInvitationPage.infoLabels.groupGoal', 'Group goal'), value: preview?.groupLearningGoal },
    { label: t('acceptInvitationPage.infoLabels.expiresAt', 'Confirm by'), value: formatDateTime(preview?.expiredDate, t, dateLocale) },
  ].filter((row) => row.value);

  const detailRows = [
    { label: t('acceptInvitationPage.detailLabels.knowledge', 'Knowledge content'), value: preview?.knowledge },
    { label: t('acceptInvitationPage.detailLabels.rules', 'Group rules'), value: preview?.rules },
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

      showSuccess(response?.message || t('acceptInvitationPage.welcomeToast', 'Welcome! You have joined the group.'));
      navigate(withQueryParams(buildGroupWorkspacePath(payload?.workspaceId || workspaceId), { welcome: 1 }), {
        replace: true,
      });
    } catch (error) {
      const nextMessage = error?.message || t('acceptInvitationPage.acceptFail', 'Unable to confirm this invitation.');
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
          <h1 className="mt-5 text-2xl font-bold text-slate-900">{t('acceptInvitationPage.loading.title', 'Loading group invitation')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('acceptInvitationPage.loading.subtitle', 'Group details will appear before you confirm joining.')}</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !preview) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#fff 100%)] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[28px] border border-rose-100 bg-white p-10 text-center shadow-2xl shadow-rose-100/50">
          <XCircle className="mx-auto h-14 w-14 text-rose-500" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">{t('acceptInvitationPage.errorState.title', 'Unable to open the invitation')}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{errorMessage}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t('acceptInvitationPage.errorState.backHome', 'Back to home')}
            </button>
            <button
              type="button"
              onClick={handleRegister}
              className="rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              {t('acceptInvitationPage.errorState.registerAccount', 'Create an account')}
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{t('acceptInvitationPage.hero.eyebrow', 'Group invitation')}</p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-900">
                {preview?.groupName || t('acceptInvitationPage.hero.fallbackTitle', 'Group join invitation')}
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            {preview?.groupDescription
              || t('acceptInvitationPage.hero.fallbackDescription', 'You have been invited to a group workspace on QuizMate AI. Review the details below and confirm before joining.')}
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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t('acceptInvitationPage.sidebar.eyebrow', 'Join flow')}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{t('acceptInvitationPage.sidebar.title', 'Confirm before joining the group')}</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{t('acceptInvitationPage.sidebar.step1Title', '1. Check you are using the invited email')}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t('acceptInvitationPage.sidebar.step1Description', 'The account you confirm with must match the email that received the invitation so the system puts you in the correct group.')}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{t('acceptInvitationPage.sidebar.step2Title', '2. Confirm on the web')}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t('acceptInvitationPage.sidebar.step2Description', 'After confirming, you will go straight to the workspace and see the welcome screen with the group information.')}</p>
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
                    <p className="text-sm font-semibold text-amber-800">{t('acceptInvitationPage.expired.title', 'The invitation has expired')}</p>
                    <p className="mt-1 text-sm leading-6 text-amber-700">{t('acceptInvitationPage.expired.description', 'The leader needs to send a new invitation if you still want to join this group.')}</p>
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
                      <p className="text-sm font-semibold text-cyan-900">{t('acceptInvitationPage.guest.title', 'Sign in to confirm')}</p>
                      <p className="mt-1 text-sm leading-6 text-cyan-800">
                        <Trans
                          i18nKey="acceptInvitationPage.guest.description"
                          t={t}
                          values={{ email: preview?.invitedEmail || '' }}
                          defaults="You need to sign in with the account that uses email <1>{{email}}</1> to continue."
                          components={[<strong key="email" />]}
                        />
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  <LogIn className="h-4 w-4" />
                  {t('acceptInvitationPage.guest.loginButton', 'Sign in to confirm')}
                </button>

                <button
                  type="button"
                  onClick={handleRegister}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('acceptInvitationPage.guest.registerButton', 'Create a new account')}
                </button>
              </div>
            ) : isEmailMismatch ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-4">
                  <p className="text-sm font-semibold text-rose-800">{t('acceptInvitationPage.mismatch.title', 'You are signed in to the wrong account')}</p>
                  <p className="mt-1 text-sm leading-6 text-rose-700">
                    <Trans
                      i18nKey="acceptInvitationPage.mismatch.description"
                      t={t}
                      values={{ currentEmail: currentUser?.email || '', invitedEmail: preview?.invitedEmail || '' }}
                      defaults="You are currently signed in as <1>{{currentEmail}}</1>, but this invitation is for <3>{{invitedEmail}}</3>."
                      components={[<strong key="current" />, <span key="sep" />, <strong key="invited" />]}
                    />
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  {t('acceptInvitationPage.mismatch.switchButton', 'Sign in with the correct email')}
                </button>
              </div>
            ) : isAccepted ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">{t('acceptInvitationPage.accepted.title', 'You are already in this group')}</p>
                      <p className="mt-1 text-sm leading-6 text-emerald-800">{t('acceptInvitationPage.accepted.description', 'The workspace is ready for you to open the group info and start learning.')}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenGroup}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Users className="h-4 w-4" />
                  {t('acceptInvitationPage.accepted.openButton', 'Open group workspace')}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <p className="text-sm font-semibold text-emerald-900">{t('acceptInvitationPage.ready.title', 'Account is valid, ready to join')}</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">{t('acceptInvitationPage.ready.description', "After confirming, you will go straight to this group's welcome page.")}</p>
                </div>

                <button
                  type="button"
                  onClick={handleAcceptInvitation}
                  disabled={actionLoading || isExpired}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                  {t('acceptInvitationPage.ready.confirmButton', 'Confirm and join group')}
                </button>

                <button
                  type="button"
                  onClick={() => showInfo(t('acceptInvitationPage.ready.laterToast', 'You can return to this email any time to reopen the invitation link.'))}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('acceptInvitationPage.ready.laterButton', 'Later')}
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
