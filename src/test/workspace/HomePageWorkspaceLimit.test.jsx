import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/pages/Users/Home/HomePage';

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  createWorkspace: vi.fn(),
  searchParams: new URLSearchParams('tab=workspace'),
  setSearchParams: vi.fn(),
}));

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>
  );
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ state: {} }),
    useSearchParams: () => [hoisted.searchParams, hoisted.setSearchParams],
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions?.defaultValue) return fallbackOrOptions.defaultValue;
      return key;
    },
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));

// Gói chỉ cho 1 workspace cá nhân và người dùng đã có đúng 1 → đã chạm hạn mức.
vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    workspaces: [{ workspaceId: 1, workspaceKind: 'INDIVIDUAL', title: 'WS1' }],
    loading: false,
    pagination: { page: 0, size: 10, totalPages: 1, totalElements: 1 },
    createWorkspace: hoisted.createWorkspace,
    createGroupWorkspace: vi.fn(),
    editWorkspace: vi.fn(),
    removeWorkspace: vi.fn(),
    changePage: vi.fn(),
    changePageSize: vi.fn(),
    sortMode: 'recent',
    changeSortMode: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePlanEntitlements', () => ({
  usePlanEntitlements: () => ({
    loading: false,
    maxWorkspaces: 1,
    canCreateRoadmap: true,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGroup', () => ({
  useGroup: () => ({
    groups: [],
    loading: false,
    publicGroups: [],
    publicGroupsLoading: false,
    joinPublicGroup: vi.fn(),
    fetchPublicGroups: vi.fn(),
  }),
}));

vi.mock('@/hooks/useNavigateWithLoading', () => ({
  useNavigateWithLoading: () => hoisted.navigate,
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({ wallet: { totalAvailableCredits: 10 }, isLoading: false }),
}));

vi.mock('@/hooks/useCurrentSubscription', () => ({
  useCurrentSubscription: () => ({ summary: null }),
}));

vi.mock('@/lib/routeLoaders', () => ({
  preloadGroupWorkspaceCreateFlow: vi.fn(),
  preloadGroupWorkspacePage: vi.fn(),
  preloadIndividualWorkspaceCreateFlow: vi.fn(),
  preloadPlanPage: vi.fn(),
  preloadWalletPage: vi.fn(),
}));

vi.mock('@/api/WorkspaceAPI', () => ({
  confirmIndividualWorkspaceProfile: vi.fn(),
  deleteIndividualWorkspace: vi.fn(),
  saveIndividualWorkspaceBasicStep: vi.fn(),
  saveIndividualWorkspacePersonalInfoStep: vi.fn(),
  saveIndividualWorkspaceRoadmapConfigStep: vi.fn(),
  suggestIndividualRoadmapConfig: vi.fn(),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('@/components/ui/CreditIconImage', () => ({ default: () => null }));

// Stub mở thẳng luồng tạo qua onOpenCreate để kiểm tra cổng chặn ở HomePage.
vi.mock('@/pages/Users/Home/Components/UserWorkspace', () => ({
  default: ({ onOpenCreate }) => (
    <button type="button" onClick={onOpenCreate}>open-create-workspace</button>
  ),
  WorkspaceFilterControls: () => null,
}));

vi.mock('@/components/plan/PlanUpgradeModal', () => ({
  default: ({ open }) => (open ? <div data-testid="plan-upgrade-modal" /> : null),
}));

vi.mock('@/pages/Users/Home/Components/UserGroup', () => ({
  default: () => null,
  GroupFilterControls: () => null,
}));

vi.mock('@/pages/Users/Home/Components/CommunityGroupBoard', () => ({ default: () => null }));
vi.mock('@/pages/Users/Home/Components/EditWorkspaceDialog', () => ({ default: () => null }));
vi.mock('@/pages/Users/Home/Components/DeleteWorkspaceDialog', () => ({ default: () => null }));
vi.mock('@/components/features/users/UserProfilePopover', () => ({ default: () => null }));

vi.mock('@/pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog', () => ({
  default: ({ open }) => (open ? <div data-testid="quick-profile-dialog" /> : null),
}));

describe('HomePage workspace creation limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks creating a 2nd workspace at the plan limit: no background create, shows upgrade modal', async () => {
    renderHomePage();

    fireEvent.click(screen.getByRole('button', { name: 'open-create-workspace' }));

    expect(await screen.findByTestId('plan-upgrade-modal')).toBeInTheDocument();
    expect(hoisted.createWorkspace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('quick-profile-dialog')).not.toBeInTheDocument();
  });
});
