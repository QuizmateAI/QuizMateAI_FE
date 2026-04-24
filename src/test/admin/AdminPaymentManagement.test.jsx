import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPaymentManagement from '@/Pages/Admin/AdminPaymentManagement';
import { getAdminPayments, getAdminPaymentByOrderId, expireOverduePayments } from '@/api/ManagementSystemAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'adminPayments.summary') {
        return `Count ${options?.count}`;
      }
      if (key === 'adminPayments.pagination.page') {
        return `Page ${options?.current}/${options?.total}`;
      }
      if (options && typeof options === 'object' && 'defaultValue' in options) {
        return options.defaultValue;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDarkMode: false }),
}));

vi.mock('@/hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    permissions: new Set(['payment:read']),
    loading: false,
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  getAdminPayments: vi.fn(),
  getAdminPaymentByOrderId: vi.fn(),
  expireOverduePayments: vi.fn(),
}));

describe('AdminPaymentManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminPaymentByOrderId.mockResolvedValue({
      data: {
        paymentId: 1,
        orderId: 'VNPAY-001',
        userId: 77,
        workspaceId: 99,
        chargedUserId: 77,
        paymentTargetType: 'USER_PLAN',
        amount: 150000,
        paymentMethod: 'VNPAY',
        paymentStatus: 'COMPLETED',
        paidAt: '2026-03-31T10:00:00.000Z',
        gatewayTransactionId: 'VNP-TXN-001',
        gatewayAmount: 150000,
        gatewayCurrency: 'VND',
        gatewayVerifiedAt: '2026-03-31T10:00:05.000Z',
      },
    });
    expireOverduePayments.mockResolvedValue({ data: { data: 0 } });
    getAdminPayments.mockResolvedValue({
      data: {
        content: [
          {
            paymentId: 1,
            orderId: 'VNPAY-001',
            userId: 77,
            workspaceId: 99,
            chargedUserId: 77,
            paymentTargetType: 'USER_PLAN',
            amount: 150000,
            paymentMethod: 'VNPAY',
            paymentStatus: 'COMPLETED',
            paidAt: '2026-03-31T10:00:00.000Z',
          },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      },
    });
  });

  it('TC-B02: renders the payment order, amount, and status returned by the API', async () => {
    render(<AdminPaymentManagement />);

    await waitFor(() => {
      expect(getAdminPayments).toHaveBeenCalledWith({
        page: 0,
        size: 10,
        userId: undefined,
        workspaceId: undefined,
        status: undefined,
      });
    });

    const orderCell = await screen.findByText('VNPAY-001');
    const paymentRow = orderCell.closest('tr');

    expect(orderCell).toBeInTheDocument();
    expect(paymentRow).not.toBeNull();
    expect(within(paymentRow).getByText('150,000')).toBeInTheDocument();
    expect(within(paymentRow).getByText('COMPLETED')).toBeInTheDocument();
    expect(within(paymentRow).getByText('VNPAY')).toBeInTheDocument();
  });

  it('shows gateway reconciliation metadata in the payment detail dialog', async () => {
    render(<AdminPaymentManagement />);

    const detailButton = await screen.findByRole('button', { name: /adminPayments\.detail\.action/i });
    fireEvent.click(detailButton);

    expect(await screen.findByText('VNP-TXN-001')).toBeInTheDocument();
    expect(screen.getByText('150,000 VND')).toBeInTheDocument();
    expect(screen.getByText('VND')).toBeInTheDocument();
    expect(screen.getByText('adminPayments.detail.fields.gatewayVerifiedAt')).toBeInTheDocument();
  });
});
