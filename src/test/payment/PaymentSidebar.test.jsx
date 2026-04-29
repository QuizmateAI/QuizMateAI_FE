import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PaymentSidebar from '@/pages/Payment/components/PaymentSidebar';

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({
    isDarkMode: false,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback, options) => {
      const messages = {
        'payment.orderSummary': 'Order Summary',
        'payment.payNow': 'Pay Now',
        'payment.total': 'Total',
        'payment.duration': 'Duration',
        'payment.secureNote': 'Transaction is secured & encrypted',
        'wallet.bonus': 'bonus',
        'wallet.creditsUnit': 'Credits',
      };

      if (messages[key]) return messages[key];
      if (typeof fallback === 'string') {
        return fallback.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options?.[name] ?? ''));
      }
      return key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

describe('PaymentSidebar', () => {
  it('starts checkout directly when Pay Now is clicked', () => {
    const onPay = vi.fn();

    render(
      <PaymentSidebar
        creditPackage={{
          baseCredit: 5000,
          bonusCredit: 500,
          price: 1000000,
        }}
        selectedMethod="stripe"
        onPay={onPay}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pay Now' }));

    expect(onPay).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Confirm order')).not.toBeInTheDocument();
  });
});
