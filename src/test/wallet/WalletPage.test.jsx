import React, { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import WalletPage from '@/pages/Users/Credit/WalletPage';
import {
  getMyWallet,
  getMyWalletTransactions,
  getPurchaseableCreditPackages,
} from '@/api/ManagementSystemAPI';

function interpolate(message, options = {}) {
  return String(message).replace(/\{\{(\w+)\}\}/g, (_, key) => String(options?.[key] ?? ''));
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback, options) => {
      if (typeof fallback === 'string') {
        return interpolate(fallback, options);
      }
      return key;
    },
    i18n: {
      resolvedLanguage: 'en',
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({
    isDarkMode: false,
    toggleDarkMode: vi.fn(),
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

vi.mock('@/utils/userCache', () => ({
  getCachedSubscription: () => ({
    entitlement: {
      canBuyCredit: true,
    },
  }),
}));

vi.mock('@/components/features/users/UserProfilePopover', () => ({
  default: () => <div data-testid="user-profile-popover" />,
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  getMyWallet: vi.fn(),
  getMyWalletTransactions: vi.fn(),
  getPurchaseableCreditPackages: vi.fn(),
}));

describe('WalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getMyWallet.mockResolvedValue({
      data: {
        totalAvailableCredits: 25,
        regularCreditBalance: 20,
        planCreditBalance: 5,
        hasActivePlan: true,
        planCreditExpiresAt: '2026-05-01T00:00:00Z',
      },
    });

    getMyWalletTransactions.mockResolvedValue({
      data: {
        content: [
          {
            creditTransactionId: 1,
            createdAt: '2026-04-17T08:00:00Z',
            creditChange: -3,
            transactionType: 'CONSUME',
            sourceType: 'AI_USAGE',
            note: 'UI_ACTIVITY_V2|GENERATE_QUIZ|Chapter 1 review|',
            balanceAfter: 22,
          },
        ],
      },
    });

    getPurchaseableCreditPackages.mockResolvedValue({
      data: [
        {
          creditPackageId: 7,
          displayName: 'Starter',
          baseCredit: 100,
          bonusCredit: 10,
          price: 10000,
        },
      ],
    });
  });

  it('resolves wallet, packages, and history when mounted inside StrictMode', async () => {
    render(
      <StrictMode>
        <MemoryRouter>
          <WalletPage />
        </MemoryRouter>
      </StrictMode>,
    );

    expect(await screen.findByText('Starter')).toBeInTheDocument();
    expect(await screen.findByText('Generated quiz: Chapter 1 review')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});
