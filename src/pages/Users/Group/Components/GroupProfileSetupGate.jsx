// Gate hiển thị khi group workspace chưa hoàn tất setup profile (mandatory).
// Tách khỏi GroupWorkspacePage để tách concern UI khỏi page orchestration.

import { ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function GroupProfileSetupGate({
  isDarkMode = false,
  isCheckingMandatoryProfile = false,
  onContinueSetup,
}) {
  const { t } = useTranslation();

  return (
    <div className={`relative overflow-hidden rounded-[32px] border p-8 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
      <div className={`pointer-events-none absolute inset-0 ${
        isDarkMode
          ? 'bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(6,182,212,0.12),transparent_24%)]'
          : 'bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(6,182,212,0.08),transparent_24%)]'
      }`} />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] ${isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}>
          {isCheckingMandatoryProfile ? (
            <span
              aria-hidden="true"
              className="inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent border-2 h-10 w-10"
            />
          ) : (
            <ShieldCheck className="h-10 w-10" />
          )}
        </div>
        <h2 className={`mt-6 text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {isCheckingMandatoryProfile
            ? t('groupWorkspacePage.profileGate.checkingTitle', 'Checking the group profile...')
            : t('groupWorkspacePage.profileGate.completeTitle', 'Complete the group profile before continuing')}
        </h2>
        <p className={`mx-auto mt-4 max-w-2xl text-sm leading-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {isCheckingMandatoryProfile
            ? t('groupWorkspacePage.profileGate.checkingDescription', 'QuizMate AI is loading the current setup state for this group.')
            : t('groupWorkspacePage.profileGate.completeDescription', 'The leader must finish the shared group profile first. Until then, inviting members, uploading materials, and using studio tabs stay locked.')}
        </p>
        {!isCheckingMandatoryProfile && typeof onContinueSetup === 'function' ? (
          <button
            type="button"
            onClick={onContinueSetup}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <Sparkles className="h-4 w-4" />
            {t('groupWorkspacePage.profileGate.continueSetup', 'Continue setup')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
