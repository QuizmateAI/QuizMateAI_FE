import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacePage from '@/Pages/Users/Individual/Workspace/WorkspacePage';

const hoisted = vi.hoisted(() => {
  const mockNavigate = vi.fn();
  let mockLocation = {
    pathname: '/workspaces/42',
    search: '',
    state: {},
  };

  return {
    mockNavigate,
    setLocation: (next) => {
      mockLocation = next;
    },
    getLocation: () => mockLocation,
  };
});

const sidebarSpy = vi.fn();
const chatPanelSpy = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ workspaceId: '42' }),
    useNavigate: () => hoisted.mockNavigate,
    useLocation: () => hoisted.getLocation(),
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
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({
    isDarkMode: true,
    toggleDarkMode: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      workspaceId: 42,
      title: 'Workspace A',
      description: 'Desc',
      topic: { title: 'Math' },
    },
    fetchWorkspaceDetail: vi.fn().mockResolvedValue(undefined),
    editWorkspace: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/useProgressTracking', () => ({
  useProgressTracking: () => ({
    reconcileMaterialProgress: vi.fn(),
    updateTaskProgress: vi.fn(),
    updateMaterialProgress: vi.fn(),
    updateKnowledgeProgress: vi.fn(),
    updatePreLearningProgress: vi.fn(),
    updatePostLearningProgress: vi.fn(),
    clearProgress: vi.fn(),
    getTaskProgress: vi.fn().mockReturnValue(0),
  }),
}));

