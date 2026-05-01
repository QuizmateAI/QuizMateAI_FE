import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ban, Clock, Mail, ShieldX, LogOut, FileText } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { fetchMyBanStatus } from '@/api/PolicyAPI';
import { Button } from '@/components/ui/button';
import PolicyHeader from './components/PolicyHeader';
import Footer from '@/pages/LandingPage/components/Footer';

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function computeRemaining(expireAt) {
  if (!expireAt) return null;
  const expire = new Date(expireAt).getTime();
  const now = Date.now();
  let remaining = Math.max(0, expire - now);
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  remaining -= days * 1000 * 60 * 60 * 24;
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  remaining -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(remaining / (1000 * 60));
  return { days, hours, minutes };
}

export default function AccountSuspendedPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';

  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMyBanStatus()
      .then((data) => {
        if (cancelled) return;
        setPenalties(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const primary =
    penalties.find((p) => p.type === 'PERMANENT_BAN') ||
    penalties.find((p) => p.type === 'TEMPORARY_BAN') ||
    penalties[0];

  const remaining = primary?.expireAt ? computeRemaining(primary.expireAt) : null;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div
      className={`min-h-screen ${fontClass} transition-colors ${
        isDarkMode ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <PolicyHeader />

      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-2xl mx-auto">
          <div
            className={`rounded-3xl border-2 p-8 md:p-10 text-center ${
              isDarkMode
                ? 'bg-rose-950/20 border-rose-900/60'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
                isDarkMode ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-600'
              }`}
            >
              <ShieldX className="w-10 h-10" strokeWidth={1.6} />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">
              {t('policies.suspended.title')}
            </h1>
            <p
              className={`leading-relaxed mb-8 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {t('policies.suspended.subtitle')}
            </p>

            {!loading && primary && (
              <div
                className={`text-left rounded-2xl p-5 mb-6 ${
                  isDarkMode ? 'bg-slate-900/60' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-rose-900/50 text-rose-300' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    <Ban className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                        isDarkMode ? 'text-rose-400' : 'text-rose-600'
                      }`}
                    >
                      {t(`policies.suspended.type.${primary.type}`, primary.type)}
                    </p>
                    <p className="font-semibold text-base leading-snug">{primary.reason}</p>
                    {primary.details && (
                      <p
                        className={`mt-2 text-sm ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        {primary.details}
                      </p>
                    )}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-4 border-t border-slate-200 dark:border-slate-800">
                  <dt className={`${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {t('policies.suspended.issuedAt')}
                  </dt>
                  <dd className="font-medium">{formatDate(primary.startAt)}</dd>

                  <dt className={`${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {t('policies.suspended.expiresAt')}
                  </dt>
                  <dd className="font-medium">
                    {primary.expireAt ? formatDate(primary.expireAt) : t('policies.suspended.permanent')}
                  </dd>

                  {remaining && primary.expireAt && (
                    <>
                      <dt className={`${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('policies.suspended.remaining')}
                      </dt>
                      <dd className="font-semibold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {remaining.days}d {remaining.hours}h {remaining.minutes}m
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline" className="font-medium">
                <Link to="/policies">
                  <FileText className="w-4 h-4 mr-2" />
                  {t('policies.suspended.viewPoliciesCta')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="font-medium">
                <a href="mailto:support@quizmateai.io.vn">
                  <Mail className="w-4 h-4 mr-2" />
                  {t('policies.suspended.appealCta')}
                </a>
              </Button>
              <Button onClick={handleLogout} variant="destructive" className="font-medium">
                <LogOut className="w-4 h-4 mr-2" />
                {t('policies.suspended.logoutCta')}
              </Button>
            </div>

            <p
              className={`mt-6 text-xs leading-relaxed ${
                isDarkMode ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              {t('policies.suspended.appealHint')}
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
