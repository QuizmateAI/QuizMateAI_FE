import { cn } from '@/lib/utils';

function normalizeText(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  const lowered = trimmed.toLowerCase();
  if (!trimmed || lowered === 'null' || lowered === 'undefined') return '';
  return trimmed;
}

function formatEnumLabel(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';
  return normalized.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function getPaymentStatus(payment) {
  return String(payment?.paymentStatus || payment?.status || '').toUpperCase();
}

function getPaymentTimestamp(payment) {
  return normalizeText(payment?.paidAt || payment?.createdAt || payment?.updatedAt || payment?.expiresAt);
}

function formatDateTime(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function shortenMiddle(value, start = 10, end = 6) {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length <= start + end + 3) return normalized;
  return `${normalized.slice(0, start)}...${normalized.slice(-end)}`;
}

function resolvePaymentDisplayName(payment, t) {
  const candidates = [
    payment?.payerUserName,
    payment?.chargedUserName,
    payment?.payerName,
    payment?.payerFullName,
    payment?.fullName,
    payment?.customerName,
    payment?.displayName,
    payment?.userName,
    payment?.username,
  ];

  const match = candidates.map(normalizeText).find(Boolean);
  if (match) return match;

  if (payment?.userId != null) {
    return t('dashboard.paymentUserLabel', {
      id: payment.userId,
      defaultValue: `User #${payment.userId}`,
    });
  }

  const orderId = normalizeText(payment?.orderId);
  if (orderId) return orderId;

  return t('dashboard.unknownPayer', { defaultValue: 'Unknown payer' });
}

function resolvePaymentMeta(payment, t) {
  const orderId = normalizeText(payment?.orderId);
  const targetType = t(`adminPayments.targetTypes.${payment?.paymentTargetType}`, {
    defaultValue: formatEnumLabel(payment?.paymentTargetType),
  });
  const method = formatEnumLabel(payment?.paymentMethod);

  return {
    orderId,
    orderLabel: orderId ? shortenMiddle(orderId) : payment?.paymentId != null ? `#${payment.paymentId}` : '',
    targetLabel: normalizeText(targetType) && targetType !== '-' ? targetType : '',
    methodLabel: method !== '-' ? method : '',
  };
}

function getMethodClass(method, darkMode) {
  const normalized = normalizeText(method).toUpperCase();
  if (normalized.includes('STRIPE')) {
    return darkMode ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200' : 'border-indigo-100 bg-indigo-50 text-indigo-700';
  }
  if (normalized.includes('MOMO')) {
    return darkMode ? 'border-pink-400/30 bg-pink-500/10 text-pink-200' : 'border-pink-100 bg-pink-50 text-pink-700';
  }
  if (normalized.includes('VNPAY')) {
    return darkMode ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200' : 'border-cyan-100 bg-cyan-50 text-cyan-700';
  }
  return darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600';
}

function getStatusBadgeClass(status, darkMode) {
  switch (normalizeText(status).toUpperCase()) {
    case 'COMPLETED':
    case 'SUCCESS':
    case 'PAID':
      return darkMode ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-100 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':
    case 'CANCELED':
      return darkMode ? 'border-orange-400/30 bg-orange-500/10 text-orange-200' : 'border-orange-100 bg-orange-50 text-orange-700';
    case 'FAILED':
    case 'EXPIRED':
      return darkMode ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-rose-100 bg-rose-50 text-rose-700';
    case 'PENDING':
      return darkMode ? 'border-sky-400/30 bg-sky-500/10 text-sky-200' : 'border-sky-100 bg-sky-50 text-sky-700';
    default:
      return darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function RecentPaymentRow({ payment, statusMeta, locale, darkMode, t }) {
  const status = getPaymentStatus(payment);
  const displayName = resolvePaymentDisplayName(payment, t);
  const meta = resolvePaymentMeta(payment, t);

  return (
    <div
      className={cn(
        'grid gap-3 rounded-[18px] border px-4 py-3 transition-colors md:grid-cols-[minmax(0,1fr)_auto] md:items-center',
        darkMode ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-900' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/70',
      )}
    >
      <div className="min-w-0">
        <div className="min-w-0">
          <p className={cn('truncate text-sm font-semibold', darkMode ? 'text-white' : 'text-slate-950')} title={displayName}>
            {displayName}
          </p>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            {meta.orderLabel ? (
              <span
                className={cn(
                  'max-w-[190px] truncate rounded-full border px-2.5 py-1 text-[11px] font-medium',
                  darkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600',
                )}
                title={meta.orderId || meta.orderLabel}
              >
                {meta.orderLabel}
              </span>
            ) : null}
            {meta.targetLabel ? (
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600')}>
                {meta.targetLabel}
              </span>
            ) : null}
            {meta.methodLabel ? (
              <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]', getMethodClass(meta.methodLabel, darkMode))}>
                {meta.methodLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <div className="min-w-[128px] text-left md:text-right">
          <p className={cn('text-sm font-bold tabular-nums', darkMode ? 'text-white' : 'text-slate-950')}>
            {formatCurrency(payment?.amount, locale)}
          </p>
          <p className={cn('mt-1 text-xs tabular-nums', darkMode ? 'text-slate-500' : 'text-slate-500')}>
            {formatDateTime(getPaymentTimestamp(payment), locale)}
          </p>
        </div>

        <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]', getStatusBadgeClass(status, darkMode))}>
          {statusMeta.label}
        </span>
      </div>
    </div>
  );
}

export default function SuperAdminRecentPayments({ payments, statusMeta, locale, darkMode, t }) {
  if (!payments.length) {
    return (
      <div
        className={cn(
          'rounded-[22px] border border-dashed px-4 py-12 text-center text-sm',
          darkMode ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-500',
        )}
      >
        {t('dashboard.noPayments', { defaultValue: 'No payments yet.' })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => {
        const status = getPaymentStatus(payment);
        const meta = statusMeta[status] || {
          label: formatEnumLabel(status),
        };

        return (
          <RecentPaymentRow
            key={payment?.paymentId ?? payment?.orderId}
            payment={payment}
            statusMeta={meta}
            locale={locale}
            darkMode={darkMode}
            t={t}
          />
        );
      })}
    </div>
  );
}
