import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GroupWalletTab from '@/pages/Users/Group/group-leader/GroupWalletTab';
import {
  getGroupWorkspaceWallet,
  getGroupWorkspaceWalletTransactions,
  getPurchaseableCreditPackages,
  getWorkspacePayments,
} from '@/api/ManagementSystemAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && 'defaultValue' in fallbackOrOptions) {
        return fallbackOrOptions.defaultValue;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  getGroupWorkspaceWallet: vi.fn(),
  getGroupWorkspaceWalletTransactions: vi.fn(),
  getPurchaseableCreditPackages: vi.fn(),
  getWorkspacePayments: vi.fn(),
}));

function renderGroupWalletTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GroupWalletTab
          isDarkMode={false}
          group={{ workspaceId: 12, name: 'Team wallet' }}
          canManage
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GroupWalletTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGroupWorkspaceWallet.mockResolvedValue({
      data: {
        totalAvailableCredits: 90,
        regularCreditBalance: 70,
        planCreditBalance: 20,
      },
    });
    getWorkspacePayments.mockResolvedValue({ data: { content: [], totalPages: 1 } });
    getPurchaseableCreditPackages.mockResolvedValue({ data: [] });
    getGroupWorkspaceWalletTransactions.mockResolvedValue({
      data: {
        content: [
          {
            creditTransactionId: 1,
            creditChange: -10,
            planCreditChange: -6,
            transactionType: 'CONSUME',
            sourceType: 'AI_USAGE',
            note: 'UI_ACTIVITY_V2|GENERATE_QUIZ|Lesson%201|Team%20wallet',
            balanceAfter: 80,
            createdAt: '2026-04-20T08:00:00Z',
          },
        ],
        page: 0,
        size: 5,
        totalElements: 1,
        totalPages: 1,
      },
    });
  });

  it('uses creditChange as the total transaction delta when planCreditChange is present', async () => {
    renderGroupWalletTab();

    await waitFor(() => expect(getGroupWorkspaceWalletTransactions).toHaveBeenCalledWith(12, 0, 5));

    expect(await screen.findByText('-10')).toBeInTheDocument();
    expect(screen.queryByText('-16')).not.toBeInTheDocument();
  });
});
