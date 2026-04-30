import React from 'react';
import { AlertTriangle, CreditCard, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import CreditIconImage from '@/components/ui/CreditIconImage';
import { cn } from '@/lib/utils';

function WalletStat({ label, value, note, isDarkMode, loading }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white')}>
      <p className={cn('text-[10px] font-semibold uppercase tracking-[0.14em]', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
        {label}
      </p>
      <p className={cn('mt-2 text-2xl font-black tabular-nums tracking-tight', isDarkMode ? 'text-white' : 'text-slate-950')}>
        {loading ? '...' : value}
      </p>
      {note ? (
        <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

export default function GroupWalletOverviewSection({
  isDarkMode,
  t,
  locale,
  lang,
  groupName,
  walletLoading,
  walletSummary,
  walletError,
  workspacePaymentsError,
  walletTransactionsError,
  displayPlanLabel,
  groupPlanExpiryLabel,
  canBuyGroupCredits,
  creditPackagesLoading,
  featuredCreditPackages,
  openGroupPlanManager,
  openGroupCreditCheckout,
  formatNumber,
  formatCurrency,
  formatDateTime,
  cardClass,
  subtleTextClass,
}) {
  const hasDataError = Boolean(walletError || workspacePaymentsError || walletTransactionsError);
  const creditPackages = Array.isArray(featuredCreditPackages) ? featuredCreditPackages : [];

  return (
    <section className={cn(cardClass, 'overflow-hidden p-0')}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 p-5 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {t('groupWalletTab.groupWalletEyebrow', 'Group wallet')}
              </p>
              <h2 className={cn('mt-1 truncate text-2xl font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-950')}>
                {groupName}
              </h2>
              <p className={cn('mt-2 max-w-2xl text-sm leading-6', subtleTextClass)}>
                {t('groupWalletTab.qmcDescriptionCompact', 'QMC is the shared credit balance for quiz, flashcard, roadmap, and group AI actions.')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-xs',
                isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
              onClick={openGroupPlanManager}
            >
              {displayPlanLabel
                ? t('groupWalletTab.managePlan', 'Manage plan')
                : t('groupWalletTab.choosePlan', 'Choose plan')}
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <WalletStat
              label={t('groupWalletTab.availableCredits', 'Available QMC')}
              value={`${formatNumber(walletSummary.totalAvailableCredits, locale)} QMC`}
              note={t('groupWalletTab.availableCreditsNote', 'Ready for shared AI actions')}
              isDarkMode={isDarkMode}
              loading={walletLoading}
            />
            <WalletStat
              label={t('groupWalletTab.regularCredits', 'Regular credits')}
              value={formatNumber(walletSummary.regularCreditBalance, locale)}
              note={walletSummary.updatedAt
                ? `${t('groupWalletTab.walletUpdated', 'Wallet updated')}: ${formatDateTime(walletSummary.updatedAt, lang, true, t)}`
                : t('groupWalletTab.noWalletUpdateYet', 'No update timestamp')}
              isDarkMode={isDarkMode}
              loading={walletLoading}
            />
            <WalletStat
              label={t('groupWalletTab.planCredits', 'Plan credits')}
              value={formatNumber(walletSummary.planCreditBalance, locale)}
              note={walletSummary.planCreditExpiresAt
                ? `${t('groupWalletTab.planCreditsExpire', 'Plan credits expire')}: ${formatDateTime(walletSummary.planCreditExpiresAt, lang, true, t)}`
                : t('groupWalletTab.noPlanCreditExpiry', 'No plan-credit expiry')}
              isDarkMode={isDarkMode}
              loading={walletLoading}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700')}>
              {displayPlanLabel || t('groupWalletTab.noPaidPlan', 'No paid plan')}
            </span>
            {groupPlanExpiryLabel ? (
              <span className={cn('text-xs', subtleTextClass)}>
                {t('groupWalletTab.expires', 'Expires')}: {groupPlanExpiryLabel}
              </span>
            ) : null}
          </div>
        </div>

        <aside className={cn('border-t p-5 lg:border-l lg:border-t-0', isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80')}>
          <div className="flex items-center gap-3">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', isDarkMode ? 'border-cyan-300/20 bg-cyan-400/10' : 'border-cyan-200 bg-white')}>
              <CreditIconImage alt={t('common.creditIconAlt', { brandName: 'QuizMate AI' })} className="h-9 w-9 rounded-xl" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CreditCard className={cn('h-4 w-4', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')} />
                <h3 className={cn('truncate text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                  {t('groupWalletTab.balanceTitle', 'Group balance')}
                </h3>
              </div>
              <p className={cn('mt-1 text-xs leading-5', subtleTextClass)}>
                {t('groupWalletTab.balanceSubtitle', 'Available now for shared AI actions.')}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2">
              <Sparkles className={cn('h-4 w-4', isDarkMode ? 'text-slate-300' : 'text-slate-600')} />
              <p className={cn('text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                {t('groupWalletTab.topUpCredits', 'Top up credits')}
              </p>
            </div>
            <p className={cn('mt-1 text-xs leading-5', subtleTextClass)}>
              {t('groupWalletTab.topUpDescriptionCompact', 'Buy QMC for this group only.')}
            </p>

            {!canBuyGroupCredits ? (
              <div className={cn('mt-4 rounded-xl border px-4 py-3 text-sm', isDarkMode ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800')}>
                {t('groupWalletTab.notAllowedBuyCredits', 'This plan currently does not allow buying extra credits for the group.')}
              </div>
            ) : creditPackagesLoading && creditPackages.length === 0 ? (
              <div className={cn('mt-4 rounded-xl border px-4 py-3 text-sm', isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-white text-slate-600')}>
                ...
              </div>
            ) : creditPackages.length === 0 ? (
              <div className={cn('mt-4 rounded-xl border px-4 py-3 text-sm', isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-white text-slate-600')}>
                {t('groupWalletTab.noCreditPackages', 'No credit packages are available right now.')}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {creditPackages.map((pkg) => {
                  const totalCredits = Number(pkg?.baseCredit ?? 0) + Number(pkg?.bonusCredit ?? 0);
                  return (
                    <button
                      key={pkg.creditPackageId}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5',
                        isDarkMode ? 'border-white/10 bg-slate-950/60 hover:bg-slate-900' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-white',
                      )}
                      onClick={() => openGroupCreditCheckout(pkg.creditPackageId)}
                    >
                      <span className="min-w-0">
                        <span className={cn('block text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                          {formatNumber(totalCredits, locale)} QMC
                        </span>
                        <span className={cn('mt-0.5 block text-xs', subtleTextClass)}>
                          {Number(pkg?.bonusCredit ?? 0) > 0
                            ? t('groupWalletTab.bonusIncluded', 'Includes +{{amount}} bonus QMC', { amount: formatNumber(pkg.bonusCredit, locale) })
                            : t('groupWalletTab.topUpSharedWallet', 'Top up the shared wallet')}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={cn('block text-sm font-black', isDarkMode ? 'text-white' : 'text-slate-950')}>
                          {formatCurrency(pkg?.price, locale)}
                        </span>
                        <span className={cn('mt-0.5 block text-[11px] font-semibold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>
                          {t('groupWalletTab.buyNow', 'Buy now')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {hasDataError ? (
        <div className={cn('flex items-start gap-2 border-t px-5 py-3 text-sm', isDarkMode ? 'border-white/10 bg-rose-400/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-800')}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('groupWalletTab.dataError', 'Some wallet data could not be loaded. Refresh to try again.')}</span>
        </div>
      ) : null}
    </section>
  );
}
