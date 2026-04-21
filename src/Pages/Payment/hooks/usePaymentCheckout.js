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
import { setPendingPlanPurchase } from '@/Utils/planPurchaseState';

export default function usePaymentCheckout({
  paymentType = 'plan',
  planId,
  planName,
  planType,
  workspaceId,
  creditPackageId,
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
          planId: creditPackageId,
          planName: '',
          planType: targetWorkspaceId ? 'GROUP' : 'INDIVIDUAL',
          workspaceId: targetWorkspaceId,
        }
        : {
          planId,
          planName,
          planType,
          workspaceId: targetWorkspaceId,
        };

      if (selectedMethod === 'momo') {
        const res = isCreditPayment
          ? await createMomoCreditPayment(creditPackageId, targetWorkspaceId)
          : await createMomoPayment(planId, targetWorkspaceId);
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
          : await createVnPayPayment(planId, targetWorkspaceId);
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
          : await createStripePayment(planId, targetWorkspaceId);
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
    } catch {
      setPaymentError(t('payment.paymentError', t('payment.momoError')));
      return false;
    } finally {
      setIsPaying(false);
    }

    return false;
  }, [paymentType, workspaceId, creditPackageId, planId, planName, planType, t]);

  return {
    clearPaymentError,
    handlePay,
    isPaying,
    paymentError,
  };
}
