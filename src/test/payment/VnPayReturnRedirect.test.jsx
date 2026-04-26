import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VnPayReturnRedirect from '@/pages/Payment/VnPayReturnRedirect';
import { getApiOrigin } from '@/api/api';

vi.mock('@/api/api', () => ({
  getApiOrigin: vi.fn(),
}));

describe('VnPayReturnRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/api/vnpay/return?vnp_ResponseCode=00&vnp_TxnRef=ORDER123&vnp_Amount=15000000');
  });

  it('TC-S02: forwards the browser to the backend VNPay return handler', () => {
    getApiOrigin.mockReturnValue('https://api.example.com');
    const originalLocation = window.location;
    const replaceSpy = vi.fn();

    delete window.location;
    window.location = { ...originalLocation, replace: replaceSpy };

    render(<VnPayReturnRedirect />);

    expect(replaceSpy).toHaveBeenCalledWith(
      'https://api.example.com/api/vnpay/return?vnp_ResponseCode=00&vnp_TxnRef=ORDER123&vnp_Amount=15000000'
    );

    window.location = originalLocation;
  });

  it('shows the payment-result fallback link when the API origin incorrectly points to the SPA host', () => {
    getApiOrigin.mockReturnValue(window.location.origin);

    render(<VnPayReturnRedirect />);

    const fallbackLink = screen.getByRole('link');
    expect(fallbackLink.getAttribute('href')).toBe(
      '/payments/results?status=success&orderId=ORDER123&amount=150000&message=Thanh+to%C3%A1n+th%C3%A0nh+c%C3%B4ng&resultCode=00'
    );
  });
});
