import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createMomoCreditPayment,
  createMomoPayment,
  createStripeCreditPayment,
  createStripePayment,
  createVnPayCreditPayment,
  createVnPayPayment,
} from '@/api/PaymentAPI';
import { setPendingPlanPurchase } from '@/utils/planPurchaseState';
import { getErrorMessage } from '@/utils/getErrorMessage';

export default function usePaymentCheckout({
  paymentType = 'plan',
  planId,
  planName,
  planType,
  workspaceId,
  creditPackageId,
  extraSlotCount = 0,
}) {
  const { t } = useTranslation();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const clearPaymentError = useCallback(() => {
    setPaymentError('');
  }, []);

  const handlePay = useCallback(async (selectedMethod) => {
    if (!selectedMethod) return false;

    setIsPaying(true);
    setPaymentError('');

    try {
      const isCreditPayment = paymentType === 'credit';
      const targetWorkspaceId = workspaceId != null && workspaceId !== '' ? String(workspaceId) : null;
      const pendingPurchasePayload = isCreditPayment
        ? {
          purchaseType: 'CREDIT',
          planId: '',
          creditPackageId,
          planName: '',
          planType: targetWorkspaceId ? 'GROUP' : 'INDIVIDUAL',
          workspaceId: targetWorkspaceId,
        }
        : {
          purchaseType: 'PLAN',
          planId,
          planName,
          planType,
          workspaceId: targetWorkspaceId,
        };

      const normalizedExtraSlots = !isCreditPayment && targetWorkspaceId && Number(extraSlotCount) > 0
        ? Number(extraSlotCount)
        : 0;

      if (selectedMethod === 'momo') {
        const res = isCreditPayment
          ? await createMomoCreditPayment(creditPackageId, targetWorkspaceId)
          : await createMomoPayment(planId, targetWorkspaceId, normalizedExtraSlots);
        const payUrl = res?.data?.payUrl || res?.payUrl;
        const orderId = res?.data?.orderId || res?.orderId || '';
        if (payUrl) {
          setPendingPlanPurchase({ ...pendingPurchasePayload, orderId });
          window.location.href = payUrl;
          return true;
        }
        setPaymentError(t('payment.momoError'));
        return false;
      }

      if (selectedMethod === 'vnpay') {
        const res = isCreditPayment
          ? await createVnPayCreditPayment(creditPackageId, targetWorkspaceId)
          : await createVnPayPayment(planId, targetWorkspaceId, normalizedExtraSlots);
        const payUrl = res?.data?.payUrl || res?.payUrl;
        const orderId = res?.data?.orderId || res?.orderId || '';
        if (payUrl) {
          setPendingPlanPurchase({ ...pendingPurchasePayload, orderId });
          window.location.href = payUrl;
          return true;
        }
        setPaymentError(t('payment.vnpayError', t('payment.momoError')));
        return false;
      }

      if (selectedMethod === 'stripe') {
        const res = isCreditPayment
          ? await createStripeCreditPayment(creditPackageId, targetWorkspaceId)
          : await createStripePayment(planId, targetWorkspaceId, normalizedExtraSlots);
        const payUrl = res?.data?.payUrl || res?.payUrl;
        const orderId = res?.data?.orderId || res?.orderId || '';
        if (payUrl) {
          setPendingPlanPurchase({ ...pendingPurchasePayload, orderId });
          window.location.href = payUrl;
          return true;
        }
        setPaymentError(t('payment.stripeError', t('payment.paymentError', 'Payment error')));
        return false;
      }
    } catch (err) {
      const mappedMessage = getErrorMessage(t, err);
      setPaymentError(mappedMessage && mappedMessage !== 'error.unknown'
        ? mappedMessage
        : t('payment.paymentError', t('payment.momoError')));
      return false;
    } finally {
      setIsPaying(false);
    }

    return false;
  }, [paymentType, workspaceId, creditPackageId, planId, planName, planType, extraSlotCount, t]);

  return {
    clearPaymentError,
    handlePay,
    isPaying,
    paymentError,
  };
}
