import { cn } from '@/lib/utils';

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

function formatCurrency(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
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

function getOrderLabel(payment) {
  return (
    normalizeText(payment?.orderId) ||
    (payment?.paymentId != null ? `#${payment.paymentId}` : '-')
  );
}

function getTargetLabel(payment, t) {
  const targetType = formatEnumLabel(payment?.paymentTargetType);
  const targetKey = String(payment?.paymentTargetType || '').toUpperCase();
  if (targetKey) {
    return t(`adminPayments.targetTypes.${targetKey}`, { defaultValue: targetType });
  }
  return targetType;
}

function StatusBadge({ status, statusMeta, darkMode, t }) {
  const meta = statusMeta?.[status];
  const label = meta?.label || t(`adminPayments.status.${status}`, { defaultValue: formatEnumLabel(status) });
  const dotClass = meta?.dotClass || (darkMode ? 'bg-slate-500' : 'bg-slate-400');
  const textClass = meta?.textClass || (darkMode ? 'text-slate-300' : 'text-slate-600');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        darkMode ? 'bg-slate-900/80' : 'bg-slate-100',
        textClass,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
      {label}
    </span>
  );
}

export default function SuperAdminRecentPayments({ payments, statusMeta, locale, darkMode, t }) {
  if (!payments || payments.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[20px] border border-dashed px-4 py-10 text-center text-sm',
          darkMode ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-500',
        )}
      >
        {t('dashboard.noPayments', { defaultValue: 'No payment traffic has been recorded yet.' })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr
            className={cn(
              'text-left text-[11px] font-semibold uppercase tracking-[0.16em]',
              darkMode ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            <th className="pb-3 pr-4 font-semibold">
              {t('adminPayments.table.orderId', { defaultValue: 'Order ID' })}
            </th>
            <th className="pb-3 pr-4 font-semibold">
              {t('adminPayments.table.target', { defaultValue: 'Target' })}
            </th>
            <th className="pb-3 pr-4 text-right font-semibold">
              {t('adminPayments.table.amount', { defaultValue: 'Amount' })}
            </th>
            <th className="pb-3 pr-4 font-semibold">
              {t('adminPayments.table.method', { defaultValue: 'Method' })}
            </th>
            <th className="pb-3 pr-4 font-semibold">
              {t('adminPayments.table.status', { defaultValue: 'Status' })}
            </th>
            <th className="pb-3 font-semibold">
              {t('adminPayments.table.time', { defaultValue: 'Time' })}
            </th>
          </tr>
        </thead>
        <tbody className={cn('divide-y', darkMode ? 'divide-slate-800/80' : 'divide-slate-100')}>
          {payments.map((payment, index) => {
            const status = getPaymentStatus(payment);
            return (
              <tr key={payment?.paymentId ?? payment?.orderId ?? `row-${index}`} className="align-middle">
                <td className={cn('py-3 pr-4 font-semibold tabular-nums', darkMode ? 'text-white' : 'text-slate-900')}>
                  {getOrderLabel(payment)}
                </td>
                <td className={cn('py-3 pr-4', darkMode ? 'text-slate-300' : 'text-slate-600')}>
                  {getTargetLabel(payment, t)}
                </td>
                <td className={cn('py-3 pr-4 text-right font-semibold tabular-nums', darkMode ? 'text-white' : 'text-slate-900')}>
                  {formatCurrency(payment?.amount, locale)}
                </td>
                <td className={cn('py-3 pr-4', darkMode ? 'text-slate-300' : 'text-slate-600')}>
                  {formatEnumLabel(payment?.paymentMethod)}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={status} statusMeta={statusMeta} darkMode={darkMode} t={t} />
                </td>
                <td className={cn('py-3 whitespace-nowrap tabular-nums text-xs', darkMode ? 'text-slate-400' : 'text-slate-500')}>
                  {formatDateTime(getPaymentTimestamp(payment), locale)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
