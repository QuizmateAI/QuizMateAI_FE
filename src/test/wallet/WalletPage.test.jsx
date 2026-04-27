import React, { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import WalletPage from '@/pages/Users/Credit/WalletPage';
import { WALLET_QUERY_KEY } from '@/hooks/useWallet';
import {
  getMyWallet,
  getCurrentUserPlan,
  getPurchaseableCreditPackages,
  getUserPayments,
  getWorkspacePayments,
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
  getCurrentUserPlan: vi.fn(),
  getPurchaseableCreditPackages: vi.fn(),
  getUserPayments: vi.fn(),
  getWorkspacePayments: vi.fn(),
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

    getCurrentUserPlan.mockResolvedValue({
      data: {
        plan: {
          entitlement: {
            canBuyCredit: true,
          },
        },
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

    getUserPayments.mockResolvedValue({
      data: {
        content: [],
      },
    });
    getWorkspacePayments.mockResolvedValue({
      data: {
        content: [],
      },
    });
  });

  it('renders the plan management overview without the legacy wallet sections', async () => {
    renderWalletPage();

    expect(await screen.findByText('plan.manage.title')).toBeInTheDocument();
    expect(screen.queryByText('Your Credit Wallet')).not.toBeInTheDocument();
    expect(screen.queryByText('Transaction history')).not.toBeInTheDocument();
    expect(await screen.findByText('Starter')).toBeInTheDocument();

    await waitFor(() => {
      expect(getUserPayments).toHaveBeenCalled();
    });
  });

  it('opens a credit order confirmation before checkout', async () => {
    renderWalletPage();

    fireEvent.click(await screen.findByText('Starter'));

    expect(await screen.findByText('payment.orderConfirm.title')).toBeInTheDocument();
    expect(screen.getByText('payment.orderConfirm.continue')).toBeInTheDocument();
    expect(screen.queryByText(/discount|coupon|promo|mã giảm/i)).not.toBeInTheDocument();
  });

  it('shows cached wallet balance immediately while payment history is pending', async () => {
    const queryClient = createTestQueryClient();

    getCurrentUserPlan.mockReturnValue(createDeferred().promise);
    getPurchaseableCreditPackages.mockReturnValue(createDeferred().promise);
    getUserPayments.mockReturnValue(createDeferred().promise);
    queryClient.setQueryData(WALLET_QUERY_KEY, {
      totalAvailableCredits: 123,
      regularCreditBalance: 120,
      planCreditBalance: 3,
      hasActivePlan: true,
    });

    renderWalletPage({ queryClient, strict: false });

    expect(screen.getAllByText('123').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(getUserPayments).toHaveBeenCalled();
    });
    expect(screen.queryByText('Generated quiz: Chapter 1 review')).not.toBeInTheDocument();
  });
});
