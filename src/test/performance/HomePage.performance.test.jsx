import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '@/Pages/Users/Home/HomePage';
import { getMyWallet } from '@/api/ManagementSystemAPI';

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

const hoisted = vi.hoisted(() => {
  let search = '';

  return {
    navigate: vi.fn(),
    setSearch: (value) => {
      search = value;
    },
    getSearchParams: () => new URLSearchParams(search),
    setSearchParams: vi.fn(),
    location: { state: {} },
  };
});

const useGroupSpy = vi.fn(() => ({
  groups: [],
  loading: false,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => hoisted.location,
    useSearchParams: () => [hoisted.getSearchParams(), hoisted.setSearchParams],
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: {
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

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    workspaces: [],
    loading: false,
    pagination: { page: 0, size: 10, totalPages: 0, totalElements: 0 },
    createWorkspace: vi.fn(),
    createGroupWorkspace: vi.fn(),
    editWorkspace: vi.fn(),
    removeWorkspace: vi.fn(),
    changePage: vi.fn(),
    changePageSize: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGroup', () => ({
  useGroup: (options) => useGroupSpy(options),
}));

vi.mock('@/hooks/useNavigateWithLoading', () => ({
  useNavigateWithLoading: () => hoisted.navigate,
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCurrentSubscription', () => ({
  useCurrentSubscription: () => ({
    summary: null,
  }),
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  getMyWallet: vi.fn(),
}));

vi.mock('@/Components/ui/button', () => ({
  Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('@/Pages/Users/Home/Components/UserWorkspace', () => ({
  default: () => <div data-testid="workspace-content">workspace</div>,
  WorkspaceFilterControls: () => null,
}));

vi.mock('@/Pages/Users/Home/Components/UserGroup', () => ({
  default: () => <div data-testid="group-content">group</div>,
  GroupFilterControls: () => null,
}));

vi.mock('@/Pages/Users/Home/Components/EditWorkspaceDialog', () => ({
  default: () => null,
}));

vi.mock('@/Pages/Users/Home/Components/DeleteWorkspaceDialog', () => ({
  default: () => null,
}));

vi.mock('@/Components/features/Users/UserProfilePopover', () => ({
  default: () => null,
}));

vi.mock('@/Components/ui/CreditIconImage', () => ({
  default: () => null,
}));

describe('HomePage performance guards', () => {
  const originalRequestIdleCallback = window.requestIdleCallback;
  const originalCancelIdleCallback = window.cancelIdleCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    hoisted.setSearch('');
    getMyWallet.mockResolvedValue({ data: { totalAvailableCredits: 10 } });
  });

  afterEach(() => {
    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
    vi.useRealTimers();
  });

  it('keeps group query disabled on the default workspace tab', () => {
    renderHomePage();

    expect(useGroupSpy).toHaveBeenCalledWith({ enabled: false, publicEnabled: false });
  });

  it('defers wallet fetching until after the first paint fallback timer', async () => {
    renderHomePage();

    expect(getMyWallet).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(getMyWallet).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(getMyWallet).toHaveBeenCalledTimes(1);
  });

  it('falls back to the timer when requestIdleCallback never runs', async () => {
    window.requestIdleCallback = vi.fn(() => 123);
    window.cancelIdleCallback = vi.fn();

    renderHomePage();

    expect(getMyWallet).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(getMyWallet).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(getMyWallet).toHaveBeenCalledTimes(1);
  });

  it('enables group query when the group tab is the active entry point', () => {
    hoisted.setSearch('tab=group');

    renderHomePage();

    expect(useGroupSpy).toHaveBeenCalledWith({ enabled: true, publicEnabled: true });
  });
});
