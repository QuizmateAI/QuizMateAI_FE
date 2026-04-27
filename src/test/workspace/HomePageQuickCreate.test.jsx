import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/pages/Users/Home/HomePage';
import {
  confirmIndividualWorkspaceProfile,
  saveIndividualWorkspaceBasicStep,
  saveIndividualWorkspacePersonalInfoStep,
  saveIndividualWorkspaceRoadmapConfigStep,
} from '@/api/WorkspaceAPI';

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  createWorkspace: vi.fn(),
  searchParams: new URLSearchParams('tab=workspace'),
  setSearchParams: vi.fn(),
}));

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
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
    i18n: {
      language: 'vi',
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
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    wallet: { totalAvailableCredits: 10 },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useCurrentSubscription', () => ({
  useCurrentSubscription: () => ({
    summary: null,
  }),
}));

vi.mock('@/lib/routeLoaders', () => ({
  preloadGroupWorkspaceCreateFlow: vi.fn(),
  preloadGroupWorkspacePage: vi.fn(),
  preloadIndividualWorkspaceCreateFlow: vi.fn(),
  preloadPlanPage: vi.fn(),
  preloadWalletPage: vi.fn(),
}));

vi.mock('@/api/WorkspaceAPI', () => ({
  confirmIndividualWorkspaceProfile: vi.fn().mockResolvedValue({ data: {} }),
  deleteIndividualWorkspace: vi.fn().mockResolvedValue(undefined),
  saveIndividualWorkspaceBasicStep: vi.fn().mockResolvedValue({ data: { data: { currentStep: 2 } } }),
  saveIndividualWorkspacePersonalInfoStep: vi.fn().mockResolvedValue({ data: { data: { currentStep: 3 } } }),
  saveIndividualWorkspaceRoadmapConfigStep: vi.fn().mockResolvedValue({ data: { data: { currentStep: 3 } } }),
  suggestIndividualRoadmapConfig: vi.fn().mockResolvedValue({ data: { data: {} } }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('@/components/ui/CreditIconImage', () => ({
  default: () => null,
}));

vi.mock('@/pages/Users/Home/Components/UserWorkspace', () => ({
  default: ({ onOpenCreate }) => (
    <button type="button" onClick={onOpenCreate}>
      open-create-workspace
    </button>
  ),
  WorkspaceFilterControls: () => null,
}));

vi.mock('@/pages/Users/Home/Components/UserGroup', () => ({
  default: () => null,
  GroupFilterControls: () => null,
}));

vi.mock('@/pages/Users/Home/Components/CommunityGroupBoard', () => ({
  default: () => null,
}));

vi.mock('@/pages/Users/Home/Components/EditWorkspaceDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/Users/Home/Components/DeleteWorkspaceDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/features/users/UserProfilePopover', () => ({
  default: () => null,
}));

vi.mock('@/pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog', () => ({
  default: ({ open, onSave, onConfirm }) => (open ? (
    <div data-testid="quick-profile-dialog">
      <button type="button" onClick={() => onSave(1, { workspacePurpose: 'REVIEW' })}>save-step-1</button>
      <button type="button" onClick={() => onSave(2, { currentLevel: 'Beginner' })}>save-step-2</button>
      <button type="button" onClick={() => onSave(3, { knowledgeLoad: 'BASIC' })}>save-step-3</button>
      <button type="button" onClick={onConfirm}>confirm-profile</button>
    </div>
  ) : null),
}));

describe('HomePage quick workspace create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.createWorkspace.mockResolvedValue({ workspaceId: 42 });
  });

  it('keeps the same profile dialog through step saves and navigates only after final confirm', async () => {
    renderHomePage();

    fireEvent.click(screen.getByRole('button', { name: 'open-create-workspace' }));
    expect(await screen.findByTestId('quick-profile-dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'save-step-1' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveIndividualWorkspaceBasicStep).toHaveBeenCalledWith(42, { workspacePurpose: 'REVIEW' });
    expect(hoisted.navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('quick-profile-dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'save-step-2' }));
      fireEvent.click(screen.getByRole('button', { name: 'save-step-3' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveIndividualWorkspacePersonalInfoStep).toHaveBeenCalledWith(42, { currentLevel: 'Beginner' });
    expect(saveIndividualWorkspaceRoadmapConfigStep).toHaveBeenCalledWith(42, { knowledgeLoad: 'BASIC' });
    expect(hoisted.navigate).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'confirm-profile' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(confirmIndividualWorkspaceProfile).toHaveBeenCalledWith(42);
      expect(hoisted.navigate).toHaveBeenCalledWith('/workspaces/42');
    });
  });
});
