import React, { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import WalletPage from '@/pages/Users/Credit/WalletPage';
import { WALLET_QUERY_KEY } from '@/hooks/useWallet';
import {
  getMyWallet,
  getMyWalletTransactions,
  getPurchaseableCreditPackages,
  getCurrentUserPlan,
} from '@/api/ManagementSystemAPI';

function interpolate(message, options = {}) {
  return String(message).replace(/\{\{(\w+)\}\}/g, (_, key) => String(options?.[key] ?? ''));
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWalletPage({ queryClient = createTestQueryClient(), strict = true } = {}) {
  const content = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  render(strict ? <StrictMode>{content}</StrictMode> : content);

  return queryClient;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
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

vi.mock('@/api/Authentication', () => ({
  getCurrentUser: () => ({ userID: 1 }),
}));

vi.mock('@/utils/userCache', () => ({
  getCachedSubscription: vi.fn(() => null),
  setCachedSubscription: vi.fn(),
}));

vi.mock('@/components/features/users/UserProfilePopover', () => ({
  default: () => <div data-testid="user-profile-popover" />,
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  getMyWallet: vi.fn(),
  getMyWalletTransactions: vi.fn(),
  getPurchaseableCreditPackages: vi.fn(),
  getCurrentUserPlan: vi.fn(),
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

    getCurrentUserPlan.mockResolvedValue({
      data: {
        plan: {
          entitlement: {
            canBuyCredit: true,
          },
        },
      },
    });
  });

  it('resolves wallet, packages, and history when mounted inside StrictMode', async () => {
    renderWalletPage();

    expect(await screen.findByText('Starter')).toBeInTheDocument();
    expect(await screen.findByText('Generated quiz: Chapter 1 review')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('shows cached wallet balance immediately while transaction history is pending', () => {
    const txDeferred = createDeferred();
    const queryClient = createTestQueryClient();

    getMyWalletTransactions.mockReturnValue(txDeferred.promise);
    getPurchaseableCreditPackages.mockReturnValue(createDeferred().promise);
    getCurrentUserPlan.mockReturnValue(createDeferred().promise);
    queryClient.setQueryData(WALLET_QUERY_KEY, {
      totalAvailableCredits: 123,
      regularCreditBalance: 120,
      planCreditBalance: 3,
      hasActivePlan: true,
    });

    renderWalletPage({ queryClient, strict: false });

    expect(screen.getByText('123')).toBeInTheDocument();
    expect(getMyWalletTransactions).toHaveBeenCalled();
    expect(screen.queryByText('Generated quiz: Chapter 1 review')).not.toBeInTheDocument();
  });
});