vi.mock('@/hooks/usePlanEntitlements', () => ({
  usePlanEntitlements: () => ({
    hasWorkspaceAnalytics: true,
    canCreateRoadmap: true,
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('@/api/WorkspaceAPI', () => ({
  getIndividualWorkspaceProfile: vi.fn().mockResolvedValue({
    data: {
      data: {
        workspaceSetupStatus: 'DONE',
        onboardingCompleted: true,
        workspacePurpose: 'STUDY_NEW',
        roadmapEnabled: true,
      },
    },
  }),
  getWorkspacePersonalization: vi.fn().mockResolvedValue({ data: null }),
  normalizeIndividualWorkspaceProfile: (payload) => payload,
  saveIndividualWorkspaceBasicStep: vi.fn(),
  saveIndividualWorkspacePersonalInfoStep: vi.fn(),
  saveIndividualWorkspaceRoadmapConfigStep: vi.fn(),
  startIndividualWorkspaceMockTestPersonalInfoStep: vi.fn(),
  confirmIndividualWorkspaceProfile: vi.fn(),
}));

vi.mock('@/api/RoadmapAPI', () => ({
  createRoadmapForWorkspace: vi.fn(),
  deleteRoadmapKnowledgeById: vi.fn(),
  deleteRoadmapPhaseById: vi.fn(),
  getRoadmapStructureById: vi.fn().mockResolvedValue(null),
  updateRoadmapConfig: vi.fn(),
}));

vi.mock('@/api/MaterialAPI', () => ({
  getMaterialsByWorkspace: vi.fn().mockResolvedValue([
    { materialId: 1, title: 'material.pdf', materialType: 'application/pdf', status: 'ACTIVE' },
  ]),
  deleteMaterial: vi.fn(),
  uploadMaterial: vi.fn(),
  renameMaterial: vi.fn(),
}));

vi.mock('@/api/QuizAPI', () => ({
  deleteQuiz: vi.fn(),
  getQuizzesByScope: vi.fn().mockResolvedValue({ data: [] }),
  shareQuizToCommunity: vi.fn(),
}));

vi.mock('@/api/FlashcardAPI', () => ({
  deleteFlashcardSet: vi.fn(),
  getFlashcardsByScope: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/Pages/Users/Individual/Workspace/hooks/useWorkspaceMockTestGeneration', () => ({
  useWorkspaceMockTestGeneration: () => ({
    mockTestGenerationState: 'idle',
    mockTestGenerationProgress: 0,
    mockTestGenerationDisplayMessage: '',
    mockTestGenerationDisplayLabel: '0%',
    isMockTestAwaitingBackend: false,
    isMockTestTakingLongerThanExpected: false,
    resetMockTestGenerationStatus: vi.fn(),
    readStoredMockTestGeneration: vi.fn().mockReturnValue(null),
    syncMockTestGenerationFromProfile: vi.fn().mockResolvedValue('idle'),
    beginMockTestGeneration: vi.fn(),
    checkMockTestGenerationStatusNow: vi.fn(),
  }),
}));

vi.mock('@/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager', () => ({
  useWorkspaceRoadmapManager: () => ({
    wsConnected: false,
    roadmapReloadToken: 0,
    bumpRoadmapReloadToken: vi.fn(),
    quizGenerationTaskByQuizId: {},
    quizGenerationProgressByQuizId: {},
    trackQuizGenerationStart: vi.fn(),
    isGeneratingRoadmapPhases: false,
    effectiveRoadmapPhaseGenerationProgress: 0,
    generatingKnowledgePhaseIds: [],
    generatingKnowledgeQuizPhaseIds: [],
    generatingKnowledgeQuizKnowledgeKeys: [],
    knowledgeQuizRefreshByKey: {},
    generatingPreLearningPhaseIds: [],
    skipPreLearningPhaseIds: [],
    handleCreatePhaseKnowledge: vi.fn(),
    handleCreateKnowledgeQuizForKnowledge: vi.fn(),
    handleCreatePhasePreLearning: vi.fn(),
    resetRoadmapRuntimeState: vi.fn(),
  }),
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/PersonalWorkspaceSidebar', () => ({
  default: (props) => {
    sidebarSpy(props);
    return (
      <div data-testid="personal-workspace-sidebar">
        mobile:{String(props.isMobile)}|open:{String(props.mobileOpen)}|active:{props.activeView}
        <button type="button" onClick={() => props.onNavigate?.('overview')}>go-overview</button>
        <button type="button" onClick={() => props.onNavigate?.('sources')}>go-sources</button>
        <button type="button" onClick={() => props.onOpenProfile?.()}>open-profile-sidebar</button>
      </div>
    );
  },
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/ChatPanel', () => ({
  default: (props) => {
    chatPanelSpy(props);
    return (
      <div data-testid="chat-panel-state">
        {props.activeView || 'none'}|{props.selectedQuiz?.quizId || 'none'}|{props.selectedRoadmapPhaseId || 'none'}|{props.accessHistory?.length || 0}
      </div>
    );
  },
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog', () => ({
  default: ({ open, onEditProfile }) => (open ? (
    <div data-testid="profile-overview-dialog">
      <button type="button" onClick={onEditProfile}>open-profile-update</button>
    </div>
  ) : null),
}));

vi.mock('@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog', () => ({
  default: ({ open }) => (open ? <div data-testid="profile-update-guard-dialog">guard-open</div> : null),
}));

vi.mock('@/Components/workspace/RoadmapConfigEditDialog', () => ({
  default: () => null,
}));

vi.mock('@/Components/plan/PlanUpgradeModal', () => ({
  default: () => null,
}));

vi.mock('@/Components/ui/ListSpinner', () => ({
  default: () => <div data-testid="list-spinner" />,
}));

describe('WorkspacePage', () => {
  beforeEach(() => {
    hoisted.mockNavigate.mockClear();
    sidebarSpy.mockClear();
    chatPanelSpy.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.innerWidth = 1440;
  });

  it('hydrates the bare workspace route into the default shell view and tracks sidebar navigation', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42',
      search: '',
      state: {},
    });

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-panel-state')).toHaveTextContent('sources|none|none|0');
    });

    expect(sidebarSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isDarkMode: true }),
    );
    expect(chatPanelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isDarkMode: false }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'go-sources' }));

    await waitFor(() => {
      expect(screen.getByTestId('chat-panel-state')).toHaveTextContent('sources|none|none|1');
    });

    expect(sidebarSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      activeView: 'sources',
    }));
  });

  it('hydrates edit quiz state from the preserved roadmap deep-link route', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42/roadmaps/77/phases/11/quizzes/5/edit',
      search: '',
      state: {},
    });

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-panel-state')).toHaveTextContent('editQuiz|5|11|0');
    });
  });

  it('does not render the old shared home button in the workspace shell', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42/quizzes',
      search: '',
      state: {},
    });

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-panel-state')).toHaveTextContent('quiz|none|none|0');
    });

    expect(screen.queryByTestId('workspace-home-button')).not.toBeInTheDocument();
  });

  it('switches the new sidebar into mobile drawer mode under 1024px and opens it from the menu button', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42',
      search: '',
      state: {},
    });
    window.innerWidth = 900;

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(screen.getByTestId('personal-workspace-sidebar')).toHaveTextContent('mobile:true|open:false|active:sources');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar' }));

    await waitFor(() => {
      expect(screen.getByTestId('personal-workspace-sidebar')).toHaveTextContent('mobile:true|open:true|active:sources');
    });

    act(() => {
      window.innerWidth = 1440;
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('personal-workspace-sidebar')).toHaveTextContent('mobile:false|open:false|active:sources');
    });
  });

  it('opens the onboarding update guard when profile edit is requested with existing materials', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42',
      search: '',
      state: {},
    });

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(chatPanelSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ workspacePurpose: 'STUDY_NEW' }),
      );
    });

    fireEvent.click(await screen.findByRole('button', { name: 'open-profile-sidebar' }));

    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'open-profile-update' }));

    await waitFor(() => {
      expect(screen.getByTestId('profile-update-guard-dialog')).toBeInTheDocument();
    });
  });
});
