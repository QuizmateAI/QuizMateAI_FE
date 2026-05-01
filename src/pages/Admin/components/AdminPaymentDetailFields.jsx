import React from 'react';

const hasDetailValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed !== '-';
  }
  return true;
};

function AdminPaymentDetailFields({
  payment,
  isDarkMode,
  t,
  formatMoney,
  formatDate,
  formatGatewayAmount,
  formatTargetType,
  renderStatusBadge,
  renderPaymentMethodBadge,
  getPayerUserName,
  getChargedUserName,
}) {
  const formatEntityId = (value) => (hasDetailValue(value) ? `#${value}` : '');
  const formatOptionalDate = (value) => (hasDetailValue(value) ? formatDate(value) : '');
  const formatOptionalGatewayAmount = () => (
    payment?.gatewayAmount == null ? '' : formatGatewayAmount(payment)
  );

  const renderDetailField = ({
    key,
    label,
    value,
    rawValue = value,
    className = '',
    valueClassName = 'font-medium',
  }) => {
    if (!hasDetailValue(rawValue)) return null;

    return (
      <div
        key={key}
        className={`space-y-1 rounded-lg border px-4 py-3 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'
        } ${className}`}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={valueClassName}>{value}</div>
      </div>
    );
  };

  const detailFields = [
    {
      key: 'paymentId',
      label: t('adminPayments.detail.fields.paymentId'),
      value: payment.paymentId,
    },
    {
      key: 'orderId',
      label: t('adminPayments.detail.fields.orderId'),
      value: payment.orderId,
      valueClassName: 'break-all font-mono text-sm',
    },
    {
      key: 'payerUser',
      label: t('adminPayments.detail.fields.payerUser'),
      value: getPayerUserName(payment),
    },
    {
      key: 'chargedUser',
      label: t('adminPayments.detail.fields.chargedUser'),
      value: getChargedUserName(payment),
    },
    {
      key: 'workspace',
      label: t('adminPayments.detail.fields.workspace'),
      value: formatEntityId(payment.workspaceId),
    },
    {
      key: 'targetType',
      label: t('adminPayments.detail.fields.targetType'),
      value: formatTargetType(payment.paymentTargetType),
      rawValue: payment.paymentTargetType,
    },
    {
      key: 'userSubscription',
      label: t('adminPayments.detail.fields.userSubscription'),
      value: formatEntityId(payment.userSubscriptionId),
    },
    {
      key: 'groupSubscription',
      label: t('adminPayments.detail.fields.groupSubscription'),
      value: formatEntityId(payment.groupSubscriptionId),
    },
    {
      key: 'amount',
      label: t('adminPayments.detail.fields.amount'),
      value: formatMoney(payment.amount),
      rawValue: payment.amount,
      valueClassName: 'font-semibold tabular-nums',
    },
    {
      key: 'method',
      label: t('adminPayments.detail.fields.method'),
      value: renderPaymentMethodBadge(payment.paymentMethod),
      rawValue: payment.paymentMethod,
    },
    {
      key: 'status',
      label: t('adminPayments.detail.fields.status'),
      value: renderStatusBadge(payment.paymentStatus),
      rawValue: payment.paymentStatus,
    },
    {
      key: 'gatewayTransactionId',
      label: t('adminPayments.detail.fields.gatewayTransactionId'),
      value: payment.gatewayTransactionId,
      valueClassName: 'break-all font-mono text-sm',
    },
    {
      key: 'gatewayAmount',
      label: t('adminPayments.detail.fields.gatewayAmount'),
      value: formatOptionalGatewayAmount(),
      rawValue: payment.gatewayAmount,
      valueClassName: 'font-semibold tabular-nums',
    },
    {
      key: 'gatewayCurrency',
      label: t('adminPayments.detail.fields.gatewayCurrency'),
      value: payment.gatewayCurrency,
    },
    {
      key: 'gatewayVerifiedAt',
      label: t('adminPayments.detail.fields.gatewayVerifiedAt'),
      value: formatOptionalDate(payment.gatewayVerifiedAt),
      rawValue: payment.gatewayVerifiedAt,
      valueClassName: 'font-medium tabular-nums',
    },
    {
      key: 'createdAt',
      label: t('adminPayments.detail.fields.createdAt'),
      value: formatOptionalDate(payment.createdAt),
      rawValue: payment.createdAt,
      valueClassName: 'font-medium tabular-nums',
    },
    {
      key: 'paidAt',
      label: t('adminPayments.detail.fields.paidAt'),
      value: formatOptionalDate(payment.paidAt),
      rawValue: payment.paidAt,
      valueClassName: 'font-medium tabular-nums',
    },
    {
      key: 'expiresAt',
      label: t('adminPayments.detail.fields.expiresAt'),
      value: formatOptionalDate(payment.expiresAt),
      rawValue: payment.expiresAt,
      valueClassName: 'font-medium tabular-nums',
    },
    {
      key: 'payUrl',
      label: t('adminPayments.detail.fields.payUrl'),
      value: (
        <a
          href={payment.payUrl}
          target="_blank"
          rel="noreferrer"
          className="break-all text-blue-600 underline dark:text-blue-400"
        >
          {payment.payUrl}
        </a>
      ),
      rawValue: payment.payUrl,
      className: 'md:col-span-2',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 py-2 md:grid-cols-2">
      {detailFields.map(renderDetailField)}
    </div>
  );
}

export default AdminPaymentDetailFields;
